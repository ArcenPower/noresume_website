// Insights (blog) on noresume.co (19 Oct 2026, FIX_297). Articles live in Supabase (website_blog_*), are written in
// the editor at /admin (behind Cloudflare Access) and are drawn into the existing page designs here, when a page
// is requested. If Supabase cannot be reached the pages fall back to the plain files ("Coming soon").
//
// Cloudflare Pages settings (Settings > Variables and Secrets, Production):
//   SUPABASE_ANON_KEY  the app's public (anon) key
//   BLOG_API_SECRET    the editor secret (FIX_297 keeps only its sha256)
//   CF_ACCESS_AUD      the "Application Audience (AUD) Tag" of the Access app that guards /admin
// Optional: SUPABASE_URL, CF_ACCESS_TEAM (default https://noresume.cloudflareaccess.com) - only changed for testing.

const SUPABASE_URL = 'https://fbiaqgiccgkstsewihxz.supabase.co';
const ACCESS_TEAM = 'https://noresume.cloudflareaccess.com';
export const SITE = 'https://noresume.co';
const CACHE_SECONDS = 60;           // a newly published article shows within a minute everywhere (at once for the editor)

// ── Supabase ─────────────────────────────────────────────────────────────────────────────────────────────────
export async function rpc(env, fn, args, timeoutMs = 4000) {
  const key = env.SUPABASE_ANON_KEY;
  if (!key) throw new Error('SUPABASE_ANON_KEY is not set');
  const res = await fetch(`${env.SUPABASE_URL || SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(args || {}),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try { msg = JSON.parse(text).message || text; } catch (e) {}
    const err = new Error(msg); err.status = res.status; throw err;
  }
  return text ? JSON.parse(text) : null;
}

// published data, kept for CACHE_SECONDS in this Cloudflare location
const cacheKey = (name) => `https://blog-cache.noresume.internal/${name}`;
export async function cachedRpc(env, name, fn, args) {
  const cache = caches.default, key = new Request(cacheKey(name));
  const hit = await cache.match(key);
  if (hit) return hit.json();
  const data = await rpc(env, fn, args, 2500);
  await cache.put(key, new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json', 'Cache-Control': `max-age=${CACHE_SECONDS}` } }));
  return data;
}
export async function forgetCached(names) {
  await Promise.all(names.map((n) => caches.default.delete(new Request(cacheKey(n)))));
}
export const publishedList = (env) => cachedRpc(env, 'list', 'website_blog_public_list', {});
export const publishedPost = (env, slug) => cachedRpc(env, 'post/' + slug, 'website_blog_public_post', { p_slug: slug });

// ── Cloudflare Access login (the /admin pages) ───────────────────────────────────────────────────────────────
let certCache = { at: 0, keys: null, team: '' };
const b64urlBytes = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4)), (c) => c.charCodeAt(0));
const b64urlJson = (s) => JSON.parse(new TextDecoder().decode(b64urlBytes(s)));

async function accessKeys(team) {
  if (certCache.keys && certCache.team === team && Date.now() - certCache.at < 3600e3) return certCache.keys;
  const res = await fetch(`${team}/cdn-cgi/access/certs`, { signal: AbortSignal.timeout(4000) });
  const j = await res.json();
  certCache = { at: Date.now(), keys: j.keys || [], team };
  return certCache.keys;
}

// Returns the signed-in email, or null. Checks the token's signature, audience, issuer and expiry, so a request
// that did not come through the Access login (e.g. the pages.dev address) gets nothing.
export async function accessEmail(request, env) {
  const aud = env.CF_ACCESS_AUD, team = env.CF_ACCESS_TEAM || ACCESS_TEAM;
  if (!aud) return null;
  let token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (!token) {
    const m = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)CF_Authorization=([^;]+)/);
    token = m && m[1];
  }
  if (!token) return null;
  try {
    const [h, p, s] = token.split('.');
    const head = b64urlJson(h), body = b64urlJson(p);
    if (head.alg !== 'RS256') return null;
    const jwk = (await accessKeys(team)).find((k) => k.kid === head.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64urlBytes(s), new TextEncoder().encode(`${h}.${p}`));
    if (!ok) return null;
    const now = Date.now() / 1000;
    const auds = Array.isArray(body.aud) ? body.aud : [body.aud];
    if (!auds.includes(aud) || body.iss !== team || !(body.exp > now) || (body.nbf && body.nbf > now + 60)) return null;
    return body.email ? String(body.email).toLowerCase() : null;
  } catch (e) {
    return null;
  }
}

