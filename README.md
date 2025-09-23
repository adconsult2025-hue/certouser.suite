# CERtoUSER Suite — Starter

## Prerequisiti
- Repo collegato a Netlify
- Variabile ambiente **NEON_DATABASE_URL** impostata su Netlify → Site settings → Build & deploy → Environment
  - Formato: `postgres://USER:PASSWORD@HOST/db?sslmode=require`

## Build/Deploy
- `npm run build` (Vite)
- Pubblica `dist/` (già nel `netlify.toml`)
- SPA redirects già configurati (sia in `netlify.toml` sia `public/_redirects`)

## API Serverless (Netlify Functions)
- `/.netlify/functions/db-init` → crea tabelle se mancanti
- `/.netlify/functions/customers-list`
- `/.netlify/functions/customers-create` (POST)
- `/.netlify/functions/cer-list`
- `/.netlify/functions/cer-create` (POST)

## Frontend
- Pagine:
  - **CRM**: crea/lista clienti
  - **CER**: crea/lista CER con riparti base
- Router: React Router v6
- Identity: widget incluso in `index.html` (attiva Netlify Identity se necessario)

## Note
- Gli ID sono generati lato server con `crypto.randomUUID()`
- Gli upload, i ruoli avanzati, e la generazione documenti sono da implementare nei prossimi step.
