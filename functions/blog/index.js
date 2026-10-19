// /blog (Insights): the plain page with the published articles drawn in (featured card, grid, search, chips).
import { publishedList, cardData, cardHtml, CARD_CSS, scriptJson, staticPage, htmlResponse, mountIf, unmountIf, esc, COVER_FADE } from '../_blog/lib.js';

export async function onRequestGet({ request, env }) {
  const page = await staticPage(env, request, '/blog');
  let html = await page.text();
  let posts;
  try {
    posts = (await publishedList(env)).map(cardData);
  } catch (e) {
    console.log('blog list unavailable:', e.message);
    return htmlResponse(html);                         // plain page ("Coming soon")
  }
  if (!posts.length) return htmlResponse(html);
  // the big card shows the featured article, or the newest when none is ticked; mark it so it is not repeated in the grid
  if (!posts.some((p) => p.featured)) posts[0].featured = true;
  html = html.replace('<script src="blog-posts.js"></script>', `<script>window.NR_BLOG_POSTS = ${scriptJson(posts)};</script>`);
  html = html.replace('</head>', CARD_CSS + '\n</head>');
  // every article gets a grid card (the featured one only shows while searching or picking a category)
  html = html.replace('<!--NR_BLOG_CARDS-->', '\n' + posts.map((c) => cardHtml(c, true)).join('\n') + '\n');
  const f = posts.find((p) => p.featured);
  html = mountIf(html, 'hasArticles', (inner) => {
    let s = inner;
    for (const k of ['title', 'excerpt', 'category', 'date', 'read']) {
      s = s.replace(`<span data-t="[[ featured.${k} ]]"></span>`, `<span data-t="[[ featured.${k} ]]">${esc(f[k])}</span>`);
    }
    s = s.replace('data-b-href="[[ featured.href ]]"', `data-b-href="[[ featured.href ]]" href="${esc(f.href)}"`);
    if (f.cover) {
      s = s.replace('url(&quot;assets/images/texture-green.jpg&quot;)', `url(&quot;${esc(f.cover)}&quot;)`);
      s = s.replace(/<span aria-hidden="true" style="position: absolute; left: 0px; right: 0px; bottom: 0px; height: 68%; background: linear-gradient\([^"]*\);">/,
        `<span aria-hidden="true" style="position: absolute; inset: 0px; background: ${COVER_FADE};">`);
    }
    return s.replace(/data-b-style="\[\[ cardVis\.([^ ]+) \]\]"/g, (m, slug) =>
      `${m} style="display: ${posts.find((p) => p.slug === slug && !p.featured) ? 'block' : 'none'};"`);
  });
  html = unmountIf(html, 'noArticles');
  return htmlResponse(html);
}
