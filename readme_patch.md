# Patch: Document Builder in Suite (riparti in cer.riparti)

## Cosa fa
- Endpoint `contract-data` per estrarre **nome CER, cabina, POD, membri, riparti (json in cer.riparti)**.
- Pagina `web/cer_document_builder.html` che fa **merge Mustache** → anteprima → **stampa PDF** o **salva in suite**.
- Function `save-doc` salva il testo generato in **Postgres** (tabella `cer_docs`).

## File principali
- `netlify/functions/contract-data.js`
- `netlify/functions/save-doc.js`
- `web/cer_document_builder.html`
- `web/templates/*.mustache` (token: `{{cer.nome}}`, `{{cer.cabina}}`, `{{pod_univoco}}`, `{{#membri}}...{{/membri}}`, `{{riparti.producer}}` etc.)
- `netlify.toml` (imposta cartella funzioni)

## Come usare
1. Deploya la patch nella root del sito.
2. Imposta ENV `NEON_DATABASE_URL` su Netlify.
3. Vai alla scheda CER e linka `web/cer_document_builder.html?cer_id=<UUID>`
4. Scegli il **documento**, clicca **Genera Anteprima**, poi **Stampa/Salva PDF** o **Salva in Suite**.

## Note
- I modelli restano **conformi**: questa patch aggiunge solo i **segnaposto** e l’estrazione dati.
- In seguito possiamo sostituire il salvataggio testo con **PDF** o **DOCX** (serverless) se richiesto.
