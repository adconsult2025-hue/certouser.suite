import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';

import Hub from './pages/Hub';
import CRM from './pages/CRM';
// ...
<Routes>
  {/* altre rotte */}
  <Route path="/crm" element={<CRM/>} />
</Routes>

import CER from './pages/CER';
import Termo from './pages/Termo';
import Contratti from './pages/Contratti';
import SuperAdmin from './pages/SuperAdmin';
import './styles.css';

declare global {
  interface Window {
    netlifyIdentity?: any;
  }
}

function useIdentity() {
  const [user, setUser] = useState<any>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const init = () => {
      const ni = window.netlifyIdentity;
      if (!ni) return;
      const onInit = (u: any) => { setUser(u); setReady(true); };
      const onLogin = (u: any) => { setUser(u); window.location.reload(); };
      const onLogout = () => { setUser(null); window.location.reload(); };

      ni.on('init', onInit);
      ni.on('login', onLogin);
      ni.on('logout', onLogout);
      ni.init();

      return () => {
        ni.off && ni.off('init', onInit);
        ni.off && ni.off('login', onLogin);
        ni.off && ni.off('logout', onLogout);
      };
    };

    if (window.netlifyIdentity) {
      const cleanup = init();
      return cleanup;
    } else {
      // Fallback: inietta lo script se non è presente per qualunque ragione
      const s = document.createElement('script');
      s.src = 'https://identity.netlify.com/v1/netlify-identity-widget.js';
      s.defer = true;
      s.onload = () => init();
      document.body.appendChild(s);
    }
  }, []);

  return { user, ready };
}

export default function App() {
  const { user } = useIdentity();

  const openLogin = () => window.netlifyIdentity?.open('login');
  const logout    = () => window.netlifyIdentity?.logout();

  const email = user?.email || user?.user_metadata?.email || '';
  const roles: string[] = user?.app_metadata?.roles ?? user?.roles ?? [];
  const isSuperAdmin = roles.includes('SuperAdmin');

  return (
    <BrowserRouter>
      <div className="app-shell">
        <nav className="nav">
          <div className="brand">CER to USER — Suite</div>
          <ul className="menu">
            <li><Link to="/">Hub</Link></li>
            <li><Link to="/crm">CRM</Link></li>
            <li><Link to="/cer">CER</Link></li>
            <li><Link to="/termo">Termo</Link></li>
            <li><Link to="/contratti">Contratti</Link></li>
            <li><Link to="/superadmin">SuperAdmin</Link></li>
          </ul>
          <div className="auth">
            {user ? (
              <>
                <span className="user">👤 {email || 'utente'}</span>
                <button onClick={logout}>Esci</button>
              </>
            ) : (
              <button onClick={openLogin}>Accedi</button>
            )}
          </div>
        </nav>

        {/* Banner informativo: da anonimo puoi navigare, ma alcune azioni potrebbero richiedere login */}
        {!user && (
          <div className="alert" style={{margin:'12px 18px 0'}}>
            Stai navigando in modalità ospite. Accedi per usare tutte le funzioni.
          </div>
        )}

        <main className="content">
          <Routes>
            <Route path="/" element={<Hub />} />
            <Route path="/crm" element={<CRM />} />
            <Route path="/cer" element={<CER />} />
            <Route path="/termo" element={<Termo />} />
            <Route path="/contratti" element={<Contratti />} />
            {/* SuperAdmin lo mostriamo ma dentro la pagina puoi verificare il ruolo se serve */}
            <Route path="/superadmin" element={<SuperAdmin />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