// ── cleaning article HTML (everything the editor sends is cleaned again here before it is saved) ─────────────
const DROP = 'script,style,iframe,object,embed,noscript,template,svg,math,form,input,button,textarea,select,head,title,meta,link,base,video,audio,canvas';
const KEEP = new Set(['p', 'br', 'h2', 'h3', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'blockquote', 'figure', 'figcaption', 'img', 'hr',
  // data tables (20 Oct 2026): the figures as text, so search engines and AI tools can read and quote them
  'table', 'caption', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'small']);
const RENAME = { b: 'strong', i: 'em', h1: 'h2', h4: 'h3', h5: 'h3', h6: 'h3' };
const IMG_SRC = /^\/(?:blog|admin)\/img\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/;

export async function cleanHtml(html) {
  const rw = new HTMLRewriter()
    .on(DROP, { element(el) { el.remove(); } })
    .on('*', {
      element(el) {
        let tag = el.tagName.toLowerCase();
        if (RENAME[tag]) { el.tagName = RENAME[tag]; tag = RENAME[tag]; }
        if (!KEEP.has(tag)) { el.removeAndKeepContent(); return; }
        const keep = {};
        if (tag === 'a') {
          const href = (el.getAttribute('href') || '').trim();
          if (!/^(https?:\/\/|mailto:|\/(?!\/))/i.test(href)) { el.removeAndKeepContent(); return; }
          keep.href = href;
          if (/^https?:\/\//i.test(href) && !/^https:\/\/(www\.)?noresume\.co(\.uk)?(\/|$)/i.test(href)) {
            keep.target = '_blank'; keep.rel = 'noopener';
          }
        }
        if (tag === 'img') {
          const m = (el.getAttribute('src') || '').match(IMG_SRC);
          if (!m) { el.remove(); return; }
          keep.src = `/blog/img/${m[1]}`;
          keep.alt = (el.getAttribute('alt') || '').slice(0, 300);
          const w = parseInt(el.getAttribute('width') || '', 10), hh = parseInt(el.getAttribute('height') || '', 10);
          if (w > 0 && hh > 0) { keep.width = String(w); keep.height = String(hh); }
        }
        if (tag === 'th') {
          const scope = (el.getAttribute('scope') || '').toLowerCase();
          if (scope === 'row' || scope === 'col') keep.scope = scope;
        }
        for (const [name] of [...el.attributes]) el.removeAttribute(name);
        for (const [k, v] of Object.entries(keep)) el.setAttribute(k, v);
      },
      comments(c) { c.remove(); },
    });
  return (await rw.transform(new Response(html)).text()).trim();
}

// ── page pieces ──────────────────────────────────────────────────────────────────────────────────────────────
export const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export function ukDate(iso) {
  if (!iso) return '';
  const d = new Date(new Date(iso).toLocaleString('en-US', { timeZone: 'Europe/London' }));
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}
export const imgUrl = (id) => (id ? `/blog/img/${id}` : '');

// the shape the page designs expect (blog-posts.js)
export function cardData(p) {
  return {
    title: p.title, category: p.category, excerpt: p.excerpt, date: ukDate(p.published_at),
    read: `${p.read_minutes || 1} min read`, href: `/blog/${p.slug}`, featured: !!p.featured,
    slug: p.slug, cover: imgUrl(p.cover_image_id),
  };
}

export const CARD_CSS = `<style>
.nr-bc { position: relative; font-family: Poppins, sans-serif; display: block; height: 352px; box-sizing: border-box; background: #1B8A83; border-radius: 22px; overflow: hidden; box-shadow: 0 16px 42px rgba(6,27,64,.1); color: inherit; text-decoration: none; transition: transform .22s ease, box-shadow .22s ease; }
.nr-bc:hover, .nr-bc:focus-visible { transform: translateY(-5px); box-shadow: 0 24px 56px rgba(6,27,64,.16); }
.nr-bc-ex { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .32s cubic-bezier(.22,.8,.3,1); }
.nr-bc:hover .nr-bc-ex, .nr-bc:focus-visible .nr-bc-ex { grid-template-rows: 1fr; }
</style>`;

// cards with their own picture (often a busy chart) get a deeper, full-height shade so the title stays readable;
// the top of the picture still shows through
export const COVER_FADE = 'linear-gradient(180deg, rgba(9,62,59,.15) 0%, rgba(9,62,59,.5) 34%, rgba(9,62,59,.92) 58%, rgba(9,62,59,.98) 100%)';

