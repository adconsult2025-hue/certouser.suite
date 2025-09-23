import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';

import Hub from './pages/Hub';
import CRM from './pages/CRM';
import CER from './pages/CER';
import Termo from './pages/Termo';
import Contratti from './pages/Contratti';
import SuperAdmin from './pages/SuperAdmin';
import './styles.css';

declare global {
  interface Window { netlifyIdentity?: any }
}

export default function App() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const ni = window.netlifyIdentity;
    if (!ni) return;
    ni.on('init', (u: any) => setUser(u));
    ni.on('login', (u: any) => { setUser(u); window.location.reload(); });
    ni.on('logout', () => { setUser(null); window.location.reload(); });
    ni.init();
    return () => {
      ni.off && ni.off('init');
      ni.off && ni.off('login');
      ni.off && ni.off('logout');
    };
  }, []);

  const openLogin = () => window.netlifyIdentity?.open('login');
  const logout    = () => window.netlifyIdentity?.logout();

  const email = user?.email || user?.user_metadata?.email || '';
  // ruoli opzionali (se li usi in Identity → app_metadata.roles)
  const roles: string[] =
    (user?.app_metadata?.roles ?? user?.roles ?? []);
  const isSuperAdmin = roles.includes('SuperAdmin');

  return (
    <BrowserRouter>
      <div className="app-shell">
        <nav className="nav">
          <div className="brand">CER to USER —

      </div>
    )
  }

  return (
    <div className="container">
      <header>
        <img className="logo" src="/logo.png" alt="CER to USER" />
        <h1>Benvenuto, {user.user_metadata?.full_name || user.email}</h1>
      </header>

      <div className="card">
        <p>🌱 Dashboard iniziale (placeholder).</p>
      </div>

      <p><button onClick={() => window.netlifyIdentity.logout()}>Esci</button></p>
    </div>
  )
}
