import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';

import Hub from './pages/Hub';
import CRM from './pages/CRM';
import CER from './pages/CER';
import Termo from './pages/Termo';
import Contratti from './pages/Contratti';
import SuperAdmin from './pages/SuperAdmin';
import './styles.css';

declare global { interface Window { netlifyIdentity?: any } }

export default function App() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const ni = window.netlifyIdentity;
    if (!ni) return;

    const onInit = (u: any) => setUser(u);
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
  }, []);

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

        <main className="content">
          <Routes>
            <Route path="/" element={<Hub />} />
            <Route path="/crm" element={user ? <CRM /> : <Navigate to="/" replace />} />
            <Route path="/cer" element={user ? <CER /> : <Navigate to="/" replace />} />
            <Route path="/termo" element={user ? <Termo /> : <Navigate to="/" replace />} />
            <Route path="/contratti" element={user ? <Contratti /> : <Navigate to="/" replace />} />
            <Route
              path="/superadmin"
              element={user && isSuperAdmin ? <SuperAdmin /> : <Navigate to="/" replace />}
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
