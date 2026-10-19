// / (Home): the plain page with the newest three articles in "Insights from the Open Job Market".
import { publishedList, cardData, cardHtml, CARD_CSS, scriptJson, staticPage, htmlResponse, mountIf } from './_blog/lib.js';

export async function onRequestGet({ request, env }) {
  const page = await staticPage(env, request, '/');
  if (!page.ok) return page;
  let html = await page.text();
  let posts;
  try {
    posts = (await publishedList(env)).map(cardData);
  } catch (e) {
    console.log('blog list unavailable:', e.message);
    return htmlResponse(html);
  }
  if (!posts.length || !html.includes('<!--NR_BLOG_CARDS-->')) return htmlResponse(html);
  html = html.replace('<script src="blog-posts.js"></script>', `<script>window.NR_BLOG_POSTS = ${scriptJson(posts)};</script>`);
  html = html.replace('</head>', CARD_CSS + '\n</head>');
  html = html.replace('<!--NR_BLOG_CARDS-->', '\n' + posts.slice(0, 3).map((c) => cardHtml(c, false)).join('\n') + '\n');
  html = mountIf(html, 'hasArticles', (inner) => inner);
  return htmlResponse(html);
}
