// POST /api/community/react {post_id} — toggle like pada postingan
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
    const postId = String(body.post_id || '');
    const post = postId ? await db.prepare('SELECT id FROM community_posts WHERE id = ?').bind(postId).first() : null;
    if (!post) return json({ error: 'Postingan tidak ditemukan' }, 404);
    const existing = await db.prepare('SELECT 1 AS x FROM community_likes WHERE post_id = ? AND user_id = ?').bind(postId, user.id).first();
    let liked;
    if (existing) {
      await db.prepare('DELETE FROM community_likes WHERE post_id = ? AND user_id = ?').bind(postId, user.id).run();
      liked = false;
    } else {
      await db.prepare('INSERT INTO community_likes (post_id, user_id) VALUES (?, ?)').bind(postId, user.id).run();
      liked = true;
    }
    const n = await db.prepare('SELECT COUNT(*) AS c FROM community_likes WHERE post_id = ?').bind(postId).first();
    return json({ success: true, liked: liked, likes: (n && n.c) || 0 });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
