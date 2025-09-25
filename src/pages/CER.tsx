import React, { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';

type CERRow = {
  id: string; name: string; cabina?:string|null; quota_shared?:number|null;
  split_prod:number; split_prosumer:number; split_cer_to_user:number; trader?:string|null;
};
type Member = { id?:string; customer_id:string; name?:string; type?:'privato'|'piva'; role:'producer'|'consumer'; weight:number; };

export default function CER(){
  const [list,setList]=useState<CERRow[]>([]);
  const [err,setErr]=useState(''); const [busy,setBusy]=useState(false);
  const [f,setF]=useState< CERRow & { members: Member[] } >({
    id:'', name:'', cabina:'', quota_shared:null,
    split_prod:55, split_prosumer:50, split_cer_to_user:15, trader:'',
    members:[]
  });

  const load = async ()=>{
    try{ const r=await apiGet('cer-list'); setList(r.items||[]); }catch(e:any){ setErr(e.message); }
  };
  useEffect(()=>{ load(); },[]);

  const edit = async (id:string)=>{
    setBusy(true); setErr('');
    try{
      const r=await apiGet('cer-get',{id});
      const c = r.cer as CERRow;
      setF({ ...c, members: r.members as Member[] });
    }catch(e:any){ setErr(e.message); }
    finally{ setBusy(false); }
  };

  const reset = ()=> setF({ id:'', name:'', cabina:'', quota_shared:null, split_prod:55, split_prosumer:50, split_cer_to_user:15, trader:'', members:[] });

  const addMember = (role:'producer'|'consumer')=>{
    setF(s=>({...s, members:[...s.members, { customer_id:'', role, weight:0 }]}));
  };
  const setMember = (i:number, patch: Partial<Member>)=>{
    setF(s=>({ ...s, members: s.members.map((m,idx)=> idx===i ? {...m, ...patch} : m) }));
  };
  const removeMember = (i:number)=>{
    setF(s=>({ ...s, members: s.members.filter((_,idx)=>idx!==i) }));
  };

  const save = async ()=>{
    setBusy(true); setErr('');
    try{
      const payload = { ...f };
      // crea/aggiorna CER
      const r = await apiPost('cer-create', payload);
      const cer_id = r.id || f.id;
      // upsert membri (solo quelli con customer_id)
      for (const m of f.members){
        if (!m.customer_id) continue;
        await apiPost('cer-upsert-member', { cer_id, customer_id:m.customer_id, role:m.role, weight:m.weight });
      }
      await load(); reset();
    }catch(e:any){ setErr(e.message); }
    finally{ setBusy(false); }
  };

  // calcoli quote: le percentuali produttore/prosumer sono distinte
  const producerTotal = useMemo(()=>f.members.filter(m=>m.role==='producer').reduce((a,b)=>a+(+b.weight||0),0),[f.members]);
  const consumerTotal = useMemo(()=>f.members.filter(m=>m.role==='consumer').reduce((a,b)=>a+(+b.weight||0),0),[f.members]);

  return (
    <div className="grid" style={{gap:18}}>
      <section className="card">
        <h2>CER — Nuova/Modifica</h2>
        {err && <div className="alert error">{err}</div>}

        <div className="grid cols-3">
          <label>Nome CER
            <input value={f.name} onChange={e=>setF({...f, name:e.target.value})}/>
          </label>
          <label>Cabina
            <input value={f.cabina||''} onChange={e=>setF({...f, cabina:e.target.value})}/>
          </label>
          <label>Quota shared (% opz.)
            <input type="number" value={f.quota_shared??''} onChange={e=>setF({...f, quota_shared: e.target.value===''? null : Number(e.target.value)})}/>
          </label>

          <label>Quota CER→User (fisso %)
            <input type="number" value={f.split_cer_to_user} onChange={e=>setF({...f, split_cer_to_user:Number(e.target.value)})}/>
          </label>
          <label>Quota Produttori (% max 55)
            <input type="number" value={f.split_prod} onChange={e=>setF({...f, split_prod:Number(e.target.value)})}/>
          </label>
          <label>Quota Prosumer (% max 50)
            <input type="number" value={f.split_prosumer} onChange={e=>setF({...f, split_prosumer:Number(e.target.value)})}/>
          </label>

          <label style={{gridColumn:'1/-1'}}>Trader
            <input value={f.trader||''} onChange={e=>setF({...f, trader:e.target.value})}/>
          </label>
        </div>

        <div className="mt-3">
          <h3>Membri</h3>
          <div className="mb-2" style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            <button className="ghost" onClick={()=>addMember('producer')}>+ Aggiungi Produttore</button>
            <button className="ghost" onClick={()=>addMember('consumer')}>+ Aggiungi Prosumer</button>
          </div>

          <div style={{overflowX:'auto'}}>
            <table className="table">
              <thead>
                <tr><th>Ruolo</th><th>Customer ID</th><th>Nome (info)</th><th>Peso</th><th>Quota gruppo</th><th>Quota assoluta</th><th/></tr>
              </thead>
              <tbody>
                {f.members.map((m,i)=>{
                  const total = m.role==='producer' ? producerTotal : consumerTotal;
                  const groupShare = total>0 ? ((m.weight||0)/total)*100 : 0;
                  const roleSplit = m.role==='producer' ? f.split_prod : f.split_prosumer;
                  const absShare = (groupShare/100) * roleSplit;
                  return (
                    <tr key={i}>
                      <td>{m.role==='producer'?'Produttore':'Prosumer'}</td>
                      <td><input placeholder="customer_id" value={m.customer_id} onChange={e=>setMember(i,{customer_id:e.target.value})}/></td>
                      <td>{m.name||'—'}</td>
                      <td><input type="number" step="0.001" value={m.weight} onChange={e=>setMember(i,{weight:Number(e.target.value)})}/></td>
                      <td>{groupShare.toFixed(2)}%</td>
                      <td>{absShare.toFixed(2)}%</td>
                      <td><button className="danger" onClick={()=>removeMember(i)}>Rimuovi</button></td>
                    </tr>
                  );
                })}
                {!f.members.length && <tr><td colSpan={7} style={{color:'var(--sub)'}}>Nessun membro ancora.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-3" style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          <button onClick={save} disabled={busy}>{f.id?'Salva':'Crea'}</button>
          <button className="ghost" onClick={reset}>Reset</button>
        </div>

        <div className="mt-2" style={{display:'flex',gap:12,color:'var(--sub)'}}>
          <small>Tot Produttori: {producerTotal}</small>
          <small>Tot Prosumer: {consumerTotal}</small>
        </div>
      </section>

      <section className="card">
        <h2>CER esistenti</h2>
        <div style={{overflowX:'auto', marginTop:10}}>
          <table className="table">
            <thead><tr><th>Nome</th><th>Prod %</th><th>Prosumer %</th><th>CER→User %</th><th>Cabina</th><th>Creato</th><th/></tr></thead>
            <tbody>
              {list.map(c=>(
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.split_prod}</td>
                  <td>{c.split_prosumer}</td>
                  <td>{c.split_cer_to_user}</td>
                  <td>{c.cabina || '—'}</td>
                  <td>{/* opzionale: mostra data se la recuperi in cer-list */}</td>
                  <td style={{whiteSpace:'nowrap'}}>
                    <button className="ghost" onClick={()=>edit(c.id)}>Apri</button>
                  </td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={7} style={{color:'var(--sub)'}}>Nessuna CER presente.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
