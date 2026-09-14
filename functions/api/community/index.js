// GET  /api/community?limit=N — linimasa komunitas (wajib Bearer, divalidasi middleware)
// POST /api/community {text, image?} — buat postingan baru
import { initTables, getUserByToken, getToken, json, CORS } from '../auth/shared.js';
import { initCommunityTables, newPostId, hydratePosts, shapePost, validPostImage } from './shared.js';

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestGet({ request, env }) {
  const db = env.DB;
  if (!db) return json({ error: 'D1 not bound' }, 500);
  try {
    const user = await getUserByToken(db, getToken(request));
    if (!user) return json({ error: 'Tidak terautentikasi' }, 401);
    await initCommunityTables(db);
    let limit = parseInt(new URL(request.url).searchParams.get('limit') || '30', 10);
    if (!isFinite(limit) || limit < 1) limit = 30;
    if (limit > 100) limit = 100;
    const rows = (await db.prepare('SELECT * FROM community_posts ORDER BY created_at DESC LIMIT ?').bind(limit).all()).results || [];
    const feed = await hydratePosts(db, rows, user.id);
    let meLink = '', meBio = '';
    try {
      const pr = await db.prepare('SELECT bio, link FROM community_profiles WHERE user_id = ?').bind(user.id).first();
      if (pr) { meLink = pr.link || ''; meBio = pr.bio || ''; }
    } catch (e) {}
    return json({ feed: feed, me: { id: user.id, name: user.name || '', avatar_url: user.avatar_url || '', bio: meBio, link: meLink } });
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
    const body = await request.json().catch(() => ({}));
    const text = String(body.text || '').trim().slice(0, 500);
    const image = body.image ? String(body.image) : '';
    if (!text && !image) return json({ error: 'Postingan tidak boleh kosong' }, 400);
    if (image && !validPostImage(image)) return json({ error: 'Media tidak valid atau terlalu besar (maks ~100KB)' }, 400);
    // Batas lahir: 1 postingan per 15 detik
    const last = await db.prepare('SELECT created_at FROM community_posts WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').bind(user.id).first();
    if (last && new Date(last.created_at) > new Date(Date.now() - 15000)) {
      return json({ error: 'Sabar sedikit — tunggu beberapa detik lagi sebelum posting lagi.' }, 429);
    }
    const id = newPostId();
    const created_at = new Date().toISOString();
    await db.prepare('INSERT INTO community_posts (id, user_id, author, text, image, created_at) VALUES (?, ?, ?, ?, ?, ?)')
      .bind(id, user.id, user.name || 'Pengguna', text, image, created_at).run();
    return json({ success: true, post: shapePost({ id, user_id: user.id, author: user.name || 'Pengguna', text, image, created_at }, user.id, 0, false, []) });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
