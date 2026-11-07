// noresume.co.uk/hiring -> the Hiring Insight tool on the droplet (Simon 7 Nov 2026).
// Takes /hiring off the address, adds the shared key (Pages secret HIRING_PROXY_KEY, same as the droplet's
// secrets/proxy_key) and forwards over the Cloudflare tunnel. The tool checks the invite itself and puts /hiring back
// in front of its own links and redirects.
const APP = "https://hiring-app.noresume.co.uk";

export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  if (url.pathname === "/hiring") return Response.redirect(url.origin + "/hiring/" + url.search, 301);
  const headers = new Headers(request.headers);
  headers.set("X-NR-Proxy", env.HIRING_PROXY_KEY || "");
  headers.set("X-Forwarded-Proto", "https");
  headers.set("X-Real-IP", request.headers.get("CF-Connecting-IP") || "");
  const hasBody = !["GET", "HEAD"].includes(request.method);
  try {
    return await fetch(APP + url.pathname.slice("/hiring".length) + url.search, {
      method: request.method, headers, body: hasBody ? request.body : null, redirect: "manual",
    });
  } catch (e) {
    return new Response("Hiring Insight is not reachable just now. Please try again in a minute.", { status: 502 });
  }
}
