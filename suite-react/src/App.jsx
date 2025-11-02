import React, { useEffect, useMemo, useState } from "react";

// ==========================
// CERtoUSER — SUITE UNIFICATA (DEMO LOCALE)
// Single-file React app with TailwindCSS.
// Data persist via localStorage. No external deps.
// Clipboard-safe (fallbacks) + self-tests
// ==========================

// --- Utils
const uid = (p = "id") => `${p}_${Math.random().toString(36).slice(2, 9)}`;
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const load = (k, d) => {
  try {
    const v = JSON.parse(localStorage.getItem(k) || "null");
    return v ?? d;
  } catch {
    return d;
  }
};

/**
 * Robust clipboard helper that works under restrictive Permissions-Policy.
 * It tries navigator.clipboard (secure contexts), then falls back to a hidden
 * textarea + document.execCommand('copy'), and finally to a manual prompt.
 * Always call from a direct user gesture (onClick).
 */
async function copyToClipboard(text) {
  // 1) Modern API (allowed only in secure contexts + policy)
  try {
    if (
      typeof navigator !== "undefined" &&
      navigator.clipboard &&
      window.isSecureContext
    ) {
      await navigator.clipboard.writeText(text);
      return { ok: true, method: "clipboard" };
    }
  } catch (_) {
    /* continue to fallback */
  }
  // 2) Fallback: hidden textarea + execCommand
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    ta.style.position = "fixed";
    ta.style.top = "-9999px";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const success = document.execCommand("copy");
    document.body.removeChild(ta);
    if (success) return { ok: true, method: "execCommand" };
  } catch (_) {
    /* continue to fallback */
  }
  // 3) Last resort: manual copy via prompt
  try {
    window.prompt("Copia manualmente questo valore e premi OK", text);
    return { ok: false, method: "prompt" };
  } catch (_) {
    /* no-op */
  }
  return { ok: false, method: "failed" };
}

const SECTION_COLORS = {
  Dashboard: "from-gray-700 to-gray-900",
  CRM: "from-emerald-600 to-emerald-800",
  "Impianti FV": "from-yellow-500 to-amber-700",
  CER: "from-cyan-600 to-sky-800",
  CEC: "from-indigo-600 to-purple-800",
  "Conto Termico 3.0": "from-rose-600 to-red-800",
  Ristrutturazioni: "from-slate-600 to-slate-800",
  "Documenti & GSE": "from-teal-600 to-teal-800",
  Simulatore: "from-fuchsia-600 to-pink-800",
};

const Card = ({ title, actions, children }) => (
  <div className="rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-xl p-4">
    <div className="flex items-center justify-between mb-2">
      <h3 className="text-sm font-semibold tracking-wide text-white/90">
        {title}
      </h3>
      {actions}
    </div>
    <div className="text-white/90 text-sm">{children}</div>
  </div>
);

const Badge = ({ children }) => (
  <span className="inline-flex items-center rounded-full border border-white/15 px-2 py-0.5 text-xs text-white/90">
    {children}
  </span>
);

