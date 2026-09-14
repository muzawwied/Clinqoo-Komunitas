// POST   /api/community/follow {user_id} — ikuti anggota
// DELETE /api/community/follow {user_id} — berhenti mengikuti
// GET    /api/community/follow — daftar anggota yang saya ikuti (id, name, avatar)
import { initTables, getUserByToken, getToken, json, CORS } from '../auth/shared.js';
import { initCommunityTables } from './shared.js';

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

async function readUserId(request) {
  // DELETE boleh bawa body JSON; POST pasti JSON
  try {
    const body = await request.json().catch(() => ({}));
    return parseInt(body.user_id, 10);
  } catch (e) { return 0; }
}

export async function onRequestGet({ request, env }) {
  const db = env.DB;
  if (!db) return json({ error: 'D1 not bound' }, 500);
  try {
    const user = await getUserByToken(db, getToken(request));
    if (!user) return json({ error: 'Tidak terautentikasi' }, 401);
    await initCommunityTables(db);
    const rows = (await db.prepare(
      `SELECT u.id, u.name, u.avatar_url FROM community_follows f
       JOIN auth_users u ON u.id = f.followed_id
       WHERE f.follower_id = ? ORDER BY f.created_at DESC`
    ).bind(user.id).all()).results || [];
    return json({ following: rows.map(r => ({ id: r.id, name: r.name || 'Pengguna', avatar_url: r.avatar_url || '' })) });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  const db = env.DB;
  if (!db) return json({ error: 'D1 not bound' }, 500);
  try {
    const user = await getUserByToken(db, getToken(request));
    if (!user) return json({ error: 'Tidak terautentikasi' }, 401);
    await initCommunityTables(db);
    const targetId = await readUserId(request);
    if (!targetId) return json({ error: 'user_id tidak valid' }, 400);
    if (targetId === user.id) return json({ error: 'Tidak bisa mengikuti diri sendiri' }, 400);
    const target = await db.prepare('SELECT id FROM auth_users WHERE id = ?').bind(targetId).first();
    if (!target) return json({ error: 'Anggota tidak ditemukan' }, 404);
    const existing = await db.prepare('SELECT 1 AS x FROM community_follows WHERE follower_id = ? AND followed_id = ?').bind(user.id, targetId).first();
    if (existing) return json({ success: true, following: true });
    await db.prepare('INSERT INTO community_follows (follower_id, followed_id) VALUES (?, ?)').bind(user.id, targetId).run();
    return json({ success: true, following: true });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}

export async function onRequestDelete({ request, env }) {
  const db = env.DB;
  if (!db) return json({ error: 'D1 not bound' }, 500);
  try {
    const user = await getUserByToken(db, getToken(request));
    if (!user) return json({ error: 'Tidak terautentikasi' }, 401);
    await initCommunityTables(db);
    const targetId = await readUserId(request);
    if (!targetId) return json({ error: 'user_id tidak valid' }, 400);
    await db.prepare('DELETE FROM community_follows WHERE follower_id = ? AND followed_id = ?').bind(user.id, targetId).run();
    return json({ success: true, following: false });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
