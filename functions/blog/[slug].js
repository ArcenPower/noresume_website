// /blog/<address>: one published article.
import { publishedPost, htmlResponse } from '../_blog/lib.js';
import { renderArticle, renderNotFound } from '../_blog/article.js';

export async function onRequestGet({ env, params }) {
  const slug = String(params.slug || '').toLowerCase();
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) return htmlResponse(renderNotFound(), 404);
  let post;
  try {
    post = await publishedPost(env, slug);
  } catch (e) {
    console.log('blog post unavailable:', e.message);
    return htmlResponse('<!doctype html><meta charset="utf-8"><title>NoResume</title><p style="font-family:sans-serif;padding:40px">This article could not be loaded just now. Please try again in a minute.</p>', 503, { 'Retry-After': '60' });
  }
  if (!post) return htmlResponse(renderNotFound(), 404);
  return htmlResponse(renderArticle(post, { url: `/blog/${slug}` }));
}