const Pill = ({ color = "", children }) => (
  <span
    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${color}`}
  >
    {children}
  </span>
);

const Button = ({ variant = "primary", className = "", ...props }) => {
  const base =
    "inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition active:scale-[.98]";
  const styles = {
    primary:
      "bg-white/10 hover:bg-white/15 border border-white/20 text-white shadow",
    ghost:
      "bg-transparent hover:bg-white/10 border border-white/10 text-white/90",
    danger: "bg-red-600/80 hover:bg-red-600 text-white border border-red-400/40",
  };
  return (
    <button className={`${base} ${styles[variant]} ${className}`} {...props} />
  );
};

const Input = ({ label, hint, ...props }) => (
  <label className="grid gap-1">
    <span className="text-xs text-white/70">{label}</span>
    <input
      className="rounded-xl bg-white/5 text-white border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
      {...props}
    />
    {hint && <span className="text-[11px] text-white/50">{hint}</span>}
  </label>
);

const Select = ({ label, options, value, onChange, hint }) => (
  <label className="grid gap-1">
    <span className="text-xs text-white/70">{label}</span>
    <select
      className="rounded-xl bg-white/5 text-white border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">—</option>
      {options.map((o) => (
        <option key={o.value} value={o.value} className="bg-gray-900 text-white">
          {o.label}
        </option>
      ))}
    </select>
    {hint && <span className="text-[11px] text-white/50">{hint}</span>}
  </label>
);

// --- Global store (localStorage-backed)
const StoreContext = React.createContext(null);
const initialData = {
  clients: [], // {id,name,email,phone,pod,vat}
  cers: [], // {id,name,cabina,quota_condivisa,split:{produttore:85,cer:15},trader,memberIds:[],plantIds:[]}
  plants: [], // {id,name,kwp,clientId,cerId,location}
  cecs: [], // {id,name,scope,memberIds:[]}
  projects: [], // condo works {id,name,address,admins:[],technicians:[],subcontractors:[],status,linkedPlantIds:[]}
  ct3: [], // {id,beneficiario,misura,potenza_kW,incentivo_stimato}
  docs: [], // {id,type,cerId,template,generatedAt,placeholders}
  quotes: [], // {id,type,amount,currency,linked:{clientId,plantId,cerId,projectId}}
};

function StoreProvider({ children }) {
  const [data, setData] = useState(() => load("certouser_suite_data", initialData));

  useEffect(() => {
    save("certouser_suite_data", data);
  }, [data]);

  const api = useMemo(
    () => ({
      // CRUD helpers
      add: (coll, item) => setData((d) => ({ ...d, [coll]: [...d[coll], item] })),
      upd: (coll, id, patch) =>
        setData((d) => ({
          ...d,
          [coll]: d[coll].map((x) => (x.id === id ? { ...x, ...patch } : x)),
        })),
      del: (coll, id) =>
        setData((d) => ({ ...d, [coll]: d[coll].filter((x) => x.id !== id) })),
      all: (coll) => data[coll],
      one: (coll, id) => data[coll].find((x) => x.id === id),
      linkPlantTo: ({ plantId, clientId, cerId }) =>
        setData((d) => {
          const plant = d.plants.find((p) => p.id === plantId);
          if (!plant) return d;
          const next = { ...d };
          // unlink from previous CER
          if (plant.cerId && next.cers.find((c) => c.id === plant.cerId)) {
            next.cers = next.cers.map((c) =>
              c.id === plant.cerId
                ? {
                    ...c,
                    plantIds: c.plantIds.filter((id) => id !== plantId),
                  }
                : c
            );
          }
          // update plant
          next.plants = next.plants.map((p) =>
            p.id === plantId
              ? {
                  ...p,
                  clientId: clientId ?? p.clientId,
                  cerId: cerId ?? p.cerId,
                }
              : p
          );
          // add to CER
          if (cerId) {
            next.cers = next.cers.map((c) =>
              c.id === cerId
                ? {
                    ...c,
                    plantIds: Array.from(
                      new Set([...(c.plantIds || []), plantId])
                    ),
                  }
                : c
            );
          }
          // add client as member of CER if provided
          if (cerId && clientId) {
            next.cers = next.cers.map((c) =>
              c.id === cerId
                ? {
                    ...c,
                    memberIds: Array.from(
                      new Set([...(c.memberIds || []), clientId])
                    ),
                  }
                : c
            );
          }
          return next;
        }),
      import: (json) => setData(json),
      export: () => data,
    }),
    [data]
  );

  return <StoreContext.Provider value={api}>{children}</StoreContext.Provider>;
}

const useStore = () => React.useContext(StoreContext);

// --- Layout
function App() {
  const [section, setSection] = useState("Dashboard");
  const [q, setQ] = useState("");

  useEffect(() => {
    document.title = `CERtoUSER — ${section}`;
  }, [section]);

  return (
    <StoreProvider>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-900 to-black text-white">
        <Header section={section} q={q} setQ={setQ} />
        <div className="flex">
          <Sidebar current={section} onSelect={setSection} />
          <main className="flex-1 p-4 md:p-6 lg:p-8 space-y-6">
            <Hero section={section} />
            <SectionRouter section={section} query={q} />
          </main>
        </div>
      </div>
    </StoreProvider>
  );
}

const Header = ({ section, q, setQ }) => (
  <div className="sticky top-0 z-40 backdrop-blur supports-[backdrop-filter]:bg-white/5 bg-black/20 border-b border-white/10">
    <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 h-16 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-400 to-teal-500 shadow"></div>
        <div>
          <div className="text-xs uppercase tracking-widest text-white/60">
            CERtoUSER
          </div>
          <div className="text-sm text-white/80">
            Suite Unificata — DEMO (LocalStorage)
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3 w-1/2 max-w-xl">
        <input
          placeholder={`Cerca in ${section}…`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="flex-1 rounded-xl bg-white/5 text-white border border-white/10 px-3 py-2 outline-none focus:ring-2 focus:ring-white/20"
        />
        <Button
          variant="ghost"
          onClick={() => alert("Accesso: SuperAdmin (DEMO)")}
        >
          SuperAdmin
        </Button>
      </div>
    </div>
  </div>
);

const Sidebar = ({ current, onSelect }) => {
  const items = [
    "Dashboard",
    "CRM",
    "Impianti FV",
    "CER",
    "CEC",
    "Conto Termico 3.0",
    "Ristrutturazioni",
    "Documenti & GSE",
    "Simulatore",
  ];
  return (
    <aside className="w-[240px] hidden md:block border-r border-white/10 min-h-[calc(100vh-4rem)]">
      <nav className="p-3 space-y-1">
        {items.map((it) => (
          <button
            key={it}
            onClick={() => onSelect(it)}
            className={`w-full text-left rounded-xl px-3 py-2 text-sm font-medium transition ${
              current === it
                ? "bg-white/10 text-white border border-white/20"
                : "text-white/70 hover:bg-white/5 border border-transparent"
            }`}
          >
            {it}
          </button>
        ))}
      </nav>
      <div className="p-3">
        <Card title="Ambiente">
          <div className="flex items-center justify-between">
            <Badge>Local DEMO</Badge>
            <span className="text-xs text-white/60">No DB—Neon (mock)</span>
          </div>
        </Card>
      </div>
    </aside>
  );
};

const Hero = ({ section }) => (
  <div
    className={`rounded-2xl p-6 border border-white/10 shadow-xl bg-gradient-to-br ${SECTION_COLORS[section]}`}
  >
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">
          {section}
        </h1>
        <p className="text-white/80 text-sm mt-1">
          Grafica grey semilucida • Colori sezionali • Collegamenti incrociati
        </p>
      </div>
      <div className="text-right text-white/75 text-sm hidden md:block">
        <div>
          Stato: <Badge>Operativo</Badge>
        </div>
        <div>Build: DEMO-1.1</div>
      </div>
    </div>
  </div>
);

// --- Section Router
function SectionRouter({ section, query }) {
  switch (section) {
    case "Dashboard":
      return <Dashboard />;
    case "CRM":
      return <CRM q={query} />;
    case "Impianti FV":
      return <Impianti q={query} />;
    case "CER":
      return <CER q={query} />;
    case "CEC":
      return <CEC q={query} />;
    case "Conto Termico 3.0":
      return <CT3 q={query} />;
    case "Ristrutturazioni":
      return <Ristrutturazioni q={query} />;
    case "Documenti & GSE":
      return <DocumentiGSE q={query} />;
    case "Simulatore":
      return <Simulatore q={query} />;
    default:
      return null;
  }
}

// --- Dashboard
function Dashboard() {
  const store = useStore();
  const clients = store.all("clients");
  const plants = store.all("plants");
  const cers = store.all("cers");
  const projects = store.all("projects");

  const kpi = [
    { k: "Clienti", v: clients.length },
    { k: "Impianti", v: plants.length },
    { k: "CER", v: cers.length },
    { k: "Progetti Condomini", v: projects.length },
  ];

  return (
    <div className="grid md:grid-cols-4 gap-4">
      {kpi.map((x) => (
        <Card key={x.k} title={x.k}>
          <div className="text-3xl font-bold">{x.v}</div>
        </Card>
      ))}
      <div className="md:col-span-2 grid gap-4">
        <Card title="Collegamenti rapidi">
          <div className="flex flex-wrap gap-2">
            <QuickSampleData />
          </div>
        </Card>
        <Card title="Export / Import dati (JSON)">
          <DataPortable />
        </Card>
      </div>
      <Card title="Note Normative (promemoria)">
        <ul className="list-disc ml-5 space-y-1">
          <li>
            DM 7/12/2023 (tariffe CER) — integrazione futura per calcolo
            incentivi.
          </li>
          <li>
            ARERA 727/2022 — regole di valorizzazione energia condivisa.
          </li>
          <li>
            CT 3.0 — misure ammissibili e massimali incentivo: integrazione
            simulatore.
          </li>
        </ul>
      </Card>
      <ClipboardSelfTest />
      <StoreSelfTest />
    </div>
  );
}

function DataPortable() {
  const store = useStore();
  const [txt, setTxt] = useState("");
  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <Button onClick={() => setTxt(JSON.stringify(store.export(), null, 2))}>
          Esporta
        </Button>
        <Button
          variant="ghost"
          onClick={() => {
            try {
              store.import(JSON.parse(txt));
              alert("Import riuscito");
            } catch {
              alert("JSON non valido");
            }
          }}
        >
          Importa
        </Button>
      </div>
      <textarea
        value={txt}
        onChange={(e) => setTxt(e.target.value)}
        className="w-full h-40 rounded-xl bg-white/5 text-white border border-white/10 p-2 font-mono text-xs"
        placeholder="Incolla qui il JSON per importare…"
      />
    </div>
  );
}

function QuickSampleData() {
  const store = useStore();
  const seed = () => {
    const c1 = {
      id: uid("cli"),
      name: "Hotel Riviera",
      email: "info@riviera.it",
      phone: "0773-0001",
      pod: "IT001E0000001",
      vat: "IT01234567890",
    };
    const c2 = {
      id: uid("cli"),
      name: "Pizzeria Da Mario",
      email: "pizzeria@mario.it",
      phone: "0773-0002",
      pod: "IT001E0000002",
      vat: "IT10987654321",
    };
    const cer = {
      id: uid("cer"),
      name: "CER Terracina Centro",
      cabina: "CP-TRC-001",
      quota_condivisa: 70,
      split: { produttore: 85, cer: 15 },
      trader: "TraderX",
      memberIds: [],
      plantIds: [],
    };
    const pv1 = {
      id: uid("pv"),
      name: "FV Hotel 50 kWp",
      kwp: 50,
      location: "Terracina",
      clientId: c1.id,
      cerId: cer.id,
    };
    const pv2 = {
      id: uid("pv"),
      name: "FV Mario 6 kWp",
      kwp: 6,
      location: "Terracina",
      clientId: c2.id,
      cerId: cer.id,
    };
    const proj = {
      id: uid("prj"),
      name: "Condominio Aurora",
      address: "Via Roma 12, Terracina",
      admins: ["Geom. Bianchi"],
      technicians: ["Ing. Verdi"],
      subcontractors: ["TermoPlus Srl"],
      status: "Analisi",
      linkedPlantIds: [pv1.id],
    };
    store.add("clients", c1);
    store.add("clients", c2);
    store.add("cers", cer);
    store.add("plants", pv1);
    store.add("plants", pv2);
    store.add("projects", proj);
    alert("Dati demo inseriti (2 clienti, 1 CER, 2 impianti, 1 progetto)");
  };
  return <Button onClick={seed}>Carica dati demo</Button>;
}

// --- Self-tests (adds test cases)
function ClipboardSelfTest() {
  const [status, setStatus] = useState("");
  const runTest = async () => {
    const sample = `test_${Math.random().toString(36).slice(2, 8)}`;
    const res = await copyToClipboard(sample);
    setStatus(res.ok ? `OK (${res.method})` : `Manual (${res.method})`);
    alert(
      res.ok
        ? `Copiato con metodo: ${res.method}`
        : "Permessi ristretti: testo mostrato per copia manuale"
    );
  };
  return (
    <Card title="Self‑test: Clipboard">
      <div className="flex items-center gap-2">
        <Button onClick={runTest}>Esegui test</Button>
        <span className="text-xs text-white/70">Stato: {status || "inattivo"}</span>
      </div>
    </Card>
  );
}

function StoreSelfTest() {
  const store = useStore();
  const [result, setResult] = useState("");
  const run = () => {
    const tmpClient = {
      id: uid("test_cli"),
      name: "TEST CLIENT",
      email: "t@t.t",
      phone: "",
      pod: "",
      vat: "",
    };
    try {
      const before = store.all("clients").length;
      store.add("clients", tmpClient);
      const mid = store.all("clients").length;
      store.del("clients", tmpClient.id);
      const after = store.all("clients").length;
      const ok = mid === before + 1 && after === before;
      setResult(ok ? "OK CRUD" : "KO");
      alert(ok ? "Self-test CRUD OK" : "Self-test CRUD KO");
    } catch (e) {
      setResult("ERR");
      alert("Self-test errore: " + (e?.message || e));
    }
  };
  return (
    <Card title="Self‑test: Store CRUD">
      <div className="flex items-center gap-2">
        <Button onClick={run}>Esegui test</Button>
        <span className="text-xs text-white/70">Esito: {result || "inattivo"}</span>
      </div>
    </Card>
  );
}

// --- CRM
function CRM({ q }) {
  const store = useStore();
  const [f, setF] = useState({
    name: "",
    email: "",
    phone: "",
    pod: "",
    vat: "",
  });
  const items = store.all("clients").filter((c) =>
    [c.name, c.email, c.phone, c.pod, c.vat].some((v) =>
      (v || "").toLowerCase().includes(q.toLowerCase())
    )
  );

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card title="Nuovo cliente">
        <div className="grid gap-3">
          <Input
            label="Ragione sociale / Nome"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
          <Input
            label="Email"
            value={f.email}
            onChange={(e) => setF({ ...f, email: e.target.value })}
          />
          <Input
            label="Telefono"
            value={f.phone}
            onChange={(e) => setF({ ...f, phone: e.target.value })}
          />
          <Input
            label="POD"
            value={f.pod}
            onChange={(e) => setF({ ...f, pod: e.target.value })}
          />
          <Input
            label="P.IVA / CF"
            value={f.vat}
            onChange={(e) => setF({ ...f, vat: e.target.value })}
          />
          <div className="flex justify-end">
            <Button
              onClick={() => {
                if (!f.name) return alert("Nome obbligatorio");
                store.add("clients", { id: uid("cli"), ...f });
                setF({ name: "", email: "", phone: "", pod: "", vat: "" });
              }}
            >
              Salva
            </Button>
          </div>
        </div>
      </Card>
      <div className="md:col-span-2">
        <Card title={`Clienti (${items.length})`}>
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr>
                <th className="text-left py-2">Nome</th>
                <th className="text-left">Email</th>
                <th className="text-left">POD</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((c) => (
                <tr key={c.id} className="border-t border-white/10">
                  <td className="py-2">{c.name}</td>
                  <td>{c.email}</td>
                  <td>{c.pod}</td>
                  <td className="text-right">
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        const res = await copyToClipboard(c.id);
                        if (res.ok) alert("ID cliente copiato");
                      }}
                    >
                      ID
                    </Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan="4"
                    className="py-6 text-center text-white/60"
                  >
                    Nessun cliente
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

// --- Impianti FV
function Impianti({ q }) {
  const store = useStore();
  const clients = store.all("clients");
  const cers = store.all("cers");
  const [f, setF] = useState({
    name: "",
    kwp: "",
    location: "",
    clientId: "",
    cerId: "",
  });
  const items = store.all("plants").filter((p) =>
    [p.name, p.location, String(p.kwp || "")].some((v) =>
      (v || "").toLowerCase().includes(q.toLowerCase())
    )
  );

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card title="Nuovo impianto / Preventivatore">
        <div className="grid gap-3">
          <Input
            label="Nome impianto"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Potenza (kWp)"
              type="number"
              value={f.kwp}
              onChange={(e) => setF({ ...f, kwp: e.target.value })}
            />
            <Input
              label="Località"
              value={f.location}
              onChange={(e) => setF({ ...f, location: e.target.value })}
            />
          </div>
          <Select
            label="Cliente"
            value={f.clientId}
            onChange={(v) => setF({ ...f, clientId: v })}
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            label="CER"
            value={f.cerId}
            onChange={(v) => setF({ ...f, cerId: v })}
            options={cers.map((c) => ({ value: c.id, label: c.name }))}
          />
          <PVPreventivatore kwp={Number(f.kwp || 0)} />
          <div className="flex justify-between">
            <Button
              variant="ghost"
              onClick={() =>
                setF({ name: "", kwp: "", location: "", clientId: "", cerId: "" })
              }
            >
              Reset
            </Button>
            <Button
              onClick={() => {
                if (!f.name || !f.kwp) return alert("Nome e kWp obbligatori");
                const id = uid("pv");
                store.add("plants", {
                  id,
                  name: f.name,
                  kwp: Number(f.kwp),
                  location: f.location,
                  clientId: f.clientId || null,
                  cerId: f.cerId || null,
                });
                if (f.cerId)
                  store.upd("cers", f.cerId, {
                    plantIds: Array.from(
                      new Set([...(store.one("cers", f.cerId)?.plantIds || []), id])
                    ),
                  });
                if (f.clientId && f.cerId)
                  store.upd("cers", f.cerId, {
                    memberIds: Array.from(
                      new Set([
                        ...(store.one("cers", f.cerId)?.memberIds || []),
                        f.clientId,
                      ])
                    ),
                  });
                alert("Impianto salvato");
              }}
            >
              Salva
            </Button>
          </div>
        </div>
      </Card>
      <div className="md:col-span-2">
        <Card title={`Impianti (${items.length})`}>
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr>
                <th className="text-left py-2">Nome</th>
                <th>kWp</th>
                <th>Cliente</th>
                <th>CER</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((p) => (
                <tr key={p.id} className="border-t border-white/10">
                  <td className="py-2">{p.name}</td>
                  <td className="text-center">{p.kwp}</td>
                  <td className="text-center">
                    {store.one("clients", p.clientId)?.name || "—"}
                  </td>
                  <td className="text-center">
                    {store.one("cers", p.cerId)?.name || "—"}
                  </td>
                  <td className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        const res = await copyToClipboard(p.id);
                        if (res.ok) alert("ID impianto copiato");
                      }}
                    >
                      ID
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => store.del("plants", p.id)}
                    >
                      Elimina
                    </Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan="5"
                    className="py-6 text-center text-white/60"
                  >
                    Nessun impianto
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function PVPreventivatore({ kwp }) {
  // modello semplice: costo 1.000 €/kWp, O&M 25 €/kWp/a, produzione 1.250 kWh/kWp, autoconsumo 40%, PUN 0.18€/kWh
  const CAPEX_KWP = 1000;
  const OM_KWP = 25;
  const PROD = 1250; // kWh/kwp/year
  const PUN = 0.18;
  const aut = 0.4;
  const capex = kwp * CAPEX_KWP;
  const om = kwp * OM_KWP;
  const kwh = kwp * PROD;
  const risparmio = kwh * aut * PUN;
  return (
    <div className="rounded-xl bg-black/20 p-3 text-xs border border-white/10">
      <div className="font-semibold mb-1">Preventivo rapido</div>
      <div className="grid grid-cols-2 gap-2">
        <div>CAPEX stimato</div>
        <div className="text-right">€ {capex.toLocaleString()}</div>
        <div>O&M annuo</div>
        <div className="text-right">€ {om.toLocaleString()}</div>
        <div>Produzione annua</div>
        <div className="text-right">{kwh.toLocaleString()} kWh</div>
        <div>Risparmio annuo (40% aut.)</div>
        <div className="text-right">€ {risparmio.toFixed(0)}</div>
      </div>
    </div>
  );
}

// --- CER
function CER({ q }) {
  const store = useStore();
  const clients = store.all("clients");
  const plants = store.all("plants");
  const [f, setF] = useState({
    name: "",
    cabina: "",
    quota_condivisa: 70,
    produttore: 85,
    cer: 15,
    trader: "",
  });
  const items = store
    .all("cers")
    .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));

  const memberOpts = clients.map((c) => ({ value: c.id, label: c.name }));
  const plantOpts = plants.map((p) => ({
    value: p.id,
    label: `${p.name} (${p.kwp} kWp)`,
  }));

  const [selectedCER, setSelectedCER] = useState("");
  const cer = items.find((x) => x.id === selectedCER) || null;

  const [link, setLink] = useState({ clientId: "", plantId: "" });

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card title="Nuova CER">
        <div className="grid gap-3">
          <Input
            label="Nome CER"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
          <Input
            label="Cabina primaria"
            value={f.cabina}
            onChange={(e) => setF({ ...f, cabina: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Quota condivisa %"
              type="number"
              value={f.quota_condivisa}
              onChange={(e) =>
                setF({ ...f, quota_condivisa: Number(e.target.value) })
              }
            />
            <Input
              label="Produttore %"
              type="number"
              value={f.produttore}
              onChange={(e) =>
                setF({ ...f, produttore: Number(e.target.value) })
              }
            />
            <Input
              label="CER %"
              type="number"
              value={f.cer}
              onChange={(e) => setF({ ...f, cer: Number(e.target.value) })}
            />
          </div>
          <Input
            label="Trader eccedenze"
            value={f.trader}
            onChange={(e) => setF({ ...f, trader: e.target.value })}
          />
          <div className="flex justify-end">
            <Button
              onClick={() => {
                if (!f.name) return alert("Nome obbligatorio");
                store.add("cers", {
                  id: uid("cer"),
                  name: f.name,
                  cabina: f.cabina,
                  quota_condivisa: f.quota_condivisa,
                  split: { produttore: f.produttore, cer: f.cer },
                  trader: f.trader,
                  memberIds: [],
                  plantIds: [],
                });
                setF({
                  name: "",
                  cabina: "",
                  quota_condivisa: 70,
                  produttore: 85,
                  cer: 15,
                  trader: "",
                });
              }}
            >
              Crea CER
            </Button>
          </div>
        </div>
      </Card>
      <Card title="Collega membri / impianti">
        <div className="grid gap-3">
          <Select
            label="Seleziona CER"
            value={selectedCER}
            onChange={setSelectedCER}
            options={store
              .all("cers")
              .map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            label="Cliente"
            value={link.clientId}
            onChange={(v) => setLink({ ...link, clientId: v })}
            options={memberOpts}
          />
          <Select
            label="Impianto"
            value={link.plantId}
            onChange={(v) => setLink({ ...link, plantId: v })}
            options={plantOpts}
          />
          <div className="flex justify-end">
            <Button
              onClick={() => {
                if (!selectedCER) return alert("Scegli una CER");
                store.linkPlantTo({
                  plantId: link.plantId,
                  clientId: link.clientId,
                  cerId: selectedCER,
                });
                alert("Collegamenti aggiornati");
              }}
            >
              Applica
            </Button>
          </div>
        </div>
      </Card>
      <div>
        <Card title="Lista CER">
          <ul className="space-y-2">
            {items.map((c) => (
              <li
                key={c.id}
                className="p-2 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-white/70">
                      Cabina: {c.cabina || "—"} • Quota condivisa: {c.quota_condivisa}% • Split: {c.split?.produttore}%/{c.split?.cer}%
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        const res = await copyToClipboard(c.id);
                        if (res.ok) alert("ID CER copiato");
                      }}
                    >
                      ID
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => store.del("cers", c.id)}
                    >
                      Elimina
                    </Button>
                  </div>
                </div>
                <div className="mt-2 text-xs text-white/80">
                  <div>
                    Membri: {(c.memberIds || [])
                      .map((id) => store.one("clients", id)?.name)
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </div>
                  <div>
                    Impianti: {(c.plantIds || [])
                      .map((id) => store.one("plants", id)?.name)
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </div>
                </div>
              </li>
            ))}
            {items.length === 0 && (
              <li className="text-white/60 text-sm">Nessuna CER</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}

// --- CEC
function CEC({ q }) {
  const store = useStore();
  const clients = store.all("clients");
  const [f, setF] = useState({ name: "", scope: "Cittadina (Art. 2(16) RED II)" });
  const items = store
    .all("cecs")
    .filter((c) => c.name.toLowerCase().includes(q.toLowerCase()));
  const [memberId, setMemberId] = useState("");
  const [cecId, setCecId] = useState("");

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card title="Nuova CEC">
        <div className="grid gap-3">
          <Input
            label="Nome"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
          <Input
            label="Ambito"
            value={f.scope}
            onChange={(e) => setF({ ...f, scope: e.target.value })}
          />
          <div className="flex justify-end">
            <Button
              onClick={() => {
                if (!f.name) return alert("Nome obbligatorio");
                store.add("cecs", {
                  id: uid("cec"),
                  name: f.name,
                  scope: f.scope,
                  memberIds: [],
                });
                setF({ name: "", scope: "Cittadina (Art. 2(16) RED II)" });
              }}
            >
              Crea
            </Button>
          </div>
        </div>
      </Card>
      <Card title="Aggiungi membro">
        <div className="grid gap-3">
          <Select
            label="CEC"
            value={cecId}
            onChange={setCecId}
            options={items.map((x) => ({ value: x.id, label: x.name }))}
          />
          <Select
            label="Cliente"
            value={memberId}
            onChange={setMemberId}
            options={clients.map((c) => ({ value: c.id, label: c.name }))}
          />
          <div className="flex justify-end">
            <Button
              onClick={() => {
                if (!cecId || !memberId) return;
                const cec = store.one("cecs", cecId);
                store.upd("cecs", cecId, {
                  memberIds: Array.from(
                    new Set([...(cec.memberIds || []), memberId])
                  ),
                });
              }}
            >
              Aggiungi
            </Button>
          </div>
        </div>
      </Card>
      <div>
        <Card title="Elenco CEC">
          <ul className="space-y-2">
            {items.map((c) => (
              <li
                key={c.id}
                className="p-2 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{c.name}</div>
                    <div className="text-xs text-white/70">Ambito: {c.scope}</div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        const res = await copyToClipboard(c.id);
                        if (res.ok) alert("ID CEC copiato");
                      }}
                    >
                      ID
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => store.del("cecs", c.id)}
                    >
                      Elimina
                    </Button>
                  </div>
                </div>
                <div className="mt-2 text-xs">
                  Membri: {(c.memberIds || [])
                    .map((id) => store.one("clients", id)?.name)
                    .filter(Boolean)
                    .join(", ") || "—"}
                </div>
              </li>
            ))}
            {items.length === 0 && (
              <li className="text-white/60 text-sm">Nessuna CEC</li>
            )}
          </ul>
        </Card>
      </div>
    </div>
  );
}

// --- Conto Termico 3.0
function CT3({ q }) {
  const store = useStore();
  const [f, setF] = useState({ beneficiario: "", misura: "Pompa di calore", potenza: 10 });
  const items = store
    .all("ct3")
    .filter((r) => r.beneficiario.toLowerCase().includes(q.toLowerCase()));

  const incentivo = ct3Calcolo(f.misura, Number(f.potenza));

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card title="Nuova pratica CT3.0">
        <div className="grid gap-3">
          <Input
            label="Beneficiario"
            value={f.beneficiario}
            onChange={(e) => setF({ ...f, beneficiario: e.target.value })}
          />
          <Select
            label="Misura"
            value={f.misura}
            onChange={(v) => setF({ ...f, misura: v })}
            options={["Pompa di calore", "Solare termico", "Caldaia biomassa"].map((x) => ({
              value: x,
              label: x,
            }))}
          />
          <Input
            label="Potenza (kW)"
            type="number"
            value={f.potenza}
            onChange={(e) => setF({ ...f, potenza: e.target.value })}
          />
          <div className="rounded-xl bg-black/20 p-3 text-xs border border-white/10">
            <div className="font-semibold mb-1">Incentivo stimato</div>
            <div>€ {incentivo.toLocaleString()}</div>
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => {
                if (!f.beneficiario) return alert("Beneficiario obbligatorio");
                store.add("ct3", {
                  id: uid("ct3"),
                  beneficiario: f.beneficiario,
                  misura: f.misura,
                  potenza_kW: Number(f.potenza),
                  incentivo_stimato: incentivo,
                });
                setF({ beneficiario: "", misura: "Pompa di calore", potenza: 10 });
              }}
            >
              Salva pratica
            </Button>
          </div>
        </div>
      </Card>
      <div className="md:col-span-2">
        <Card title={`Pratiche CT3 (${items.length})`}>
          <table className="w-full text-sm">
            <thead className="text-white/60">
              <tr>
                <th className="text-left py-2">Beneficiario</th>
                <th>Misura</th>
                <th>Potenza</th>
                <th>Incentivo</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((x) => (
                <tr key={x.id} className="border-t border-white/10">
                  <td className="py-2">{x.beneficiario}</td>
                  <td className="text-center">{x.misura}</td>
                  <td className="text-center">{x.potenza_kW} kW</td>
                  <td className="text-right">€ {x.incentivo_stimato.toLocaleString()}</td>
                  <td className="text-right">
                    <Button variant="danger" onClick={() => store.del("ct3", x.id)}>
                      Elimina
                    </Button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td colSpan="5" className="py-6 text-center text-white/60">
                    Nessuna pratica
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  );
}

function ct3Calcolo(misura, potenza) {
  // Semplice modello di stima (placeholder, non uso normativo):
  const base =
    misura === "Pompa di calore"
      ? 220
      : misura === "Solare termico"
      ? 180
      : 200; // €/kW
  return Math.round(base * Math.max(1, potenza));
}

// --- Ristrutturazioni Condominiali
function Ristrutturazioni({ q }) {
  const store = useStore();
  const [f, setF] = useState({
    name: "",
    address: "",
    admin: "",
    technician: "",
    subcontractor: "",
  });
  const items = store
    .all("projects")
    .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card title="Nuovo progetto">
        <div className="grid gap-3">
          <Input
            label="Condominio"
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
          <Input
            label="Indirizzo"
            value={f.address}
            onChange={(e) => setF({ ...f, address: e.target.value })}
          />
          <Input
            label="Amministratore"
            value={f.admin}
            onChange={(e) => setF({ ...f, admin: e.target.value })}
          />
          <Input
            label="Tecnico progettista"
            value={f.technician}
            onChange={(e) => setF({ ...f, technician: e.target.value })}
          />
          <Input
            label="Subappaltatore"
            value={f.subcontractor}
            onChange={(e) => setF({ ...f, subcontractor: e.target.value })}
          />
          <div className="flex justify-end">
            <Button
              onClick={() => {
                if (!f.name) return alert("Nome condominio obbligatorio");
                store.add("projects", {
                  id: uid("prj"),
                  name: f.name,
                  address: f.address,
                  admins: f.admin ? [f.admin] : [],
                  technicians: f.technician ? [f.technician] : [],
                  subcontractors: f.subcontractor ? [f.subcontractor] : [],
                  status: "Analisi",
                  linkedPlantIds: [],
                });
                setF({
                  name: "",
                  address: "",
                  admin: "",
                  technician: "",
                  subcontractor: "",
                });
              }}
            >
              Crea progetto
            </Button>
          </div>
        </div>
      </Card>
      <div className="md:col-span-2">
        <Card title={`Progetti (${items.length})`}>
          <ul className="space-y-2">
            {items.map((p) => (
              <li
                key={p.id}
                className="p-2 rounded-lg bg-white/5 border border-white/10"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-xs text-white/70">{p.address}</div>
                    <div className="text-xs">
                      Admin: {p.admins.join(", ") || "—"} • Tecnici: {p.technicians.join(", ") || "—"} • Subapp.: {p.subcontractors.join(", ") || "—"}
                    </div>
                    <div className="text-xs">
                      Impianti collegati: {p.linkedPlantIds
                        .map((id) => store.one("plants", id)?.name)
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      onClick={async () => {
                        const res = await copyToClipboard(p.id);
                        if (res.ok) alert("ID progetto copiato");
                      }}
                    >
                      ID
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => store.del("projects", p.id)}
                    >
                      Elimina
                    </Button>
                  </div>
                </div>
              </li>
            ))}
            {items.length === 0 && (
              <li className="text-white/60">Nessun progetto</li>
            )}
          </ul>
        </Card>
      </div>
      <ProjectLinker />
    </div>
  );
}

function ProjectLinker() {
  const store = useStore();
  const projects = store.all("projects");
  const plants = store.all("plants");
  const [pId, setPId] = useState("");
  const [plId, setPlId] = useState("");
  return (
    <div className="md:col-span-3">
      <Card title="Collega impianto a progetto condominiale">
        <div className="grid md:grid-cols-4 gap-3 items-end">
          <Select
            label="Progetto"
            value={pId}
            onChange={setPId}
            options={projects.map((p) => ({ value: p.id, label: p.name }))}
          />
          <Select
            label="Impianto"
            value={plId}
            onChange={setPlId}
            options={plants.map((p) => ({ value: p.id, label: `${p.name} (${p.kwp} kWp)` }))}
          />
          <div className="md:col-span-2 flex justify-end">
            <Button
              onClick={() => {
                if (!pId || !plId) return;
                const proj = store.one("projects", pId);
                store.upd("projects", pId, {
                  linkedPlantIds: Array.from(
                    new Set([...(proj.linkedPlantIds || []), plId])
                  ),
                });
                alert("Impianto collegato al progetto");
              }}
            >
              Collega
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

// --- Documenti & GSE (mock template + merge placeholders)
function DocumentiGSE({ q }) {
  const store = useStore();
  const cers = store.all("cers");
  const items = store
    .all("docs")
    .filter((d) =>
      (store.one("cers", d.cerId)?.name || "")
        .toLowerCase()
        .includes(q.toLowerCase())
    );
  const [f, setF] = useState({
    cerId: "",
    type: "statuto",
    template:
      "{{cer.name}} — Statuto tipo\nCabina: {{cer.cabina}}\nQuota: {{cer.quota}}%\nSplit: {{cer.split_prod}}/{{cer.split_cer}}%",
    placeholders: "",
  });

  const gen = () => {
    if (!f.cerId) return alert("Seleziona una CER");
    const cer = store.one("cers", f.cerId);
    const ph = {
      "{{cer.name}}": cer.name,
      "{{cer.cabina}}": cer.cabina || "—",
      "{{cer.quota}}": cer.quota_condivisa,
      "{{cer.split_prod}}": cer.split?.produttore,
      "{{cer.split_cer}}": cer.split?.cer,
    };
    let out = f.template;
    Object.entries(ph).forEach(([k, v]) => {
      out = out.split(k).join(String(v));
    });
    const id = uid("doc");
    store.add("docs", {
      id,
      type: f.type,
      cerId: f.cerId,
      template: out,
      generatedAt: new Date().toISOString(),
      placeholders: ph,
    });
    alert("Documento generato (mock)");
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card title="Genera documento (mock)">
        <div className="grid gap-3">
          <Select
            label="CER"
            value={f.cerId}
            onChange={(v) => setF({ ...f, cerId: v })}
            options={cers.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Select
            label="Tipo"
            value={f.type}
            onChange={(v) => setF({ ...f, type: v })}
            options={["atto", "statuto", "regolamento"].map((x) => ({
              value: x,
              label: x,
            }))}
          />
          <label className="grid gap-1">
            <span className="text-xs text-white/70">Template</span>
            <textarea
              className="rounded-xl bg-white/5 text-white border border-white/10 p-2 font-mono text-xs h-36"
              value={f.template}
              onChange={(e) => setF({ ...f, template: e.target.value })}
            />
          </label>
          <div className="flex justify-end">
            <Button onClick={gen}>Genera</Button>
          </div>
        </div>
      </Card>
      <Card title={`Documenti generati (${items.length})`}>
        <ul className="space-y-2">
          {items.map((d) => (
            <li
              key={d.id}
              className="p-2 rounded-lg bg-white/5 border border-white/10"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-semibold capitalize">{d.type}</div>
                  <div className="text-xs text-white/70">
                    CER: {store.one("cers", d.cerId)?.name} •
                    {" "}
                    {new Date(d.generatedAt).toLocaleString()}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    onClick={async () => {
                      const res = await copyToClipboard(d.id);
                      if (res.ok) alert("ID documento copiato");
                    }}
                  >
                    ID
                  </Button>
                  <Button
                    variant="danger"
                    onClick={() => store.del("docs", d.id)}
                  >
                    Elimina
                  </Button>
                </div>
              </div>
              <pre className="mt-2 text-xs whitespace-pre-wrap">{d.template}</pre>
            </li>
          ))}
          {items.length === 0 && (
            <li className="text-white/60">Nessun documento</li>
          )}
        </ul>
      </Card>
    </div>
  );
}

// --- Simulatore multi-sezione (PV + CER + CT3 + semplice ammortamento)
function Simulatore() {
  const store = useStore();
  const [inp, setInp] = useState({
    kwp: 50,
    capex_kwp: 1000,
    opex_kwp: 25,
    prod_kwp: 1250,
    aut: 0.4,
    pun: 0.18,
    cer_fee: 0.15,
    anni: 10,
    tasso: 0.05,
    ct3_misura: "Pompa di calore",
    ct3_potenza: 10,
  });
  const capex = inp.kwp * inp.capex_kwp;
  const opex = inp.kwp * inp.opex_kwp;
  const kwh = inp.kwp * inp.prod_kwp;
  const risparmio = kwh * inp.aut * inp.pun;
  const ricavoCER = kwh * (1 - inp.aut) * 0.11; // placeholder incentivo condiviso €/kWh
  const feeCER = ricavoCER * inp.cer_fee;
  const ct3 = ct3Calcolo(inp.ct3_misura, inp.ct3_potenza);
  const cashAnn = risparmio + ricavoCER - feeCER - opex;
  const npv =
    Array.from({ length: inp.anni }, (_, i) =>
      cashAnn / Math.pow(1 + inp.tasso, i + 1)
    ).reduce((a, b) => a + b, 0) -
    capex +
    ct3;
  const payback = cashAnn > 0 ? (capex - ct3) / cashAnn : Infinity;

  return (
    <div className="grid md:grid-cols-3 gap-4">
      <Card title="Input">
        <div className="grid gap-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="kWp"
              type="number"
              value={inp.kwp}
              onChange={(e) => setInp({ ...inp, kwp: Number(e.target.value) })}
            />
            <Input
              label="CAPEX €/kWp"
              type="number"
              value={inp.capex_kwp}
              onChange={(e) =>
                setInp({ ...inp, capex_kwp: Number(e.target.value) })
              }
            />
            <Input
              label="OPEX €/kWp/a"
              type="number"
              value={inp.opex_kwp}
              onChange={(e) =>
                setInp({ ...inp, opex_kwp: Number(e.target.value) })
              }
            />
            <Input
              label="Produzione kWh/kWp"
              type="number"
              value={inp.prod_kwp}
              onChange={(e) =>
                setInp({ ...inp, prod_kwp: Number(e.target.value) })
              }
            />
            <Input
              label="Autoconsumo (0-1)"
              type="number"
              value={inp.aut}
              onChange={(e) => setInp({ ...inp, aut: Number(e.target.value) })}
            />
            <Input
              label="PUN €/kWh"
              type="number"
              value={inp.pun}
              onChange={(e) => setInp({ ...inp, pun: Number(e.target.value) })}
            />
            <Input
              label="Fee CER (0-1)"
              type="number"
              value={inp.cer_fee}
              onChange={(e) =>
                setInp({ ...inp, cer_fee: Number(e.target.value) })
              }
            />
            <Input
              label="Anni"
              type="number"
              value={inp.anni}
              onChange={(e) => setInp({ ...inp, anni: Number(e.target.value) })}
            />
            <Input
              label="Tasso sconto"
              type="number"
              value={inp.tasso}
              onChange={(e) => setInp({ ...inp, tasso: Number(e.target.value) })}
            />
          </div>
          <Select
            label="CT3 misura"
            value={inp.ct3_misura}
            onChange={(v) => setInp({ ...inp, ct3_misura: v })}
            options={["Pompa di calore", "Solare termico", "Caldaia biomassa"].map((x) => ({
              value: x,
              label: x,
            }))}
          />
          <Input
            label="CT3 potenza (kW)"
            type="number"
            value={inp.ct3_potenza}
            onChange={(e) =>
              setInp({ ...inp, ct3_potenza: Number(e.target.value) })
            }
          />
        </div>
      </Card>
      <Card title="Risultati (stima)">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>CAPEX</div>
          <div className="text-right">€ {capex.toLocaleString()}</div>
          <div>OPEX annuo</div>
          <div className="text-right">€ {opex.toLocaleString()}</div>
          <div>Produzione annua</div>
          <div className="text-right">{kwh.toLocaleString()} kWh</div>
          <div>Risparmio annuo</div>
          <div className="text-right">€ {risparmio.toFixed(0)}</div>
          <div>Ricavo CER</div>
          <div className="text-right">€ {ricavoCER.toFixed(0)}</div>
          <div>Fee CER</div>
          <div className="text-right">€ {feeCER.toFixed(0)}</div>
          <div>CT3 incentivo</div>
          <div className="text-right">€ {ct3.toLocaleString()}</div>
          <div>Cashflow annuo</div>
          <div className="text-right">€ {cashAnn.toFixed(0)}</div>
          <div>NPV</div>
          <div className="text-right">€ {npv.toFixed(0)}</div>
          <div>Payback</div>
          <div className="text-right">
            {payback === Infinity ? "—" : `${payback.toFixed(1)} anni`}
          </div>
        </div>
      </Card>
      <Card title="Crea Preventivo (quote)">
        <div className="grid gap-3">
          <Button
            onClick={() => {
              const q = {
                id: uid("q"),
                type: "PV",
                amount: capex,
                currency: "EUR",
                linked: {},
              };
              const clients = store.all("clients");
              if (clients[0]) q.linked.clientId = clients[0].id;
              store.add("quotes", q);
              alert("Preventivo creato e salvato");
            }}
          >
            Salva preventivo
          </Button>
          <div className="text-xs text-white/70">
            Il preventivo collega il primo cliente disponibile (se presente).
            Gestione avanzata disponibile nel CRM.
          </div>
        </div>
      </Card>
    </div>
  );
}

export default App;
