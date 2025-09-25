import React, { useEffect, useMemo, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';

type Customer = {
  id: string; type: 'privato'|'piva'; name: string; email?:string;
  piva?:string; cf?:string; created_at?:string;
  phone?:string; mobile?:string; whatsapp?:string;
  status?: 'lead'|'prospect'|'client'|'suspended'|null;
  score?: number|null; next_action?: string|null; owner?: string|null;
};
type FileRow = { id:string; name:string; mime?:string; size?:number; url?:string; created_at?:string };

export default function CRM(){
  const [list,setList]=useState<Customer[]>([]);
  const [q,setQ]=useState('');
  const [busy,setBusy]=useState(false);
  const [err,setErr]=useState<string>('');
  const [f,setF]=useState<{id?:string;type:'privato'|'piva';name:string;email:string;piva:string;cf:string;phone:string;mobile:string;whatsapp:string;status:any;score:any;next_action:string;owner:string}>({
    type:'privato', name:'', email:'', piva:'', cf:'', phone:'', mobile:'', whatsapp:'', status:'lead', score:'', next_action:'', owner:''
  });
  const [files,setFiles]=useState<FileRow[]>([]);

  const load = async (query='')=>{
    setBusy(true); setErr('');
    try{
      const r=await apiGet('customers-list', query?{q:query}:{});
      setList(r.items||[]);
    }catch(e:any){setErr(e.message)}
    finally{setBusy(false)}
  };

  const loadFiles = async (id:string)=>{
    const u = new URL('/.netlify/functions/customer-files-list', window.location.origin);
    u.searchParams.set('customer_id', id);
    const res = await fetch(u.toString());
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || res.statusText);
    setFiles(data.items||[]);
  };

  useEffect(()=>{ load(); },[]);

  const reset = ()=>{
    setF({type:'privato',name:'',email:'',piva:'',cf:'', phone:'',mobile:'',whatsapp:'', status:'lead', score:'', next_action:'', owner:''});
    setFiles([]);
  };

  const edit = async (c:Customer)=>{
    setF({
      id:c.id, type:c.type, name:c.name, email:c.email||'',
      piva:c.piva||'', cf:c.cf||'',
      phone:c.phone||'', mobile:c.mobile||'', whatsapp:c.whatsapp||'',
      status:c.status||'lead', score: (c.score??''),
      next_action:c.next_action||'', owner:c.owner||''
    });
    await loadFiles(c.id);
  };

  const save = async ()=>{
    setBusy(true); setErr('');
    try{
      const body:any = {...f};
      if(f.id){
        await apiPost('customers-update', body);
      }else{
        const r = await apiPost('customers-create', body);
        body.id = r.id;
      }
      await apiPost('customers-set-status', {
        id: body.id, status: body.status, score: Number(body.score),
        next_action: body.next_action, owner: body.owner, phone: body.phone, mobile: body.mobile, whatsapp: body.whatsapp
      }).catch(()=>{});
      reset(); await load(q);
    }catch(e:any){ setErr(e.message) }
    finally{ setBusy(false) }
  };

  const del = async (id:string)=>{
    if(!confirm('Eliminare il cliente?')) return;
    setBusy(true); setErr('');
    try{ await apiPost('customers-delete',{id}); reset(); await load(q); }
    catch(e:any){ setErr(e.message) } finally{ setBusy(false); }
  };

  const onUpload = async (file: File)=>{
    if(!f.id){ alert('Salva il cliente prima di allegare file.'); return; }
    const u = new URL('/.netlify/functions/customer-files-put', window.location.origin);
    u.searchParams.set('customer_id', f.id);
    u.searchParams.set('name', file.name);
    const res = await fetch(u.toString(), {
      method: 'POST',
      headers: { 'Content-Type': file.type || 'application/octet-stream' },
      body: await file.arrayBuffer()
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || res.statusText);
    await loadFiles(f.id);
  };

  const removeFile = async (id: string)=>{
    const res = await fetch('/.netlify/functions/customer-files-delete?id='+encodeURIComponent(id), { method:'POST' });
    const data = await res.json();
    if (!res.ok) throw new Error(data?.error || res.statusText);
    if(f.id) await loadFiles(f.id);
  };

  const statusColor = useMemo(()=>{
    switch(f.status){
      case 'client': return 'var(--ok)';
      case 'prospect': return 'var(--warn)';
      case 'suspended': return 'var(--danger)';
      default: return 'var(--muted)';
    }
  },[f.status]);

  return (
    <div className="grid" style={{gap:18}}>
      <section className="card">
        <h2>Nuovo / Modifica cliente</h2>
        {err && <div className="alert error">{err}</div>}
        <div className="grid cols-3">
          <label>Tipo
            <select value={f.type} onChange={e=>setF({...f, type:e.target.value as any})}>
              <option value="privato">Privato</option>
              <option value="piva">Azienda / P.IVA</option>
            </select>
          </label>
          <label>Nome / Ragione sociale
            <input value={f.name} onChange={e=>setF({...f, name:e.target.value})}/>
          </label>
          <label>Email
            <input value={f.email} onChange={e=>setF({...f, email:e.target.value})}/>
          </label>

          {f.type==='piva' ? (
            <label>P.IVA
              <input value={f.piva} onChange={e=>setF({...f, piva:e.target.value})}/>
            </label>
          ) : (
            <label>Codice Fiscale (16)
              <input value={f.cf} onChange={e=>setF({...f, cf:e.target.value})}/>
            </label>
          )}

          <label>Telefono
            <input value={f.phone} onChange={e=>setF({...f, phone:e.target.value})}/>
          </label>
          <label>Mobile
            <input value={f.mobile} onChange={e=>setF({...f, mobile:e.target.value})}/>
          </label>
          <label>WhatsApp
            <input value={f.whatsapp} onChange={e=>setF({...f, whatsapp:e.target.value})}/>
          </label>

          <label>Stato (semaforo)
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              <span style={{width:12,height:12,borderRadius:6,background:statusColor,display:'inline-block'}}/>
              <select value={f.status} onChange={e=>setF({...f, status:e.target.value})}>
                <option value="lead">Lead</option>
                <option value="prospect">Prospect</option>
                <option value="client">Client</option>
                <option value="suspended">Sospeso</option>
              </select>
            </div>
          </label>
          <label>Score (0-100)
            <input type="number" value={f.score} onChange={e=>setF({...f, score:e.target.value})}/>
          </label>
          <label>Owner
            <input value={f.owner} onChange={e=>setF({...f, owner:e.target.value})}/>
          </label>
          <label style={{gridColumn:'1/-1'}}>Prossima azione
            <input value={f.next_action} onChange={e=>setF({...f, next_action:e.target.value})}/>
          </label>

          <div style={{gridColumn:'1/-1', display:'flex', gap:10, flexWrap:'wrap'}}>
            <button onClick={save} disabled={busy}>{f.id?'Salva':'Aggiungi'}</button>
            <button className="ghost" onClick={reset}>Reset</button>
            {f.id && <button className="danger" onClick={()=>del(f.id!)}>Elimina</button>}
            {/* Pulsanti contatto */}
            {f.email && <a className="ghost" href={`mailto:${f.email}`}>Email</a>}
            {f.phone && <a className="ghost" href={`tel:${f.phone}`}>Chiama</a>}
            {f.whatsapp && <a className="ghost" target="_blank" rel="noreferrer"
              href={`https://wa.me/${f.whatsapp.replace(/\D/g,'')}`}>WhatsApp</a>}
          </div>
        </div>

        {/* ALLEGATI */}
        <div style={{marginTop:16}}>
          <h3>Allegati</h3>
          <input type="file" onChange={e=>e.target.files && onUpload(e.target.files[0])}/>
          <div style={{marginTop:10, overflowX:'auto'}}>
            <table className="table">
              <thead><tr><th>Nome</th><th>Tipo</th><th>Size</th><th>Caricato</th><th/></tr></thead>
              <tbody>
                {files.map(fl=>(
                  <tr key={fl.id}>
                    <td>{fl.url ? <a href={fl.url} target="_blank" rel="noreferrer">{fl.name}</a> : fl.name}</td>
                    <td>{fl.mime||'–'}</td>
                    <td>{fl.size ? `${(fl.size/1024).toFixed(1)} KB` : '–'}</td>
                    <td>{fl.created_at? new Date(fl.created_at).toLocaleString() : '–'}</td>
                    <td><button className="danger" onClick={()=>removeFile(fl.id)}>Elimina</button></td>
                  </tr>
                ))}
                {!files.length && <tr><td colSpan={5} style={{color:'var(--sub)'}}>Nessun file.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="card">
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <h2>Clienti</h2>
          <div>
            <input placeholder="Cerca..." value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>e.key==='Enter'&&load(q)} />
            <button className="ghost" onClick={()=>load(q)}>Cerca</button>
          </div>
        </div>
        <div style={{overflowX:'auto', marginTop:10}}>
          <table className="table">
            <thead><tr><th>Nome</th><th>Tipo</th><th>Email</th><th>CF/P.IVA</th><th>Stato</th><th>Score</th><th>Creato</th><th/></tr></thead>
            <tbody>
              {list.map(c=>(
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td>{c.type}</td>
                  <td>{c.email||'—'}</td>
                  <td>{c.type==='piva'?(c.piva||'—'):(c.cf||'—')}</td>
                  <td>{c.status||'—'}</td>
                  <td>{c.score ?? '—'}</td>
                  <td>{c.created_at?new Date(c.created_at).toLocaleString():'—'}</td>
                  <td style={{whiteSpace:'nowrap'}}>
                    <button className="ghost" onClick={()=>edit(c)}>Apri</button>
                  </td>
                </tr>
              ))}
              {!list.length && <tr><td colSpan={8} style={{color:'var(--sub)'}}>Nessun cliente presente.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
