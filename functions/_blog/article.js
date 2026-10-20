// One article page: the article design (Blog Article.dc.html) inside the site's own page (article_template.js).
import TEMPLATE from './article_template.js';
import { esc, ukDate, imgUrl, SITE } from './lib.js';

// Data tables in the article text (20 Oct 2026), drawn like the LinkedIn table pictures: teal heading row, bold
// figures, a line above the total row. Kept here, not in article_template.js, because that template stays as on GitHub.
const TABLE_CSS = `<style>
.nr-prose figure:has(> table) { overflow-x: auto; -webkit-overflow-scrolling: touch; }
.nr-prose table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 16px; line-height: 1.35; font-variant-numeric: tabular-nums; }
.nr-prose caption { caption-side: top; text-align: left; margin: 0 0 16px; font-size: clamp(1.1rem, 1.6vw, 1.3rem); font-weight: 700; line-height: 1.3; color: #17282A; text-wrap: pretty; }
.nr-prose th, .nr-prose td { padding: 14px 12px; text-align: right; vertical-align: middle; }
.nr-prose th:first-child, .nr-prose td:first-child { text-align: left; padding-left: 18px; }
.nr-prose th:last-child, .nr-prose td:last-child { padding-right: 18px; }
.nr-prose thead th { background: #1C7A73; color: #fff; font-size: 14px; font-weight: 600; white-space: nowrap; }
.nr-prose thead th:first-child { border-radius: 14px 0 0 14px; }
.nr-prose thead th:last-child { border-radius: 0 14px 14px 0; }
.nr-prose tbody th, .nr-prose tfoot th { font-weight: 600; color: #17282A; }
.nr-prose tbody td, .nr-prose tfoot td { font-weight: 700; color: #111; }
.nr-prose tbody th, .nr-prose tbody td { border-bottom: 1px solid rgba(23,114,107,.14); }
.nr-prose tfoot th, .nr-prose tfoot td { border-top: 2px solid #17726B; font-weight: 700; }
.nr-prose th small { display: block; margin-top: 2px; font-size: 13px; font-weight: 400; color: #5E6B69; }
.nr-prose figure:has(> table) figcaption { text-align: left; color: #17726B; font-weight: 600; }
.nr-prose figure > ul { margin: 0 0 24px; }
@media (max-width: 600px) {
  .nr-prose table { font-size: 13px; }
  .nr-prose caption { font-size: 1.05rem; }
  .nr-prose th, .nr-prose td { padding: 10px 4px; }
  .nr-prose th:first-child, .nr-prose td:first-child { padding-left: 8px; }
  .nr-prose th:last-child, .nr-prose td:last-child { padding-right: 8px; }
  .nr-prose thead th { font-size: 11px; }
  .nr-prose thead th:first-child { white-space: normal; }
  .nr-prose th small { font-size: 11px; }
}
@media (max-width: 360px) {
  .nr-prose table { font-size: 12px; }
  .nr-prose th, .nr-prose td { padding: 9px 3px; }
  .nr-prose th:first-child, .nr-prose td:first-child { padding-left: 6px; }
  .nr-prose th:last-child, .nr-prose td:last-child { padding-right: 6px; }
  .nr-prose thead th { font-size: 10px; }
  .nr-prose th small { font-size: 10.5px; }
}
</style>`;

const initials = (name) => {
  const w = String(name || '').replace(/^the\s+/i, '').split(/\s+/).filter(Boolean);
  if (/noresume/i.test(name || '') || !w.length) return 'NR';
  return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
};

