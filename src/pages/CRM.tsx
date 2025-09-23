import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';

type Customer = { id:string; type:string; name:string; email?:string; piva?:string; created_at?:string };

export default function CRM() {
  const [items, setItems] = useState<Customer[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ type:'privato', name:'', email:'', piva:'' });
  const load = async () => {
    setBusy(true);
    try {
      const data = await apiGet('customers-list');
      setItems(data.items || []);
    } finally {
      setBusy(false);
    }
  };
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await apiPost('customers-create', form);
      setForm({ type:'privato', name:'', email:'', piva:'' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6">
      <h1>CRM</h1>
      <form onSubmit={submit} style={{display:'grid', gap:'8px', maxWidth:420}}>
        <label>Tipo
          <select value={form.type} onChange={e=>setForm({...form, type:e.target.value})}>
            <option value="privato">Privato</option>
            <option value="piva">P.IVA</option>
          </select>
        </label>
        <label>Nome/Ragione Sociale
          <input required value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
        </label>
        <label>Email
          <input type="email" value={form.email} onChange={e=>setForm({...form, email:e.target.value})} />
        </label>
        <label>P.IVA
          <input value={form.piva} onChange={e=>setForm({...form, piva:e.target.value})} />
        </label>
        <button disabled={busy}>{busy ? 'Salvo…' : 'Aggiungi cliente'}</button>
      </form>

      <h2 style={{marginTop:24}}>Clienti ({items.length})</h2>
      {busy && <p>Carico…</p>}
      <div style={{display:'grid', gap:'8px'}}>
        {items.map(c => (
          <div key={c.id} style={{border:'1px solid #222', padding:'8px', borderRadius:8}}>
            <div><strong>{c.name}</strong> — {c.type.toUpperCase()}</div>
            {c.email && <div>Email: {c.email}</div>}
            {c.piva && <div>P.IVA: {c.piva}</div>}
            {c.created_at && <small>Creato: {new Date(c.created_at).toLocaleString()}</small>}
          </div>
        ))}
      </div>
    </div>
  );
}
