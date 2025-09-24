import React, { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';

type CERItem = {
  id:string; name:string; cabina?:string;
  quota_shared?:number; split_prod?:number; split_prosumer?:number; split_cer_to_user?:number;
  trader?:string; created_at?:string;
};
type Customer = { id:string; name:string; type:'privato'|'piva' };

const CER_FIXED = 15;
const PROS_MAX  = 50;
const PROD_MAX  = 55;

type MemberSel = { customer_id:string; role:'producer'|'consumer'; weight:number };

export default function CER() {
  const [items, setItems] = useState<CERItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [members, setMembers] = useState<MemberSel[]>([]);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string>('');
  const [ok,   setOk]   = useState<string>('');

  const [f, setF] = useState({ name:'', cabina:'', quota_shared:'', split_prod:'', split_cer_to_user:String(CER_FIXED), trader:'' });
  const n = (v:string) => v === '' ? null : Number(v);

  const calc = useMemo(() => {
    const prod = n(f.split_prod) ?? 0;
    const cer  = CER_FIXED;
    const rawPros = Math.max(0, 100 - cer - prod);
    const pros = Math.min(PROS_MAX, rawPros);
    const eccedenza = Math.max(0, rawPros - PROS_MAX);
    const sumRiparti = prod + cer + pros;
    const quota = n(f.quota_shared) ?? 0;
    const inRange = [prod, pros, cer, quota].every(x => x >= 0 && x <= 100);
    const validSplits = inRange && prod <= PROD_MAX && eccedenza === 0 && sumRiparti <= 100;

    // normalizzazione gruppi
    const sumW = members.reduce((acc, m) => { acc[m.role] += m.weight || 0; return acc; }, { producer:0, consumer:0 } as any);
    const groupShares = members.map(m => ({
      id: m.customer_id,
      role: m.role,
      weight: m.weight,
      groupShare: (sumW[m.role] > 0 ? (m.weight / sumW[m.role]) * 100 : 0),
      absShare: 0,
    }));
    for (const gs of groupShares) {
      const roleSplit = gs.role === 'producer' ? prod : pros;
      (gs as any).absShare = gs.groupShare * roleSplit / 100;
    }

    const messages:string[] = [];
    if (!validSplits) {
      if (prod > PROD_MAX) messages.push(`Produttore > ${PROD_MAX}%`);
      if (eccedenza > 0) messages.push(`Resto ai Consumers supera ${PROS_MAX}%: riduci Produttore`);
      if (sumRiparti > 100) messages.push('Somma riparti oltre 100%');
    } else {
      if (prod > 0 && sumW.producer === 0) messages.push('Pesi produttori tutti a 0');
      if (pros > 0 && sumW.consumer === 0) messages.push('Pesi consumer tutti a 0');
    }

    const valid = validSplits && !(prod > 0 && sumW.producer === 0) && !(pros > 0 && sumW.consumer === 0);

    return { prod, pros, cer, sumW, groupShares, valid, messages };
  }, [f, members]);

  const loadCER = async () => { const data = await apiGet('cer-list'); setItems(data.items || []); };
  const loadCustomers = async () => {
    const data = await apiGet('customers-list');
    setCustomers((data.items || []).map((x:any)=>({ id:x.id, name:x.name, type:x.type })));
  };

  useEffect(() => {
    (async () => {
      setBusy(true); setErr('');
      try { await Promise.all([loadCER(), loadCustomers()]); }
      catch (e:any) { setErr(e?.message || 'Errore nel caricamento'); }
      finally { setBusy(false); }
    })();
  }, []);

  const upsertMember = (id:string, role:'producer'|'consumer', weight:number) => {
    setMembers(prev => {
      const i = prev.findIndex(m => m.customer_id === id);
      if (i === -1) return [...prev, { customer_id:id, role, weight }];
      const copy = [...prev]; copy[i] = { customer_id:id, role, weight }; return copy;
    });
  };
  const removeMember = (id:string) => setMembers(prev => prev.filter(m => m.customer_id !== id));

  const submit = async (e:React.FormEvent) => {
    e.preventDefault();
    if (!calc.valid) { setErr(calc.messages[0] || 'Verifica i vincoli e i pesi'); return; }
    if (!f.name.trim()) { setErr('Inserisci un nome CER'); return; }
    setBusy(true); setErr(''); setOk('');
    try {
      await apiPost('cer-create', {
        name: f.name,
        cabina: f.cabina || null,
        quota_shared: n(f.quota_shared),
        split_prod: calc.prod,
        split_prosumer: calc.pros,
        split_cer_to_user: calc.cer,
        trader: f.trader || null,
        members
      });
      setOk(`CER creata (${members.length} membri)`);
      setF({ name:'', cabina:'', quota_shared:'', split_prod:'', split_cer_to_user:String(CER_FIXED), trader:'' });
      setMembers([]);
      await loadCER();
    } catch (e:any) {
      setErr(e?.message || 'Errore nel salvataggio CER');
    } finally { setBusy(false); }
  };

  return (
    <div className="grid" style={{gap:18}}>
      <section className="card">
        <h2 style={{marginTop:0}}>Crea CER</h2>
        <div style={{display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginBottom:10}}>
          <span className="badge cyan">Resto → Consumers (auto)</span>
          <span className="badge green">Prod ≤ {PROD_MAX}%</span>
          <span className="badge yellow">CER→USER = {CER_FIXED}%</span>
          <span className="badge red">Consumers ≤ {PROS_MAX}%</span>
        </div>
        {err && <div className="alert error">{err}</div>}
        {ok  && <div className="alert ok">{ok}</div>}

        <form onSubmit={submit} className="grid cols-3">
          <label>Nome CER
            <input required value={f.name} onChange={e=>setF({...f, name:e.target.value})}/>
          </label>
          <label>Cabina primaria
            <input value={f.cabina} onChange={e=>setF({...f, cabina:e.target.value})}/>
          </label>
          <label>Trader eccedenze
            <input value={f.trader} onChange={e=>setF({...f, trader:e.target.value})}/>
          </label>

          <label>Quota condivisa (%)
            <input type="number" step="0.01" value={f.quota_shared} onChange={e=>setF({...f, quota_shared:e.target.value})}/>
          </label>
          <label>Produttore (%)
            <input type="number" step="0.01" value={f.split_prod} onChange={e=>setF({...f, split_prod:e.target.value})}/>
          </label>
          <label>Consumers / Prosumer (%)
            <input value={calc.pros.toFixed(2)} readOnly />
          </label>

          <label style={{gridColumn:'1 / 2'}}>CER TO USER (%)
            <input value={CER_FIXED} readOnly />
          </label>

          <div style={{gridColumn:'2 / -1', alignSelf:'end', display:'flex', gap:10, alignItems:'center'}}>
            {calc.messages[0] && <span className="badge red">{calc.messages[0]}</span>}
            <button disabled={busy || !calc.valid}>{busy ? 'Creo…' : 'Crea CER'}</button>
            <button type="button" className="ghost" onClick={()=>{
              setF({ name:'', cabina:'', quota_shared:'', split_prod:'', split_cer_to_user:String(CER_FIXED), trader:'' });
              setMembers([]);
            }}>Reset</button>
          </div>
        </form>
      </section>

      {/* Membri + pesi */}
      <section className="card">
        <h3 style={{marginTop:0}}>Membri (da CRM) con ruolo e peso</h3>
        <div className="grid cols-3">
          {customers.map(c => {
            const sel = members.find(m => m.customer_id === c.id);
            return (
              <div key={c.id} style={{border:'1px solid var(--muted)', borderRadius:12, padding:10}}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', gap:8}}>
                  <strong>{c.name}</strong>
                  <span className={`badge ${c.type === 'privato' ? 'green' : 'yellow'}`}>{c.type}</span>
                </div>
                <div style={{display:'flex', gap:8, marginTop:10}}>
                  <button
                    type="button"
                    className={sel?.role === 'producer' ? '' : 'ghost'}
                    onClick={()=>upsertMember(c.id, 'producer', sel?.weight ?? 0)}
                  >Produttore</button>
                  <button
                    type="button"
                    className={sel?.role === 'consumer' ? 'secondary' : 'ghost'}
                    onClick={()=>upsertMember(c.id, 'consumer', sel?.weight ?? 0)}
                  >Consumer</button>
                  {sel && <button type="button" className="danger" onClick={()=>removeMember(c.id)}>Rimuovi</button>}
                </div>
                {sel && (
                  <div style={{marginTop:10}}>
                    <label>Peso (&ge; 0)
                      <input
                        type="number" step="0.001" value={sel.weight}
                        onChange={e=>upsertMember(c.id, sel.role, Number(e.target.value))}
                      />
                    </label>
                    <div style={{marginTop:6, color:'var(--sub)'}}>
                      {(() => {
                        // anteprima normalizzata & quota assoluta
                        // (si basano su calc.groupShares)
                        const gs = (calc.groupShares.find(g => g.id === c.id) as any);
                        const roleSplit = sel.role === 'producer' ? calc.prod : calc.pros;
                        return (
                          <div>
                            <div>Quota gruppo {sel.role === 'producer' ? 'Produttori' : 'Consumers'}:
                              {' '}<b>{(gs?.groupShare ?? 0).toFixed(2)}%</b>
                            </div>
                            <div>Quota assoluta (su CER):
                              {' '}<b>{(gs?.absShare ?? 0).toFixed(2)}%</b> (× {roleSplit.toFixed(2)}%)
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {!customers.length && <p style={{color:'var(--sub)'}}>Nessun cliente in CRM.</p>}
        </div>
      </section>

      {/* Elenco CER */}
      <section className="card">
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <h2 style={{margin:0}}>CER esistenti</h2>
          <span className="badge cyan">{items.length} record</span>
        </div>
        <div style={{overflowX:'auto', marginTop:12}}>
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th><th>Cabina</th><th>Quota</th><th>Prod</th><th>Consumers</th><th>CER→USER</th><th>Trader</th><th>Creato</th>
              </tr>
            </thead>
            <tbody>
              {items.map(c=>(
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.cabina || '—'}</td>
                  <td>{c.quota_shared ?? '—'}%</td>
                  <td>{c.split_prod ?? '—'}%</td>
                  <td>{c.split_prosumer ?? '—'}%</td>
                  <td>{c.split_cer_to_user ?? '—'}%</td>
                  <td>{c.trader || '—'}</td>
                  <td>{c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {!items.length && <tr><td colSpan={8} style={{color:'var(--sub)'}}>Nessuna CER presente.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