// opts.preview: the editor's preview (draft pictures come from /admin/img, nothing is indexed)
export function renderArticle(post, opts = {}) {
  const url = `${SITE}${opts.url || `/blog/${post.slug}`}`;
  const title = post.title || 'Untitled article';
  const date = ukDate(post.published_at || new Date().toISOString());
  const read = `${post.read_minutes || 1} min read`;
  const imgBase = opts.preview ? '/admin/img/' : '/blog/img/';
  // cover_on_page false (FIX_307): the picture is only the card / LinkedIn picture, e.g. when the article has the same table as text
  const cover = post.cover_image_id && post.cover_on_page !== false ? imgBase + post.cover_image_id : '';
  let body = String(post.body_html || '');
  if (opts.preview) body = body.replace(/\/blog\/img\//g, '/admin/img/');

  const ogImage = post.cover_image_id ? `${SITE}${imgUrl(post.cover_image_id)}` : `${SITE}/assets/images/texture-green.jpg`;
  const ld = {
    '@context': 'https://schema.org', '@type': 'Article', headline: title, description: post.excerpt || '',
    datePublished: post.published_at, dateModified: post.updated_at || post.published_at, url, image: ogImage,
    author: /noresume/i.test(post.author_name || '') ? { '@type': 'Organization', name: 'NoResume' } : { '@type': 'Person', name: post.author_name },
    publisher: { '@type': 'Organization', name: 'NoResume', logo: { '@type': 'ImageObject', url: `${SITE}/assets/images/noresume_logo-color-orange.png` } },
  };
  const seo = (opts.preview
    ? `<title>Preview: ${esc(title)}</title>\n<meta name="robots" content="noindex, nofollow">`
    : [`<title>${esc(title)} - NoResume</title>`,
      `<link rel="canonical" href="${esc(url)}">`,
      `<link rel="alternate" hreflang="en-GB" href="${esc(url.replace(SITE, 'https://noresume.co.uk'))}">`,
      `<link rel="alternate" hreflang="en" href="${esc(url)}">`,
      `<link rel="alternate" hreflang="x-default" href="${esc(url)}">`,
      `<meta name="description" content="${esc(post.excerpt)}">`,
      `<meta property="og:title" content="${esc(title)}">`,
      `<meta property="og:description" content="${esc(post.excerpt)}">`,
      `<meta property="og:url" content="${esc(url)}">`,
      '<meta property="og:type" content="article">',
      '<meta property="og:site_name" content="NoResume">',
      `<meta property="og:image" content="${esc(ogImage)}">`,
      '<meta name="twitter:card" content="summary_large_image">',
      `<meta property="article:published_time" content="${esc(post.published_at)}">`,
      `<script type="application/ld+json">${JSON.stringify(ld).replace(/</g, '\\u003c')}</script>`].join('\n'))
    + (/<table[\s>]/.test(body) ? '\n' + TABLE_CSS : '');

  const share = `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`;
  const mail = `mailto:?subject=${encodeURIComponent(title)}&body=${encodeURIComponent(url)}`;
  const related = (post.related || []).map((r) => `
            <a href="/blog/${esc(r.slug)}" class="nr-related">
              <div style="position: relative; height: 150px; background-color: #1B8A83; background-image: url('${r.cover_image_id ? esc(imgUrl(r.cover_image_id)) : '/assets/images/texture-green.jpg'}'); background-size: cover; background-position: center;">
                <span style="position: absolute; left: 16px; top: 16px; background: rgba(255,255,255,.92); color: #17726B; font-size: 11.5px; font-weight: 600; letter-spacing: .1em; text-transform: uppercase; padding: 6px 12px; border-radius: 999px;">${esc(r.category)}</span>
              </div>
              <div style="padding: 20px 22px 24px; display: flex; flex-direction: column; gap: 9px; flex: 1;">
                <h3 style="margin: 0; font-size: 18px; font-weight: 700; line-height: 1.28; color: #111; text-wrap: pretty;">${esc(r.title)}</h3>
                <div style="margin-top: auto; padding-top: 6px; font-size: 13px; color: #6A6A6A;">${esc(ukDate(r.published_at))}</div>
              </div>
            </a>`).join('');

  const article = `
    <article style="padding: 132px 0 0;">
      <div style="max-width: 760px; margin: 0 auto; padding: 0 32px;">
        <a href="/blog" style="display: inline-flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; color: var(--teal, #17726B);">
          <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 15px; height: 15px; display: block;"><polyline points="15 5 8 12 15 19" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"></polyline></svg>
          All articles
        </a>
        <span style="display: block; margin: 26px 0 0; font-size: 12.5px; font-weight: 600; letter-spacing: .12em; text-transform: uppercase; color: var(--teal, #17726B);">${esc(post.category)}</span>
        <h1 style="margin: 14px 0 0; font-size: clamp(2rem, 3.8vw, 3rem); font-weight: 700; line-height: 1.12; letter-spacing: -.02em; color: #111; text-wrap: pretty;">${esc(title)}</h1>
        ${post.excerpt ? `<p style="margin: 20px 0 0; font-size: clamp(1.1rem, 1.6vw, 1.3rem); line-height: 1.55; color: #2E3A38; text-wrap: pretty;">${esc(post.excerpt)}</p>` : ''}
        <div style="display: flex; align-items: center; gap: 14px; margin: 28px 0 0; padding: 20px 0; border-top: 1px solid rgba(23,114,107,.18); border-bottom: 1px solid rgba(23,114,107,.18);">
          <span aria-hidden="true" style="flex: none; width: 44px; height: 44px; border-radius: 999px; background: linear-gradient(135deg, #1A5F5F 0%, #36C5C5 100%); color: #fff; display: grid; place-items: center; font-size: 15px; font-weight: 700;">${esc(initials(post.author_name))}</span>
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 15px; font-weight: 600; color: #111;">${esc(post.author_name || 'The NoResume Team')}</span>
            <span style="font-size: 13.5px; color: #6A6A6A;">${esc(date)} · ${esc(read)}</span>
          </div>
        </div>
      </div>
${cover ? `
      <div style="max-width: 1000px; margin: 34px auto 0; padding: 0 32px;">
        <figure style="margin: 0;">
          <img src="${esc(cover)}" alt="${esc(post.cover_caption || title)}" style="display: block; width: 100%; height: auto; border-radius: 24px; box-shadow: 0 22px 60px rgba(6,27,64,.16);">
          ${post.cover_caption ? `<figcaption style="margin: 12px 0 0; font-size: 13.5px; color: #5A5A5A;">${esc(post.cover_caption)}</figcaption>` : ''}
        </figure>
      </div>` : ''}

      <div class="nr-prose" style="max-width: 760px; margin: 0 auto; padding: 44px 32px 0;">
${body}
        ${post.original_url && /^https:\/\//.test(post.original_url) ? `<p style="font-size: 14.5px; color: #5A5A5A;">First posted on <a href="${esc(post.original_url)}" target="_blank" rel="noopener">LinkedIn</a>.</p>` : ''}
        <div style="display: flex; align-items: center; gap: 14px; margin: 40px 0 0; padding-top: 26px; border-top: 1px solid rgba(23,114,107,.18);">
          <span style="font-size: 14px; font-weight: 600; color: #2E3A38;">Share</span>
          <div style="display: flex; gap: 10px;">
            <a href="${esc(share)}" target="_blank" rel="noopener" aria-label="Share on LinkedIn" style="width: 38px; height: 38px; border-radius: 999px; background: #fff; box-shadow: 0 2px 10px rgba(6,27,64,.14); display: grid; place-items: center; text-decoration: none;">
              <img src="/assets/images/linkedin.png" alt="LinkedIn" style="width: 22px; height: 22px; object-fit: contain; display: block; box-shadow: none; border-radius: 0; margin: 0;">
            </a>
            <a href="${esc(mail)}" aria-label="Share by email" style="width: 38px; height: 38px; border-radius: 999px; background: rgba(23,114,107,.12); color: #17726B; display: grid; place-items: center; font-size: 15px; font-weight: 600; text-decoration: none;">@</a>
          </div>
        </div>
      </div>
    </article>
${related ? `
    <section style="padding: 64px 0 80px;">
      <div style="max-width: 1240px; margin: 0 auto; padding: 0 32px;">
        <h2 style="margin: 0 0 26px; font-size: clamp(1.35rem, 2.1vw, 1.75rem); font-weight: 700; letter-spacing: -.01em; color: var(--teal, #17726B);">Keep reading</h2>
        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(288px, 1fr)); gap: 28px;">${related}
        </div>
      </div>
    </section>` : '<div style="height: 80px;"></div>'}`;

  return TEMPLATE.replace('<!--NR_SEO-->', () => seo).replace('<!--NR_ARTICLE-->', () => article);
}

