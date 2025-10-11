(()=>{
  const $ = (s,el=document)=>el.querySelector(s);
  const $$ = (s,el=document)=>Array.from(el.querySelectorAll(s));
  const store = {
    get(){ try{ return JSON.parse(localStorage.getItem('crm.clients')||'[]'); }catch{ return []; } },
    set(v){ localStorage.setItem('crm.clients', JSON.stringify(v)); }
  };

  const stepsTemplate = [
    {id:'id_doc', title:'Documento identitÃ  + privacy', done:false},
    {id:'pod_bill', title:'Ultima bolletta con POD', done:false},
    {id:'consents', title:'Consensi trattamento & deleghe', done:false}
  ];

  const tblBody = $('#tbl-clients tbody');
  const search = $('#search');
  const btnAdd = $('#btn-add');
  const panel = $('#client-panel');
  const empty = $('#client-empty');
  const kpiName = $('#kpi-name');
  const kpiType = $('#kpi-type');
  const kpiPod = $('#kpi-pod');
  const btnMail = $('#btn-mail');
  const btnWa = $('#btn-wa');
  const stepsBox = $('#doc-steps');

  let clients = store.get();
  let active = null;

  function save(){ store.set(clients); render(); if(active) select(active.id); }
  function render(){
    const q = (search.value||'').toLowerCase();
    tblBody.innerHTML = '';
    clients
      .filter(c => !q || (c.name+c.type+c.pod).toLowerCase().includes(q))
      .forEach(c=>{
        const tr = document.createElement('tr');
        tr.innerHTML = `<td>${c.name}</td><td>${c.type||''}</td><td>${c.pod||''}</td><td>${c.cabina||''}</td>
                        <td><button class="btn small" data-id="${c.id}">Apri</button></td>`;
        tblBody.appendChild(tr);
      });
  }

  function select(id){
    const c = clients.find(x=>x.id===id);
    active = c;
    if(!c){ panel.style.display='none'; empty.style.display='block'; return; }
    empty.style.display='none'; panel.style.display='block';
    kpiName.textContent = c.name;
    kpiType.textContent = c.type||'-';
    kpiPod.textContent = c.pod||'-';
    btnMail.href = c.email ? `mailto:${c.email}` : '#';
    const waNum = c.phone ? c.phone.replace(/\D/g,'') : '';
    btnWa.href = waNum ? `https://wa.me/${waNum}` : '#';

    stepsBox.innerHTML='';
    (c.steps||stepsTemplate.map(s=>({...s}))).forEach((s,i)=>{
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = \`
        <div>
          <div><strong>\${i+1}.</strong> \${s.title}</div>
          <div class="small">\${s.done?'Completato':'Da fare'}</div>
        </div>
        <div>
          <label class="small">Completato <input type="checkbox" \${s.done?'checked':''}></label>
        </div>\`;
      const cb = row.querySelector('input[type="checkbox"]');
      cb.addEventListener('change',()=>{
        s.done = cb.checked;
        c.steps = (c.steps||stepsTemplate.map(s=>({...s})));
        c.steps[i].done = s.done;
        save();
      });
      stepsBox.appendChild(row);
    });
  }

  tblBody.addEventListener('click', (e)=>{
    const b = e.target.closest('button[data-id]');
    if(!b) return;
    select(b.getAttribute('data-id'));
  });

  btnAdd.addEventListener('click', ()=>{
    const name = prompt('Nome cliente?');
    if(!name) return;
    const pod = prompt('POD (obbligatorio: 1 POD = 1 cliente)')||'';
    const type = prompt('Tipo (Privato/P.IVA)?')||'Privato';
    const email = prompt('Email (opz.)')||'';
    const phone = prompt('Telefono (opz.)')||'';
    const cabina = prompt('Cabina primaria (es. FR001) (opz.)')||'';
    clients.push({id: crypto.randomUUID(), name, pod, type, email, phone, cabina, steps: stepsTemplate.map(s=>({...s}))});
    save();
  });

  search.addEventListener('input', render);

  // Seed if empty for demo
  if(clients.length===0){
    clients = [
      {id: crypto.randomUUID(), name:'Mario Rossi', type:'Privato', pod:'IT001E1234567890', cabina:'FR001', email:'mario@example.com', phone:'+39 3331234567', steps: stepsTemplate.map((s,i)=>({...s, done:i===0}))},
      {id: crypto.randomUUID(), name:'Alfa Srl', type:'P.IVA', pod:'IT001E0987654321', cabina:'FR002', email:'contatti@alfa.it', phone:'+39 06 5551234', steps: stepsTemplate.map(s=>({...s}))}
    ];
    save();
  } else {
    render();
  }
})();
