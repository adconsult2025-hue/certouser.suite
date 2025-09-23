// src/lib/api.ts
export async function apiGet(fn: string) {
  const res = await fetch(`/.netlify/functions/${fn}`, { credentials: 'include' });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* no-op */ }
  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}: ${text}`;
    throw new Error(msg);
  }
  return data;
}

export async function apiPost(fn: string, body: any) {
  const res = await fetch(`/.netlify/functions/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body ?? {})
  });
  const text = await res.text();
  let data: any = null;
  try { data = JSON.parse(text); } catch { /* no-op */ }
  if (!res.ok) {
    const msg = data?.error || `HTTP ${res.status}: ${text}`;
    throw new Error(msg);
  }
  return data;
}
