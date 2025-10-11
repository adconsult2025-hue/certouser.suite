(()=>{
  const $ = s => document.querySelector(s);
  const msg = $('#msg');

  async function call(method, body) {
    const res = await fetch('/.netlify/functions/roles', {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined
    });
    let data;
    try { data = await res.json(); } catch { data = {}; }
    if (!res.ok) throw new Error(data.error || ('Errore HTTP ' + res.status));
    return data;
  }

  async function reload() {
    const q = $('#q').value.trim();
    const data = await call('POST', { action: 'list', q });
    const tbody = $('#tbl tbody');
    tbody.innerHTML = '';
    (data.items || []).forEach(r => {
      const tr = document.createElement('tr');
      const when = r.assigned_at ? new Date(r.assigned_at).toLocaleString() : '';
      tr.innerHTML = `<td>${r.email}</td><td>${r.role}</td><td>${r.cer_id||''}</td><td>${r.territori||''}</td><td>${when}</td>`;
      tbody.appendChild(tr);
    });
  }

  $('#btn-reload').addEventListener('click', reload);

  $('#btn-assign').addEventListener('click', async () => {
    try {
      const email = $('#email').value.trim();
      const role = $('#role').value;
      if (!email || !role) throw new Error('Email e ruolo sono obbligatori');
      const cerId = $('#cerId').value.trim() || null;
      const territori = $('#territori').value.trim() || null;
      await call('POST', { action: 'assign', email, role, cerId, territori });
      msg.textContent = 'âœ… Ruolo assegnato';
      $('#email').value=''; $('#role').value=''; $('#cerId').value=''; $('#territori').value='';
      await reload();
    } catch (e) { msg.textContent = 'âš ï¸ ' + e.message; }
  });

  $('#btn-revoke').addEventListener('click', async () => {
    try {
      const email = $('#email').value.trim();
      const role = $('#role').value;
      if (!email || !role) throw new Error('Email e ruolo sono obbligatori');
      const cerId = $('#cerId').value.trim() || null;
      await call('POST', { action: 'revoke', email, role, cerId });
      msg.textContent = 'âœ… Ruolo revocato';
      await reload();
    } catch (e) { msg.textContent = 'âš ï¸ ' + e.message; }
  });

  $('#q').addEventListener('input', () => { clearTimeout(window._t); window._t = setTimeout(reload, 250); });

  // init
  reload();
})();