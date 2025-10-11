(function(){
  const \$ = (s)=>document.querySelector(s);
  const modelEl = \#model;
  const btn = \#btn-genera;
  const nameEl = \#p_name;
  const taxEl = \#p_tax;
  const cabEl = \#cabina;
  const result = \#gen-result;
  const uploads = \#uploads;
  const fileInput = \#fileInput;

  // Demo: genera un TXT scaricabile (in attesa delle Functions che produrranno DOCX)
  btn?.addEventListener("click", async ()=>{
    const data = {
      MODEL: modelEl.value,
      NAME: nameEl.value || "N/D",
      TAX:  taxEl.value || "N/D",
      CAB:  cabEl.value || "N/D",
    };
    const text =
MODELLO: \
INTESTATARIO: \
CF/PIVA: \
CABINA PRIMARIA: \

[NOTE] ModalitÃ  statica: file di testo dimostrativo.
Con le Netlify Functions genereremo un DOCX compilato.;
    const blob = new Blob([text], {type:"text/plain"});
    const url = URL.createObjectURL(blob);
    result.innerHTML = <p>Documento generato: <a href="\" download="documento_compilato.txt">scarica</a></p>;
  });

  // Demo: lista allegati caricati (non persiste)
  fileInput?.addEventListener("change", (e)=>{
    const files = Array.from(e.target.files||[]);
    files.forEach(f=>{
      const li = document.createElement("li");
      li.textContent = \ (\ KB);
      uploads.appendChild(li);
    });
  });

  // Hardening: se c'Ã¨ un link "Contratti" che punta a CER, correggilo
  document.querySelectorAll('a').forEach(a=>{
    const t = (a.textContent||"").toLowerCase();
    if (t.includes("contratt") && !a.href.endsWith("/contratti.html")) {
      a.href = "/contratti.html";
    }
  });
})();