/**
 * Psycray production server.
 *
 * One process on one local port (127.0.0.1:41040 on the VPS, behind
 * Psycray's HTTPS proxy):
 *   - serves the built React app from dist/, with SPA fallback so any route
 *     can be opened or refreshed directly
 *   - forwards /api/* to the n8n webhooks, adding the X-Psycray-Key secret
 *     server-side (the browser never sees it; any client-sent copy is dropped)
 *   - /healthz for checks
 *
 * No dependencies beyond Node 24. Configuration comes from the environment:
 *   HOST, PORT, N8N_WEBHOOK_BASE, N8N_WEBHOOK_SECRET
 * Logs (stdout) never include secrets, request bodies or headers.
 */
import { createReadStream } from "node:fs"
import { stat } from "node:fs/promises"
import http from "node:http"
import { dirname, extname, join, normalize, resolve, sep } from "node:path"
import { Readable } from "node:stream"
import { fileURLToPath } from "node:url"

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webp": "image/webp",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".txt": "text/plain; charset=utf-8",
}

const SECURITY_HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "same-origin",
  "X-Frame-Options": "DENY",
}

/** Largest request body forwarded to n8n (instructions are ≤1,000 chars; configs a few KB). */
const MAX_BODY_BYTES = 256 * 1024
/** n8n calls are short (research runs as a background job); bulk rescoring is the slowest. */
const UPSTREAM_TIMEOUT_MS = 90_000

function json(res, status, body) {
  res.writeHead(status, { "Content-Type": MIME[".json"], "Cache-Control": "no-store", ...SECURITY_HEADERS })
  res.end(JSON.stringify(body))
}

async function readBody(req) {
  const chunks = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > MAX_BODY_BYTES) throw Object.assign(new Error("too large"), { status: 413 })
    chunks.push(chunk)
  }
  return Buffer.concat(chunks)
}

/**
 * Creates the request handler. Throws when required configuration is missing,
 * so a misconfigured deploy fails loudly at startup instead of per request.
 */
export function createHandler({ distDir, n8nBase, n8nSecret, fetchImpl = fetch, log = () => {} }) {
  if (!n8nBase) throw new Error("N8N_WEBHOOK_BASE is not set")
  if (!n8nSecret) throw new Error("N8N_WEBHOOK_SECRET is not set")
  const base = n8nBase.replace(/\/+$/, "")
  const root = resolve(distDir)

  async function proxy(req, res, url) {
    if (req.method !== "GET" && req.method !== "POST") return json(res, 405, { error: "Method not allowed." })
    const target = base + url.pathname.slice("/api".length) + url.search
    const headers = { Accept: "application/json", "X-Psycray-Key": n8nSecret }
    const type = req.headers["content-type"]
    if (type) headers["Content-Type"] = type
    let body
    if (req.method === "POST") body = await readBody(req)

    let upstream
    try {
      upstream = await fetchImpl(target, { method: req.method, headers, body, signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) })
    } catch (err) {
      const timeout = err?.name === "TimeoutError"
      log(`api ${req.method} ${url.pathname} upstream ${timeout ? "timeout" : "unreachable"}`)
      return json(res, timeout ? 504 : 502, {
        error: timeout ? "The research service took too long to respond." : "The research service couldn't be reached.",
      })
    }
    res.writeHead(upstream.status, {
      "Content-Type": upstream.headers.get("content-type") ?? MIME[".json"],
      "Cache-Control": "no-store",
      ...SECURITY_HEADERS,
    })
    if (upstream.body) Readable.fromWeb(upstream.body).pipe(res)
    else res.end()
  }

  async function serveFile(res, file, { immutable }) {
    res.writeHead(200, {
      "Content-Type": MIME[extname(file)] ?? "application/octet-stream",
      "Cache-Control": immutable ? "public, max-age=31536000, immutable" : "no-cache",
      ...SECURITY_HEADERS,
    })
    createReadStream(file).pipe(res)
  }

  async function staticOrApp(req, res, url) {
    if (req.method !== "GET" && req.method !== "HEAD") return json(res, 405, { error: "Method not allowed." })
    let pathname
    try {
      pathname = decodeURIComponent(url.pathname)
    } catch {
      return json(res, 400, { error: "Bad request." })
    }
    const file = normalize(join(root, pathname))
    // Never serve anything outside dist/
    if (file !== root && !file.startsWith(root + sep)) return json(res, 404, { error: "Not found." })
    const info = await stat(file).catch(() => null)
    if (info?.isFile()) return serveFile(res, file, { immutable: pathname.startsWith("/assets/") })
    // Missing hashed asset or static file: real 404, not the app. Only known
    // file types count: /companies/basecamp.com is a route, not a file.
    if (pathname.startsWith("/assets/") || extname(pathname).toLowerCase() in MIME) return json(res, 404, { error: "Not found." })
    // Client-side route (e.g. /companies/acme.com): the app handles it
    return serveFile(res, join(root, "index.html"), { immutable: false })
  }

  return async function handler(req, res) {
    const started = Date.now()
    const url = new URL(req.url ?? "/", "http://localhost")
    res.on("finish", () => log(`${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - started}ms`))
    try {
      if (url.pathname === "/healthz") return json(res, 200, { ok: true })
      if (url.pathname === "/api" || url.pathname.startsWith("/api/")) return await proxy(req, res, url)
      return await staticOrApp(req, res, url)
    } catch (err) {
      if (res.headersSent) return res.destroy()
      if (err?.status === 413) return json(res, 413, { error: "Request too large." })
      log(`error ${req.method} ${url.pathname}: ${err?.message ?? err}`)
      return json(res, 500, { error: "Something went wrong." })
    }
  }
}

/** Starts the server; resolves once it is listening. */
export async function start({ host, port, ...options }) {
  const server = http.createServer(createHandler(options))
  server.requestTimeout = UPSTREAM_TIMEOUT_MS + 10_000
  server.headersTimeout = 30_000
  await new Promise((ok, fail) => server.once("error", fail).listen(port, host, ok))
  return server
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const host = process.env.HOST || "127.0.0.1"
  const port = Number(process.env.PORT || 41040)
  const log = (line) => console.log(`${new Date().toISOString()} ${line}`)
  try {
    const server = await start({
      host,
      port,
      distDir: join(dirname(fileURLToPath(import.meta.url)), "..", "dist"),
      n8nBase: process.env.N8N_WEBHOOK_BASE,
      n8nSecret: process.env.N8N_WEBHOOK_SECRET,
      log,
    })
    log(`Psycray listening on http://${host}:${port}`)
    // Graceful stop for the service manager: finish in-flight requests, then exit
    const stop = (signal) => {
      log(`${signal} received, shutting down`)
      server.close(() => process.exit(0))
      setTimeout(() => process.exit(0), 10_000).unref()
    }
    process.on("SIGTERM", () => stop("SIGTERM"))
    process.on("SIGINT", () => stop("SIGINT"))
  } catch (err) {
    console.error(`Psycray failed to start: ${err.message}`)
    process.exit(1)
  }
}
