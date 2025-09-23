import React, { useEffect, useState } from 'react';
import { apiGet, apiPost } from '../lib/api';

type CER = {
  id:string; name:string; cabina?:string;
  quota_shared?:number; split_prod?:number; split_prosumer?:number; split_cer_to_user?:number;
  trader?:string; created_at?:string;
};

export default function CER() {
  const [items, setItems] = useState<CER[]>([]);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<any>({
    name:'', cabina:'', quota_shared:'',
    split_prod:'', split_prosumer:'', split_cer_to_user:'', trader:''
  });

  const parseNum = (v:string) => v === '' ? null : Number(v);

  const load = async () => {
    setBusy(true);
    try {
      const data = await apiGet('cer-list');
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
      const payload = {
        name: form.name,
        cabina: form.cabina || null,
        quota_shared: parseNum(form.quota_shared),
        split_prod: parseNum(form.split_prod),
        split_prosumer: parseNum(form.split_prosumer),
        split_cer_to_user: parseNum(form.split_cer_to_user),
        trader: form.trader || null
      };
      await apiPost('cer-create', payload);
      setForm({ name:'', cabina:'', quota_shared:'', split_prod:'', split_prosumer:'', split_cer_to_user:'', trader:'' });
      await load();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-6">
      <h1>CER Manager</h1>
      <form onSubmit={submit} style={{display:'grid', gap:'8px', maxWidth:520}}>
        <label>Nome CER
          <input required value={form.name} onChange={e=>setForm({...form, name:e.target.value})} />
        </label>
        <label>Cabina primaria
          <input value={form.cabina} onChange={e=>setForm({...form, cabina:e.target.value})} />
        </label>
        <label>Quota condivisa (%)
          <input type="number" step="0.01" value={form.quota_shared} onChange={e=>setForm({...form, quota_shared:e.target.value})} />
        </label>
        <label>Riparto Produttore (%)
          <input type="number" step="0.01" value={form.split_prod} onChange={e=>setForm({...form, split_prod:e.target.value})} />
        </label>
        <label>Riparto Prosumer (%)
          <input type="number" step="0.01" value={form.split_prosumer} onChange={e=>setForm({...form, split_prosumer:e.target.value})} />
        </label>
        <label>CER TO USER (%)
          <input type="number" step="0.01" value={form.split_cer_to_user} onChange={e=>setForm({...form, split_cer_to_user:e.target.value})} />
        </label>
        <label>Trader eccedenze
          <input value={form.trader} onChange={e=>setForm({...form, trader:e.target.value})} />
        </label>
        <button disabled={busy}>{busy ? 'Creo…' : 'Crea CER'}</button>
      </form>

      <h2 style={{marginTop:24}}>CER esistenti ({items.length})</h2>
      {busy && <p>Carico…</p>}
      <div style={{display:'grid', gap:'8px'}}>
        {items.map(c => (
          <div key={c.id} style={{border:'1px solid #222', padding:'8px', borderRadius:8}}>
            <div><strong>{c.name}</strong> — Cabina: {c.cabina || '—'}</div>
            <div>Quota condivisa: {c.quota_shared ?? '—'}%</div>
            <div>Riparti → Prod: {c.split_prod ?? '—'}% • Prosumer: {c.split_prosumer ?? '—'}% • CER TO USER: {c.split_cer_to_user ?? '—'}%</div>
            {c.trader && <div>Trader: {c.trader}</div>}
            {c.created_at && <small>Creato: {new Date(c.created_at).toLocaleString()}</small>}
          </div>
        ))}
      </div>
    </div>
  );
}
