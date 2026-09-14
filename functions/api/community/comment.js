// POST /api/community/comment {post_id, text} — tambah komentar pada postingan
import { initTables, getUserByToken, getToken, json, CORS } from '../auth/shared.js';
import { initCommunityTables, shapeComment } from './shared.js';

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestPost({ request, env }) {
  const db = env.DB;
  if (!db) return json({ error: 'D1 not bound' }, 500);
  try {
    const user = await getUserByToken(db, getToken(request));
    if (!user) return json({ error: 'Tidak terautentikasi' }, 401);
    await initCommunityTables(db);
    const body = await request.json().catch(() => ({}));
    const postId = String(body.post_id || '');
    const text = String(body.text || '').trim().slice(0, 300);
    if (!text) return json({ error: 'Komentar tidak boleh kosong' }, 400);
    const post = postId ? await db.prepare('SELECT id FROM community_posts WHERE id = ?').bind(postId).first() : null;
    if (!post) return json({ error: 'Postingan tidak ditemukan' }, 404);
    const created_at = new Date().toISOString();
    const author = user.name || 'Pengguna';
    const r = await db.prepare('INSERT INTO community_comments (post_id, user_id, author, text, created_at) VALUES (?, ?, ?, ?, ?)')
      .bind(postId, user.id, author, text, created_at).run();
    const row = await db.prepare('SELECT * FROM community_comments WHERE id = ?').bind(r.meta.last_row_id).first();
    return json({ success: true, comment: shapeComment(row) });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
