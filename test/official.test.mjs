import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, it } from "node:test"
import { marked } from "marked"
import { micromark } from "../dist/micromark.esm.js"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")

function loadSpecCases() {
  const cases = []
  for (const file of ["commonmark.0.31.2.json", "gfm.0.29.json"]) {
    for (const test of JSON.parse(readFileSync(resolve(root, "test/specs", file), "utf8"))) {
      if (test.shouldFail) continue
      cases.push({
        file,
        example: test.example,
        section: test.section,
        markdown: test.markdown,
        gfm: file.startsWith("gfm"),
      })
    }
  }
  return cases
}

describe("official CommonMark + GFM corpus", () => {
  it("matches marked HTML on all 660 cases", () => {
    const cases = loadSpecCases()
    const fail = []
    for (const test of cases) {
      const opt = { gfm: test.gfm, allowDangerousHtml: true }
      const html = micromark(test.markdown, opt)
      const official = marked.parse(test.markdown, {
        gfm: test.gfm,
        breaks: false,
        pedantic: false,
        silent: false,
      })
      if (html !== official) fail.push(`${test.file}#${test.example} ${test.section}`)
    }
    assert.equal(fail.length, 0, fail.slice(0, 12).join(", "))
    assert.equal(cases.length, 660)
  })
})
