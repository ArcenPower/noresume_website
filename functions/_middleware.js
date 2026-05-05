// Cloudflare Pages middleware: host-aware canonical / og:url / JSON-LD / sitemap / robots
// Source HTML is canonical to noresume.co. When the request hostname is the
// .co.uk domain, rewrite the relevant URLs so each domain self-canonicalises.
// hreflang tags in the HTML source already point at both domains and don't need rewriting.

const UK_HOSTS = new Set(["noresume.co.uk", "www.noresume.co.uk"]);

export async function onRequest(context) {
  const { request, next } = context;
  const url = new URL(request.url);
  const isUK = UK_HOSTS.has(url.hostname);

  const response = await next();

  if (!isUK) return response;

  const contentType = (response.headers.get("content-type") || "").toLowerCase();
  const path = url.pathname;
  const isHTML = contentType.includes("text/html");
  const isSitemap = path === "/sitemap.xml";
  const isRobots = path === "/robots.txt";

  if (!isHTML && !isSitemap && !isRobots) return response;

  let body = await response.text();

  if (isHTML) {
    // Rewrite self-referential metadata only. Leave hreflang tags and other
    // intentional cross-domain references untouched.
    body = body.replace(
      /(<link\s+rel=["']canonical["']\s+href=["'])https:\/\/(www\.)?noresume\.co\b(?!\.uk)/gi,
      "$1https://$2noresume.co.uk"
    );
    body = body.replace(
      /(<meta\s+property=["']og:url["']\s+content=["'])https:\/\/(www\.)?noresume\.co\b(?!\.uk)/gi,
      "$1https://$2noresume.co.uk"
    );
    body = body.replace(
      /(<meta\s+property=["']twitter:url["']\s+content=["'])https:\/\/(www\.)?noresume\.co\b(?!\.uk)/gi,
      "$1https://$2noresume.co.uk"
    );
    // JSON-LD url / logo fields
    body = body.replace(
      /("(?:url|logo)"\s*:\s*")https:\/\/(www\.)?noresume\.co\b(?!\.uk)/gi,
      "$1https://$2noresume.co.uk"
    );
  } else if (isSitemap || isRobots) {
    body = body.replace(
      /https:\/\/(www\.)?noresume\.co\b(?!\.uk)/gi,
      "https://$1noresume.co.uk"
    );
  }

  const headers = new Headers(response.headers);
  headers.delete("content-length");
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}
