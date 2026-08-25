import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { micromark } from "../dist/micromark.esm.js"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")

describe("micromark", () => {
  it("renders headings", () => {
    const html = micromark("# hi")
    assert.match(html, /<h1>/)
    assert.match(html, /hi/)
    assert.match(html, /<\/h1>/)
  })

  it("renders gfm tables", () => {
    const html = micromark("| a | b |\n| --- | --- |\n| 1 | 2 |", { gfm: true })
    assert.match(html, /<table>/)
    assert.match(html, /<th>/)
    assert.match(html, /<td>/)
  })

  it("renders fenced code with language class", () => {
    const html = micromark("```js\nfoo()\n```")
    assert.match(html, /<pre>/)
    assert.match(html, /<code/)
    assert.match(html, /language-js/)
    assert.match(html, /foo\(\)/)
  })

  it("renders lists, emphasis, and links", () => {
    const html = micromark("- *a* and [b](https://ex.com \"t\")")
    assert.match(html, /<ul>/)
    assert.match(html, /<li>/)
    assert.match(html, /<em>/)
    assert.match(html, /<a href="https:\/\/ex.com"/)
    assert.match(html, /title="t"/)
  })

  it("renders gfm url autolinks", () => {
    const html = micromark("see https://a.com now", { gfm: true })
    assert.match(html, /<a href="https:\/\/a.com">https:\/\/a.com<\/a>/)
  })

  it("renders task checkboxes", () => {
    const html = micromark("- [x] done", { gfm: true })
    assert.match(html, /type="checkbox"/)
    assert.match(html, /checked/)
  })

  it("escapes raw html unless allowed", () => {
    const safe = micromark("<div>x</div>")
    assert.match(safe, /&lt;div&gt;/)
    const raw = micromark("<div>x</div>", { allowDangerousHtml: true })
    assert.match(raw, /<div>x<\/div>/)
  })
})

describe("closed", () => {
  it("exists and still renders headings", async () => {
    assert.equal(existsSync(resolve(root, "dist/micromark.closed.js")), true)
    const closed = await import("../dist/micromark.closed.js")
    assert.match(closed.micromark("# hi"), /<h1>/)
  })
})

describe("pins", () => {
  it("keeps option keys in the library artifact", () => {
    const src = readFileSync(resolve(root, "dist/micromark.esm.js"), "utf8")
    assert.match(src, /gfm/)
    assert.match(src, /breaks/)
    assert.match(src, /allowDangerousHtml/)
    assert.match(src, / as micromark/)
  })
})
