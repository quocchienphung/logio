/** Blocked reference destinations always return HTTP 404, including encoded legacy paths. */
function unavailable() {
  return new Response(`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex"><title>404 — Page not found</title><style>body{margin:0;min-height:100svh;display:grid;place-items:center;font:16px/1.6 system-ui,sans-serif;background:#f7f8fb;color:#172b4d}main{padding:32px;max-width:440px}h1{font-size:64px;line-height:1;margin:0 0 24px}a{color:#635bff}</style></head><body><main><h1>404</h1><h2>Page not found</h2><p>This page is not available in this local experience.</p><a href="/">Return home</a></main></body></html>`, {
    status: 404,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Robots-Tag": "noindex" },
  });
}

export { unavailable as GET, unavailable as HEAD, unavailable as POST, unavailable as PUT, unavailable as PATCH, unavailable as DELETE, unavailable as OPTIONS };
