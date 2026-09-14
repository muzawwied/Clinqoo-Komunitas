// GET /api/community/search?q=… — cari postingan (teks) & orang (nama)
import { initTables, getUserByToken, getToken, json, CORS } from '../auth/shared.js';
import { initCommunityTables, hydratePosts } from './shared.js';

export async function onRequestOptions() { return new Response(null, { status: 204, headers: CORS }); }

export async function onRequestGet({ request, env }) {
  const db = env.DB;
  if (!db) return json({ error: 'D1 not bound' }, 500);
  try {
    const user = await getUserByToken(db, getToken(request));
    if (!user) return json({ error: 'Tidak terautentikasi' }, 401);
    await initCommunityTables(db);
    const q = (new URL(request.url).searchParams.get('q') || '').trim();
    if (q.length < 2) return json({ success: true, posts: [], people: [] });
    const like = '%' + q.replace(/[%_]/g, function (m) { return m === '%' ? '\\%' : '\\_'; }) + '%';
    const rows = (await db.prepare("SELECT * FROM community_posts WHERE text LIKE ? ESCAPE '\\' ORDER BY created_at DESC LIMIT 20").bind(like).all()).results || [];
    const posts = await hydratePosts(db, rows, user.id);
    // Orang: yang pernah posting dengan nama cocok, plus akun Clinqoo yang namanya cocok
    const posters = (await db.prepare("SELECT user_id AS id, author AS name, COUNT(*) AS n FROM community_posts GROUP BY user_id HAVING author LIKE ? ESCAPE '\\' ORDER BY n DESC LIMIT 10").bind(like).all()).results || [];
    const accounts = (await db.prepare("SELECT id, name FROM auth_users WHERE name LIKE ? ESCAPE '\\' LIMIT 10").bind(like).all()).results || [];
    const seen = {}, people = [];
    posters.concat(accounts.map(function (a) { return { id: a.id, name: a.name, n: 0 }; })).forEach(function (p) {
      if (p.id === user.id || seen[p.id]) return;
      seen[p.id] = true;
      people.push({ id: p.id, name: p.name || 'Pengguna', n: p.n || 0 });
    });
    return json({ success: true, posts: posts, people: people.slice(0, 10) });
  } catch (e) {
    return json({ error: e.message }, 500);
  }
}