// one grid card, as Blog Card.dc.html draws it (summary opens on hover / keyboard focus)
export function cardHtml(c, bind) {
  const bg = c.cover ? esc(c.cover) : '/assets/images/texture-green.jpg';
  return `<a href="${esc(c.href)}" class="nr-bc"${bind ? ` data-b-style="[[ cardVis.${esc(c.slug)} ]]"` : ''}>
  <span aria-hidden="true" style="position: absolute; inset: 0; background-image: url('${bg}'); background-size: cover; background-position: center; display: block;"></span>
  ${c.cover ? `<span aria-hidden="true" style="position: absolute; inset: 0; background: ${COVER_FADE};"></span>`
    : '<span aria-hidden="true" style="position: absolute; left: 0; right: 0; bottom: 0; height: 72%; background: linear-gradient(180deg, rgba(9,62,59,0) 0%, rgba(9,62,59,.5) 40%, rgba(9,62,59,.93) 100%);"></span>'}
  <span style="position: absolute; left: 16px; top: 16px; background: rgba(255,255,255,.92); color: #17726B; font-size: 11px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; padding: 5px 11px; border-radius: 999px;">${esc(c.category)}</span>
  <div style="position: absolute; left: 0; right: 0; bottom: 0; padding: 20px 22px 22px; display: flex; flex-direction: column; gap: 8px;">
    <h3 style="margin: 0; font-size: 17px; font-weight: 700; line-height: 1.3; color: #fff; text-wrap: pretty;">${esc(c.title)}</h3>
    <div class="nr-bc-ex"><div style="overflow: hidden; min-height: 0;">
      <p style="margin: 0 0 8px; font-size: 13.5px; line-height: 1.5; color: rgba(255,255,255,.94); text-wrap: pretty;">${esc(c.excerpt)}</p>
    </div></div>
    <div style="display: flex; align-items: center; gap: 10px; font-size: 12px; color: rgba(255,255,255,.8);">
      <span>${esc(c.date)}</span><span aria-hidden="true">·</span><span>${esc(c.read)}</span>
    </div>
  </div>
</a>`;
}

// JSON that is safe inside <script>
export const scriptJson = (v) => JSON.stringify(v).replace(/[<\u2028\u2029]/g, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

// A static page from public/ (never a 304: the copy we send differs from the file)
export async function staticPage(env, request, path) {
  return env.ASSETS.fetch(new Request(new URL(path, request.url), { headers: { Accept: 'text/html' } }));
}
export function htmlResponse(html, status = 200, extra = {}) {
  return new Response(html, { status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, max-age=0, must-revalidate', ...extra } });
}

// <div data-if="name" ...><template>X</template></div>  ->  shown, with X already on the page (no "Coming soon" flash,
// and search engines see the cards). nr-runtime keeps it as it is because it is already marked mounted.
export function mountIf(html, name, fill) {
  const open = `<div data-if="${name}" data-if-on="false" data-mounted="0" style="display: contents;"><template>`;
  const i = html.indexOf(open);
  if (i < 0) throw new Error(`no ${name} block`);
  const start = i + open.length;
  const end = matchingTemplateEnd(html, start);
  const inner = html.slice(start, end);
  return html.slice(0, i) + `<div data-if="${name}" data-if-on="true" data-mounted="1" style="display: contents;"><template>`
    + inner + '</template>' + fill(inner) + html.slice(end + '</template>'.length);
}
// <div data-if="name" data-if-on="true" data-mounted="1" ...><template>X</template>X'</div> -> hidden
export function unmountIf(html, name) {
  const open = `<div data-if="${name}" data-if-on="true" data-mounted="1" style="display: contents;"><template>`;
  const i = html.indexOf(open);
  if (i < 0) throw new Error(`no mounted ${name} block`);
  const start = i + open.length, end = matchingTemplateEnd(html, start), close = closingDiv(html, i);
  if (close < 0) throw new Error(`unclosed ${name} block`);
  return html.slice(0, i) + `<div data-if="${name}" data-if-on="false" data-mounted="0" style="display: contents;"><template>`
    + html.slice(start, end) + '</template></div>' + html.slice(close + '</div>'.length);
}
function matchingTemplateEnd(html, from) {
  let depth = 1;
  const re = /<template>|<\/template>/g;
  re.lastIndex = from;
  for (let m; (m = re.exec(html));) {
    depth += m[0] === '<template>' ? 1 : -1;
    if (depth === 0) return m.index;
  }
  throw new Error('unclosed template');
}
function closingDiv(html, openAt) {
  let depth = 0, inTpl = 0;
  const re = /<div\b|<\/div>|<template>|<\/template>/g;
  re.lastIndex = openAt;
  for (let m; (m = re.exec(html));) {
    if (m[0] === '<template>') { inTpl++; continue; }
    if (m[0] === '</template>') { inTpl--; continue; }
    if (inTpl) continue;
    depth += m[0] === '</div>' ? -1 : 1;
    if (depth === 0) return m.index;
  }
  return -1;
}
