import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';

type Customer = {
  id:string; type:'privato'|'piva'; name:string; email?:string;
  piva?:string; cf?:string; created_at?:string
};

export default function CRM() {
  const [items, setItems] = useState<Customer[]>([]);
  const [busy, setBusy] = useState(false);
  const [err,  setErr]  = useState<string>('');
  const [ok,   setOk]   = useState<string>('');

  const [form, setForm] = useState<{type:'privato'|'piva'; name:string; email:string; piva:string; cf:string}>({
    type:'privato', name:'', email:'', piva:'', cf:''
  });

  const load = async () => {
    setBusy(true); setErr(''); setOk('');
    try {
      const data = await apiGet('customers-list');
      setItems(data.items || []);
    } catch {
      setErr('Errore nel caricamento clienti');
    } finally { setBusy(false); }
  };
  useEffect(()=>{ load(); }, []);

  const validate = () => {
    if (!form.name.trim()) return 'Inserisci nome/ragione sociale';
    if (form.type === 'piva') {
      if (!/^[0-9A-Z]{11}$/i.test(form.piva.trim())) return 'P.IVA non valida (11 caratteri)';
    } else {
      if (!/^[A-Z0-9]{16}$/i.test(form.cf.trim())) return 'Codice Fiscale non valido (16 caratteri)';
    }
    if (form.email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) return 'Email non valida';
    return '';
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = validate();
    if (v) { setErr(v); return; }
    setBusy(true); setErr(''); setOk('');
    try {
      const payload:any = { type: form.type, name: form.name, email: form.email || null };
      if (form.type === 'piva') payload.piva = form.piva;
      else payload.cf = form.cf;

      await apiPost('customers-create', payload);
      setOk('Cliente creato');
      setForm({ type:'privato', name:'', email:'', piva:'', cf:'' });
      await load();
    } catch {
      setErr('Errore nel salvataggio');
    } finally { setBusy(false); }
  };

  const isAzienda = form.type === 'piva';

  return (
    <div className="grid" style={{gap:18}}>
      <section className="card">
        <h2 style={{marginTop:0}}>Nuovo cliente</h2>
        {err && <div className="alert error">{err}</div>}
        {ok  && <div className="alert ok">{ok}</div>}

        <form onSubmit={submit} className="grid cols-2">
          <label>Tipo
            <select value={form.type} onChange={e=>setForm(s=>({ ...s, type:e.target.value as 'privato'|'piva', piva:'', cf:'' }))}>
              <option value="privato">Privato</option>
              <option value="piva">Azienda (P.IVA)</option>
            </select>
          </label>
          <label>Nome / Ragione sociale
            <input required value={form.name} onChange={e=>setForm({...form, name:e.target.value})}/>
          </label>

          <label>Email
            <input type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})}/>
          </label>

          {isAzienda ? (
            <label>P.IVA (11)
              <input value={form.piva} onChange={e=>setForm({...form, piva:e.target.value.toUpperCase()})}/>
            </label>
          ) : (
            <label>Codice Fiscale (16)
              <input value={form.cf} onChange={e=>setForm({...form, cf:e.target.value.toUpperCase()})}/>
            </label>
          )}

          <div style={{gridColumn:'1 / -1', display:'flex', gap:10}}>
            <button disabled={busy}>{busy ? 'Salvo…' : 'Aggiungi cliente'}</button>
            <button type="button" className="ghost" onClick={()=>setForm({type:'privato', name:'', email:'', piva:'', cf:''})}>Reset</button>
          </div>
        </form>
      </section>

      <section className="card">
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
          <h2 style={{margin:0}}>Clienti</h2>
          <span className="badge cyan">{items.length} record</span>
        </div>
        <div style={{overflowX:'auto', marginTop:12}}>
          <table className="table">
            <thead>
              <tr><th>Nome</th><th>Tipo</th><th>Email</th><th>CF / P.IVA</th><th>Creato</th></tr>
            </thead>
            <tbody>
              {items.map(c=>(
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td><span className={`badge ${c.type === 'privato' ? 'green' : 'yellow'}`}>{c.type.toUpperCase()}</span></td>
                  <td>{c.email || '—'}</td>
                  <td>{c.type === 'privato' ? (c.cf || '—') : (c.piva || '—')}</td>
                  <td>{c.created_at ? new Date(c.created_at).toLocaleString() : '—'}</td>
                </tr>
              ))}
              {!items.length && (
                <tr><td colSpan={5} style={{color:'var(--sub)'}}>Nessun cliente presente.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
