// /blog/img/<id>: a picture from a published article (kept at Cloudflare for a year; a new picture gets a new id).
import { rpc } from '../../_blog/lib.js';

export async function onRequestGet({ request, env, params }) {
  const id = String(params.id || '');
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(id)) return new Response('Not found', { status: 404 });
  const cache = caches.default, key = new Request(new URL(`/blog/img/${id}`, request.url).toString());
  const hit = await cache.match(key);
  if (hit) return hit;
  let img;
  try { img = await rpc(env, 'website_blog_public_image', { p_id: id }); } catch (e) { return new Response('Unavailable', { status: 503 }); }
  if (!img) return new Response('Not found', { status: 404, headers: { 'Cache-Control': 'no-store' } });
  const bytes = Uint8Array.from(atob(img.b64), (c) => c.charCodeAt(0));
  const res = new Response(bytes, { headers: { 'Content-Type': img.mime, 'Cache-Control': 'public, max-age=31536000, immutable' } });
  await cache.put(key, res.clone());
  return res;
}
