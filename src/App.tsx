import { useEffect, useState } from 'react'

declare global { interface Window { netlifyIdentity?: any } }

export default function App() {
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    const ni = window.netlifyIdentity
    if (!ni) return
    ni.on('init', (u: any) => setUser(u))
    ni.on('login', (u: any) => { setUser(u); window.location.reload() })
    ni.on('logout', () => { setUser(null); window.location.reload() })
    ni.init()
  }, [])

  if (!user) {
    return (
      <div className="container">
        <header>
          <img className="logo" src="/logo.png" alt="CER to USER" />
          <h1>CER to USER — Suite</h1>
        </header>
        <p>Accedi per usare la piattaforma.</p>
        <button onClick={() => window.netlifyIdentity.open('login')}>
          Accedi con Netlify Identity
        </button>
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