(()=>{
  const $ = (s,el=document)=>el.querySelector(s);
  const listEl = $('#cer-list');
  const stepsEl = $('#cer-steps');
  const membersEl = $('#members');
  const uploadList = $('#upload-list');

  const store = {
    get(){ try{ return JSON.parse(localStorage.getItem('cer.items')||'[]'); }catch{ return []; } },
    set(v){ localStorage.setItem('cer.items', JSON.stringify(v)); },
    getUploads(){ try{ return JSON.parse(localStorage.getItem('cer.uploads')||'[]'); }catch{ return []; } },
    setUploads(v){ localStorage.setItem('cer.uploads', JSON.stringify(v)); },
  };

  let items = store.get();
  let activeId = null;

  const defaultSteps = [
    {id:'regolamento', title:'Regolamento CER firmato', done:false},
    {id:'adesioni', title:'Adesioni membri firmate', done:false},
    {id:'trader', title:'Contratto cessione eccedenze', done:false}
  ];

  function renderList(){
    listEl.innerHTML = '';
    items.forEach(c=>{
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = \`
        <div>
          <div><strong>\${c.name}</strong> <span class="badge">\${c.cabina||'-'}</span></div>
          <div class="small">Riparto: P \${c.rip?.prod||0}% / Pros \${c.rip?.pros||0}% / CTU \${c.rip?.ctu||0}%</div>
        </div>
        <div><button class="btn small" data-id="\${c.id}">Apri</button></div>\`;
      row.querySelector('button').addEventListener('click', ()=> openCer(c.id));
      listEl.appendChild(row);
    });
  }

  function save(){ store.set(items); renderList(); if(activeId) openCer(activeId); }

  function openCer(id){
    activeId = id;
    const c = items.find(x=>x.id===id);
    if(!c) return;
    $('#cer-name').value = c.name;
    $('#cer-cabina').value = c.cabina||'';
    $('#cer-trader').value = c.trader||'';
    $('#rip-prod').value = c.rip?.prod ?? 0;
    $('#rip-pros').value = c.rip?.pros ?? 0;
    $('#rip-ctu').value  = c.rip?.ctu  ?? 0;

    stepsEl.innerHTML='';
    (c.steps||defaultSteps.map(s=>({...s}))).forEach((s,i)=>{
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = \`
        <div>
          <div><strong>\${i+1}.</strong> \${s.title}</div>
          <div class="progress"><span style="width:\${s.done?100:0}%"></span></div>
        </div>
        <div>
          <label class="small">Completato <input type="checkbox" \${s.done?'checked':''}></label>
        </div>\`;
      const cb = row.querySelector('input');
      cb.addEventListener('change',()=>{
        s.done = cb.checked;
        c.steps = (c.steps||defaultSteps.map(s=>({...s})));
        c.steps[i].done = s.done;
        save();
      });
      stepsEl.appendChild(row);
    });

    // Members
    membersEl.innerHTML='';
    (c.members||[]).forEach(m=>{
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = \`
        <div><strong>\${m.name}</strong> <span class="badge">\${m.role}</span> <span class="small">\${m.pod}</span></div>
        <div></div>\`;
      membersEl.appendChild(row);
    });

    // Uploads list (by CER id)
    uploadList.innerHTML = '';
    const uploads = store.getUploads().filter(u=>u.cerId===id);
    uploads.forEach(u=>{
      const row = document.createElement('div');
      row.className = 'item-row';
      row.innerHTML = \`<div>\${u.name}</div><div class="small">\${u.size} bytes</div>\`;
      uploadList.appendChild(row);
    });
  }

  $('#btn-save-cer').addEventListener('click', ()=>{
    const name = $('#cer-name').value.trim();
    if(!name){ alert('Nome CER obbligatorio'); return; }
    const cabina = $('#cer-cabina').value.trim();
    const trader = $('#cer-trader').value;
    const rip = { prod: Number($('#rip-prod').value||0), pros: Number($('#rip-pros').value||0), ctu: Number($('#rip-ctu').value||0) };
    if(rip.prod + rip.pros + rip.ctu !== 100){
      if(!confirm('Le percentuali non sommano 100%. Vuoi salvare comunque?')) return;
    }
    if(activeId){
      const c = items.find(x=>x.id===activeId);
      Object.assign(c, {name, cabina, trader, rip});
    } else {
      items.push({id: crypto.randomUUID(), name, cabina, trader, rip, steps: defaultSteps.map(s=>({...s})), members: []});
      activeId = items[items.length-1].id;
    }
    save();
  });

  $('#btn-new-cer').addEventListener('click', ()=>{
    activeId = null;
    $('#cer-name').value='';
    $('#cer-cabina').value='';
    $('#cer-trader').value='';
    $('#rip-prod').value=55;
    $('#rip-pros').value=30;
    $('#rip-ctu').value=15;
  });

  $('#btn-add-member').addEventListener('click', ()=>{
    if(!activeId){ alert('Seleziona una CER'); return; }
    const c = items.find(x=>x.id===activeId);
    const m = {name: $('#m-name').value.trim(), pod: $('#m-pod').value.trim(), role: $('#m-role').value};
    if(!m.name || !m.pod){ alert('Nome e POD obbligatori'); return; }
    // 1 POD = 1 cliente (semplice dedup)
    const exists = (c.members||[]).some(x=>x.pod===m.pod);
    if(exists){ alert('Questo POD Ã¨ giÃ  presente nella CER'); return; }
    c.members = c.members||[];
    c.members.push(m);
    $('#m-name').value=''; $('#m-pod').value='';
    save();
  });

  $('#btn-upload').addEventListener('click', ()=>{
    if(!activeId){ alert('Seleziona una CER'); return; }
    const files = $('#file-upload').files;
    if(!files || !files.length) { alert('Seleziona uno o piÃ¹ file'); return; }
    const list = store.getUploads();
    for(const f of files){
      list.push({cerId: activeId, name: f.name, size: f.size});
    }
    store.setUploads(list);
    openCer(activeId);
    alert('Allegati registrati (demo: storage locale).');
  });

  // Seed demo if empty
  if(items.length===0){
    items = [
      {id: crypto.randomUUID(), name:'CER Ponte Grande', cabina:'FR001', trader:'Omnia Energia', rip:{prod:55,pros:30,ctu:15}, steps: defaultSteps.map(s=>({...s, done:false})), members:[
        {name:'Mario Rossi', pod:'IT001E1234567890', role:'Prosumer'},
        {name:'Impianto Via Roma 12', pod:'IT001E5432167890', role:'Produttore'}
      ]}
    ];
    save();
  } else {
    renderList();
  }
})();
