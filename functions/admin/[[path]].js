// /admin: the Insights editor. Cloudflare Access asks for the Google sign-in in front of this; every request here
// also checks the Access login itself and Supabase checks the email is on website_blog_editors (FIX_297).
import { rpc, accessEmail, cleanHtml, forgetCached, htmlResponse, esc } from '../_blog/lib.js';
import { renderArticle } from '../_blog/article.js';
import ADMIN_PAGE from '../_blog/admin_page.js';

const NO_STORE = { 'Cache-Control': 'no-store', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin', 'X-Robots-Tag': 'noindex, nofollow' };
const CSP = "default-src 'self'; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
  + "font-src https://fonts.gstatic.com; script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const CATEGORIES = ['Hiring', 'Talent', 'Product'];
const MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json', ...NO_STORE } });
const page = (html, status = 200) => htmlResponse(html, status, { ...NO_STORE, 'Content-Security-Policy': CSP });

function friendly(e) {
  const m = String(e.message || e);
  if (/not an editor/.test(m)) return [403, 'This Google account is not on the editor list.'];
  if (/not authorised/.test(m)) return [500, 'The website is not set up to talk to the database (BLOG_API_SECRET).'];
  for (const k of ['changed_elsewhere', 'slug_taken', 'slug_locked']) {
    if (m.includes(k + ':')) return [409, m.slice(m.indexOf(k + ':') + k.length + 1).trim()];
  }
  if (/website_blog_posts_slug_check|violates check constraint/.test(m)) return [400, 'Something in the form is not valid (address, category or read time).'];
  return [500, 'Could not reach the database: ' + m.slice(0, 200)];
}

const words = (html) => String(html).replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').split(/\s+/).filter(Boolean).length;

export async function onRequest({ request, env, params }) {
  const path = '/' + [].concat(params.path || []).join('/');
  const url = new URL(request.url);
  const email = await accessEmail(request, env);
  if (!email) {
    const why = env.CF_ACCESS_AUD ? 'Please sign in through the NoResume login.' : 'The editor is not switched on yet (CF_ACCESS_AUD is not set).';
    return path.startsWith('/api/') ? json({ error: why }, 401) : page(`<!doctype html><meta charset="utf-8"><title>NoResume editor</title><p style="font-family:sans-serif;padding:40px">${why}</p>`, 401);
  }
  const auth = { p_secret: env.BLOG_API_SECRET || '', p_email: email };
  const call = (fn, extra) => rpc(env, fn, { ...auth, ...extra }, 15000);

  // calls from the editor page carry this header; a form on another website cannot add it (Preview only shows, saves nothing)
  if (request.method !== 'GET' && path !== '/preview' && request.headers.get('X-NR-Admin') !== '1') return json({ error: 'bad request' }, 400);

  try {
    if (request.method === 'GET' && (path === '/' || path === '/index.html')) {
      return page(ADMIN_PAGE.replace('__EMAIL__', esc(email)));
    }
    if (request.method === 'GET' && path === '/api/list') {
      return json(await call('website_blog_admin_list', {}));
    }
    if (request.method === 'GET' && path === '/api/post') {
      const id = url.searchParams.get('id') || '';
      if (!UUID.test(id)) return json({ error: 'bad id' }, 400);
      const post = await call('website_blog_admin_get', { p_id: id });
      return post ? json(post) : json({ error: 'Article not found' }, 404);
    }
    if (request.method === 'GET' && path.startsWith('/img/')) {
      const id = path.slice(5);
      if (!UUID.test(id)) return new Response('Not found', { status: 404 });
      const img = await call('website_blog_admin_image', { p_id: id });
      if (!img) return new Response('Not found', { status: 404 });
      return new Response(Uint8Array.from(atob(img.b64), (c) => c.charCodeAt(0)),
        { headers: { 'Content-Type': img.mime, 'Cache-Control': 'private, max-age=86400' } });
    }
    if (request.method === 'GET' && path === '/preview') {
      return page('<!doctype html><meta charset="utf-8"><title>Preview</title><p style="font-family:sans-serif;padding:40px">Open previews with the Preview button in the <a href="/admin">editor</a>.</p>');
    }
    if (request.method === 'POST' && path === '/preview') {
      // the editor's Preview button: shows what is in the form now, saved or not (nothing is stored)
      const form = await request.formData();
      let p = {};
      try { p = JSON.parse(String(form.get('data') || '{}')); } catch (e) {}
      const post = {
        title: String(p.title || ''), category: CATEGORIES.includes(p.category) ? p.category : 'Hiring',
        excerpt: String(p.excerpt || ''), author_name: String(p.author_name || ''), published_at: p.published_at || null,
        cover_image_id: UUID.test(p.cover_image_id || '') ? p.cover_image_id : null, cover_caption: String(p.cover_caption || ''),
        original_url: /^https:\/\/[^\s"<>]+$/.test(p.original_url || '') ? p.original_url : '', related: [],
      };
      post.body_html = await cleanHtml(String(p.body_html || ''));
      post.read_minutes = Math.max(1, Math.round(words(post.body_html) / 200) || 1);
      const html = renderArticle(post, { preview: true, url: `/blog/${String(p.slug || 'preview')}` });
      return htmlResponse(html.replace('<body>', '<body><div style="position:fixed;left:50%;bottom:18px;transform:translateX(-50%);z-index:999;background:#17282A;color:#fff;font:600 13px Poppins,sans-serif;padding:9px 18px;border-radius:999px;box-shadow:0 8px 24px rgba(0,0,0,.25)">Preview only, not saved</div>'),
        200, { ...NO_STORE });
    }
    if (request.method === 'POST' && path === '/api/image') {
      const b = await request.json();
      if (!MIMES.includes(b.mime) || typeof b.b64 !== 'string' || b.b64.length > 5.6e6) return json({ error: 'Picture must be JPEG, PNG, WebP or GIF and under 4 MB.' }, 400);
      const id = await call('website_blog_admin_image_add', { p_mime: b.mime, p_b64: b.b64, p_width: b.width | 0 || null, p_height: b.height | 0 || null });
      return json({ id });
    }
    if (request.method === 'POST' && path === '/api/save') {
      const b = await request.json();
      const p = b.post || {}, action = String(b.action || 'save');
      const body = await cleanHtml(String(p.body_html || ''));
      const post = {
        id: UUID.test(p.id || '') ? p.id : null,
        updated_at: p.updated_at || null,
        slug: String(p.slug || '').toLowerCase().trim(),
        title: String(p.title || '').trim().slice(0, 200),
        category: CATEGORIES.includes(p.category) ? p.category : 'Hiring',
        excerpt: String(p.excerpt || '').trim().slice(0, 400),
        body_html: body,
        cover_image_id: UUID.test(p.cover_image_id || '') ? p.cover_image_id : null,
        cover_caption: String(p.cover_caption || '').trim().slice(0, 300),
        author_name: String(p.author_name || '').trim().slice(0, 80),
        read_minutes: Math.max(1, Math.min(120, Math.round(words(body) / 200) || 1)),
        featured: !!p.featured,
        published_at: p.published_at || null,
        original_url: /^https:\/\/[^\s"<>]+$/.test(p.original_url || '') ? p.original_url : '',
      };
      if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(post.slug) || post.slug.length > 90) return json({ error: 'The web address can only use small letters, numbers and dashes.' }, 400);
      if (action === 'publish' && (!post.title || !post.excerpt || !body)) return json({ error: 'An article needs a title, a summary and some text before it can be published.' }, 400);
      const saved = await call('website_blog_admin_save', { p_post: post, p_action: action });
      await forgetCached(['list', 'post/' + saved.slug]);
      return json(saved);
    }
    return json({ error: 'not found' }, 404);
  } catch (e) {
    const [status, msg] = friendly(e);
    console.log('admin error:', e.message);
    return path.startsWith('/api/') ? json({ error: msg }, status) : page(`<!doctype html><meta charset="utf-8"><p style="font-family:sans-serif;padding:40px">${esc(msg)}</p>`, status);
  }
}
