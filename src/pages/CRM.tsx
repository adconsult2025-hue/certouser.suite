import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";

type Customer = {
  id: string;
  nome: string;
  email: string;
  telefono: string;
  pod: string;
  cabina: string;
  hasDoc: boolean;
  hasTessera: boolean;
  hasBolletta: boolean;
  hasPrivacy: boolean;
};

const STORAGE_KEY = "crm_customers_v1";

function loadCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveCustomers(data: Customer[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export default function CRM() {
  const [customers, setCustomers] = useState<Customer[]>(() => loadCustomers());
  const empty: Customer = useMemo(
    () => ({
      id: "",
      nome: "",
      email: "",
      telefono: "",
      pod: "",
      cabina: "",
      hasDoc: false,
      hasTessera: false,
      hasBolletta: false,
      hasPrivacy: false,
    }),
    []
  );
  const [form, setForm] = useState<Customer>(empty);

  function onPick(c: Customer) {
    setForm({ ...c, id: c.id });
  }

  function onNew() {
    setForm(empty);
  }

  function onChange<K extends keyof Customer>(key: K, val: Customer[K]) {
    setForm((f) => ({ ...f, [key]: val }));
  }

  function onFileChange(key: keyof Customer, files: FileList | null) {
    // usiamo solo la presenza file -> boolean
    onChange(key, !!(files && files.length) as any);
  }

  function onSave() {
    const id = form.id || String(Date.now());
    const record: Customer = { ...form, id };
    const next = [...customers];
    const idx = next.findIndex((x) => String(x.id) === String(id));
    if (idx >= 0) next[idx] = record;
    else next.push(record);
    setCustomers(next);
    saveCustomers(next);
    setForm(record);
  }

  function openGSE() {
    window.open(
      "https://www.gse.it/servizi-per-te/autoconsumo/mappa-interattiva-delle-cabine-primarie",
      "_blank",
      "noopener,noreferrer"
    );
  }

  return (
    <div className="container">
      <nav className="main-nav">
        <ul>
          <li><Link to="/">Home</Link></li>
          <li className="active"><Link to="/crm">Clienti</Link></li>
          <li><a href="/simulatore.html">Simulatore</a></li>
        </ul>
      </nav>

      <header className="page-header">
        <h1>Gestione Clienti</h1>
        <div className="crm-controls">
          <button className="btn primary" onClick={onNew}>Nuovo Cliente</button>
          <button className="btn" onClick={openGSE}>Verifica Cabina (GSE)</button>
        </div>
      </header>

      <section className="grid-2">
        {/* Lista */}
        <div className="card">
          <h2>Elenco</h2>
          <table className="table">
            <thead>
              <tr>
                <th>Nome</th><th>Email</th><th>Telefono</th><th>POD</th><th>Cabina</th><th className="a-center">Allegati</th><th></th>
              </tr>
            </thead>
            <tbody>
              {customers.map((c) => (
                <tr key={c.id}>
                  <td>{c.nome}</td>
                  <td>{c.email}</td>
                  <td>{c.telefono}</td>
                  <td>{c.pod}</td>
                  <td>{c.cabina}</td>
                  <td className="a-center">
                    <span className={`dot ${c.hasDoc ? "ok" : ""}`} title="Documento"></span>
                    <span className={`dot ${c.hasTessera ? "ok" : ""}`} title="Tessera"></span>
                    <span className={`dot ${c.hasBolletta ? "ok" : ""}`} title="Bolletta"></span>
                    <span className={`dot ${c.hasPrivacy ? "ok" : ""}`} title="Privacy"></span>
                  </td>
                  <td className="a-right">
                    <button className="btn small" onClick={() => onPick(c)}>Modifica</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Form */}
        <div className="card">
          <h2>Scheda Cliente</h2>
          <div className="form-grid">
            <div className="form-row">
              <label>Nome</label>
              <input value={form.nome} onChange={(e) => onChange("nome", e.target.value)} />
            </div>
            <div className="form-row">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => onChange("email", e.target.value)} />
            </div>
            <div className="form-row">
              <label>Telefono</label>
              <input value={form.telefono} onChange={(e) => onChange("telefono", e.target.value)} />
            </div>
            <div className="form-row two">
              <div>
                <label>POD</label>
                <input value={form.pod} onChange={(e) => onChange("pod", e.target.value)} />
              </div>
              <div>
                <label>Cabina</label>
                <input value={form.cabina} onChange={(e) => onChange("cabina", e.target.value)} />
              </div>
            </div>

            <fieldset className="attachments">
              <legend>Allegati obbligatori</legend>
              <div className="attach-row">
                <span className={`dot ${form.hasDoc ? "ok" : ""}`}></span>
                <label>Documento di riconoscimento</label>
                <input type="file" onChange={(e) => onFileChange("hasDoc", e.target.files)} />
              </div>
              <div className="attach-row">
                <span className={`dot ${form.hasTessera ? "ok" : ""}`}></span>
                <label>Tessera sanitaria</label>
                <input type="file" onChange={(e) => onFileChange("hasTessera", e.target.files)} />
              </div>
              <div className="attach-row">
                <span className={`dot ${form.hasBolletta ? "ok" : ""}`}></span>
                <label>Bolletta</label>
                <input type="file" onChange={(e) => onFileChange("hasBolletta", e.target.files)} />
              </div>
              <div className="attach-row">
                <span className={`dot ${form.hasPrivacy ? "ok" : ""}`}></span>
                <label>Privacy</label>
                <input type="file" onChange={(e) => onFileChange("hasPrivacy", e.target.files)} />
              </div>
            </fieldset>

            <div className="actions a-right">
              <button className="btn" onClick={onNew}>Annulla</button>
              <button className="btn primary" onClick={onSave}>Salva</button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
