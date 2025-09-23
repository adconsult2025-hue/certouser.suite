import React, { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';

type CERItem = {
  id:string; name:string; cabina?:string;
  quota_shared?:number; split_prod?:number; split_prosumer?:number; split_cer_to_user?:number;
  trader?:string; created_at?:string;
};

const CER_FIXED = 15;   // fisso
const PROS_MAX  = 50;   // max consumers
const PROD_MAX  = 55;   // max produttore

export default function CER() {
  const [items, setItems] = useState<CERItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string>('');
  const [ok,   setOk]   = useState<string>('');

  const [f, setF] = useState<any>({
    name:'', cabina:'', quota_shared:'',
    split_prod:'', split_cer_to_user: String(CER_FIXED), trader:''
  });

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
    const valid = inRange && prod <= PROD_MAX && eccedenza === 0 && sumRiparti <= 100;

    const messages:string[] = [];
    if (prod > PROD_MAX) messages.push(`Produttore > ${PROD_MAX}%`);
    if (eccedenza > 0) messages.push(`Resto ai Consumers supera ${PROS_MAX}%: riduci Produttore`);
    if (sumRiparti > 100) messages.push('Somma riparti oltre 100%');

    return { prod, pros, cer, eccedenza, sumRiparti, valid, messages };
  }, [f]);

  const load = async () => {
    setBusy(true); setErr(''); setOk('');
    try {
      const data = await apiGet('cer-list');
      setItems(data.items || []);
    } catch {
      setErr('Errore nel caricamento CER');
    } finally { setBusy(false); }
  };
  useEffect(()=>{ load(); }, []);

  const submit = async (e:React.FormEvent) => {
    e.preventDefault();
    if (!calc.valid) { setErr(calc.messages[0] || 'Verifica i vincoli'); return; }
    setBusy(true); setErr(''); setOk('');
    try {
      await apiPost('cer-create', {
        name: f.name,
        cabina: f.cabina || null,
        quota_shared: n(f.quota_shared),
        split_prod: calc.prod,
        split_prosumer: calc.pros,           // calcolato
        split_cer_to_user: calc.cer,         // fisso 15
        trader: f.trader || null
      });
      setOk('CER creata');
      setF({ name:'', cabina:'', quota_shared:'', split_prod:'', split_cer_to_user:String(CER_FIXED), trader:'' });
      await load();
    } catch {
      setErr('Errore nel salvataggio');
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
            <button type="button" className="ghost" onClick={()=>setF({ name:'', cabina:'', quota_shared:'', split_prod:'', split_cer_to_user:String(CER_FIXED), trader:'' })}>Reset</button>
          </div>
        </form>
      </section>

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
                  <td><span className="badge green">{c.split_prosumer ?? '—'}%</span></td>
                  <td><span className="badge yellow">{c.split_cer_to_user ?? '—'}%</span></td>
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
