// POST /api/community/message {to_id, text} — kirim pesan ke anggota lain
import { initTables, getUserByToken, getToken, json, CORS } from '../auth/shared.js';
import { initCommunityTables } from './shared.js';

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestPost({ request, env }) {
  const db = env.DB;
  if (!db) return json({ error: 'D1 not bound' }, 500);
  try {
    const user = await getUserByToken(db, getToken(request));
    if (!user) return json({ error: 'Tidak terautentikasi' }, 401);
    await initCommunityTables(db);
    const body = await request.json().catch(() => ({}));
    const toId = parseInt(body.to_id, 10);
    const text = String(body.text || '').trim().slice(0, 500);
    if (!toId) return json({ error: 'to_id tidak valid' }, 400);
    if (!text) return json({ error: 'Pesan tidak boleh kosong' }, 400);
    if (toId === user.id) return json({ error: 'Tidak bisa mengirim pesan ke diri sendiri' }, 400);
    const target = await db.prepare('SELECT id FROM auth_users WHERE id = ?').bind(toId).first();
    if (!target) return json({ error: 'Anggota tidak ditemukan' }, 404);
    // Batas lahir: 1 pesan per 10 detik
    const last = await db.prepare('SELECT created_at FROM community_messages WHERE from_id = ? ORDER BY created_at DESC LIMIT 1').bind(user.id).first();
    if (last && new Date(last.created_at) > new Date(Date.now() - 10000)) {
      return json({ error: 'Sabar sedikit — tunggu beberapa detik lagi sebelum mengirim pesan lain.' }, 429);
    }
    const created_at = new Date().toISOString();
    await db.prepare('INSERT INTO community_messages (from_id, to_id, text, created_at) VALUES (?, ?, ?, ?)')
      .bind(user.id, toId, text, created_at).run();
    return json({ success: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
