/** Production server: static app, SPA fallback, n8n proxy with the secret added server-side. */
import assert from "node:assert/strict"
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs"
import http from "node:http"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { after, before, describe, it } from "node:test"
// @ts-expect-error plain JS module
import { createHandler, start } from "../../server/server.mjs"

const SECRET = "test-secret-value-123"
let n8n: http.Server
let app: http.Server
let appUrl = ""
let n8nUrl = ""
const seen: { method: string; url: string; key: string | undefined; body: string; cookie: string | undefined }[] = []

before(async () => {
  // Fake n8n: echoes what it received
  n8n = http.createServer(async (req, res) => {
    let body = ""
    for await (const c of req) body += c
    seen.push({ method: req.method!, url: req.url!, key: req.headers["x-psycray-key"] as string | undefined, body, cookie: req.headers.cookie })
    res.writeHead(req.url!.startsWith("/webhook/psycray/missing") ? 404 : 200, { "Content-Type": "application/json" })
    res.end(JSON.stringify({ ok: true, path: req.url }))
  })
  await new Promise<void>((r) => n8n.listen(0, "127.0.0.1", r))
  n8nUrl = `http://127.0.0.1:${(n8n.address() as { port: number }).port}/webhook/psycray`

  const dist = mkdtempSync(join(tmpdir(), "psycray-dist-"))
  mkdirSync(join(dist, "assets"))
  writeFileSync(join(dist, "index.html"), "<!doctype html><title>Psycray</title>")
  writeFileSync(join(dist, "assets", "app-abc123.js"), "console.log(1)")
  writeFileSync(join(tmpdir(), "outside-secret.txt"), "nope")

  app = await start({ host: "127.0.0.1", port: 0, distDir: dist, n8nBase: n8nUrl, n8nSecret: SECRET })
  appUrl = `http://127.0.0.1:${(app.address() as { port: number }).port}`
})

after(() => {
  app?.close()
  n8n?.close()
})

describe("static app", () => {
  it("serves index.html with no-cache", async () => {
    const r = await fetch(appUrl + "/")
    assert.equal(r.status, 200)
    assert.equal(r.headers.get("cache-control"), "no-cache")
    assert.match(await r.text(), /Psycray/)
  })

  it("serves hashed assets as immutable", async () => {
    const r = await fetch(appUrl + "/assets/app-abc123.js")
    assert.equal(r.status, 200)
    assert.match(r.headers.get("content-type")!, /javascript/)
    assert.match(r.headers.get("cache-control")!, /immutable/)
  })

  it("client-side routes can be opened or refreshed directly", async () => {
    for (const path of ["/companies", "/companies/basecamp.com", "/icp?company=x", "/research"]) {
      const r = await fetch(appUrl + path)
      assert.equal(r.status, 200, path)
      assert.match(await r.text(), /Psycray/, path)
    }
  })

  it("missing assets are real 404s, not the app", async () => {
    assert.equal((await fetch(appUrl + "/assets/gone.js")).status, 404)
    assert.equal((await fetch(appUrl + "/favicon-missing.png")).status, 404)
  })

  it("never serves files outside dist/", async () => {
    for (const path of ["/../outside-secret.txt", "/%2e%2e/outside-secret.txt", "/assets/..%2f..%2foutside-secret.txt"]) {
      const r = await fetch(appUrl + path)
      assert.notEqual(await r.text(), "nope", path)
    }
  })

  it("sends basic security headers", async () => {
    const r = await fetch(appUrl + "/")
    assert.equal(r.headers.get("x-content-type-options"), "nosniff")
    assert.equal(r.headers.get("x-frame-options"), "DENY")
  })

  it("has a health check", async () => {
    assert.deepEqual(await (await fetch(appUrl + "/healthz")).json(), { ok: true })
  })
})

describe("n8n proxy", () => {
  it("rewrites /api/* onto the webhook base and adds the secret", async () => {
    const r = await fetch(appUrl + "/api/research/status?id=abc")
    assert.equal(r.status, 200)
    const last = seen.at(-1)!
    assert.equal(last.url, "/webhook/psycray/research/status?id=abc")
    assert.equal(last.key, SECRET)
  })

  it("drops a secret or cookies sent by the browser", async () => {
    await fetch(appUrl + "/api/companies", { headers: { "X-Psycray-Key": "attacker", Cookie: "a=b" } })
    const last = seen.at(-1)!
    assert.equal(last.key, SECRET)
    assert.equal(last.cookie, undefined)
  })

  it("forwards POST bodies", async () => {
    await fetch(appUrl + "/api/research", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ input: "basecamp.com" }) })
    assert.equal(seen.at(-1)!.body, '{"input":"basecamp.com"}')
  })

  it("passes n8n status codes through, and never returns the secret", async () => {
    const r = await fetch(appUrl + "/api/missing")
    assert.equal(r.status, 404)
    assert.doesNotMatch(await r.text(), new RegExp(SECRET))
  })

  it("rejects other methods and oversized bodies", async () => {
    assert.equal((await fetch(appUrl + "/api/companies", { method: "DELETE" })).status, 405)
    const big = "x".repeat(300 * 1024)
    assert.equal((await fetch(appUrl + "/api/icp/interpret", { method: "POST", body: big })).status, 413)
  })

  it("explains when n8n can't be reached", async () => {
    const down = createHandler({ distDir: ".", n8nBase: "http://127.0.0.1:9/x", n8nSecret: SECRET })
    const s = http.createServer(down)
    await new Promise<void>((r) => s.listen(0, "127.0.0.1", r))
    const r = await fetch(`http://127.0.0.1:${(s.address() as { port: number }).port}/api/companies`)
    s.close()
    assert.equal(r.status, 502)
    assert.match((await r.json()).error, /couldn't be reached/)
  })
})

describe("configuration", () => {
  it("refuses to start without the n8n settings", () => {
    assert.throws(() => createHandler({ distDir: ".", n8nBase: "", n8nSecret: SECRET }), /N8N_WEBHOOK_BASE/)
    assert.throws(() => createHandler({ distDir: ".", n8nBase: "http://x", n8nSecret: "" }), /N8N_WEBHOOK_SECRET/)
  })
})
