// src/lib/api.ts
export async function apiGet(fn: string, qs: Record<string,string> = {}) {
  const u = new URL(`/.netlify/functions/${fn}`, window.location.origin);
  Object.entries(qs).forEach(([k,v]) => u.searchParams.set(k, v));
  const res = await fetch(u.toString(), { credentials: 'include' });
  const text = await res.text(); let data:any=null; try{data=JSON.parse(text);}catch{}
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}: ${text}`);
  return data;
}
export async function apiPost(fn: string, body: any) {
  const res = await fetch(`/.netlify/functions/${fn}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text(); let data:any=null; try{data=JSON.parse(text);}catch{}
  if (!res.ok) throw new Error(data?.error || `HTTP ${res.status}: ${text}`);
  return data;
}
