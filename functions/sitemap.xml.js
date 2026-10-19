// /sitemap.xml: the file in public/ plus one line per published article.
import { publishedList, SITE } from './_blog/lib.js';

export async function onRequestGet({ request, env }) {
  const res = await env.ASSETS.fetch(new Request(new URL('/sitemap.xml', request.url)));
  let xml = await res.text();
  try {
    const rows = (await publishedList(env)).map((p) => `  <url>\n    <loc>${SITE}/blog/${p.slug}</loc>\n    <lastmod>${String(p.published_at).slice(0, 10)}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`);
    xml = xml.replace('</urlset>', rows.join('') + '</urlset>');
  } catch (e) {
    console.log('sitemap: blog list unavailable:', e.message);
  }
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=300' } });
}