// /blog/<address> with no published article (a draft, a typo, an old address): a real "not found"
export function renderNotFound() {
  return TEMPLATE.replace('<!--NR_SEO-->', () => '<title>Article not found - NoResume</title>\n<meta name="robots" content="noindex">')
    .replace('<!--NR_ARTICLE-->', () => `
    <section style="padding: 170px 0 110px;">
      <div style="max-width: 640px; margin: 0 auto; padding: 0 32px; text-align: center; display: flex; flex-direction: column; align-items: center; gap: 16px;">
        <span style="font-size: 13px; font-weight: 600; letter-spacing: .16em; text-transform: uppercase; color: var(--teal, #17726B);">Not found</span>
        <h1 style="margin: 0; font-size: clamp(1.9rem, 3.4vw, 2.7rem); font-weight: 700; line-height: 1.2; letter-spacing: -.02em; color: #111;">This article is not available</h1>
        <p style="margin: 0; max-width: 48ch; font-size: 17px; line-height: 1.6; color: #3A3A3A;">It may have moved or been taken down. The latest articles are on the Insights page.</p>
        <a href="/blog" style="margin-top: 10px; background: linear-gradient(135deg, #1A5F5F 0%, #36C5C5 100%); color: #fff; padding: 15px 30px; border-radius: 999px; font-size: 16px; font-weight: 600; box-shadow: 0 10px 30px rgba(26,95,95,.26);">See all articles</a>
      </div>
    </section>`);
}
