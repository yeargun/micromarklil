function $(id) { return document.getElementById(id) }
function copyButtons() {
  for (const button of document.querySelectorAll("[data-copy]")) {
    button.addEventListener("click", async () => {
      await navigator.clipboard.writeText(button.dataset.copy)
      button.textContent = "copied"
      setTimeout(() => { button.textContent = "copy" }, 1200)
    })
  }
}
function samples(items, apply) {
  const root = $("samples")
  for (const item of items) {
    const button = document.createElement("button")
    button.type = "button"
    button.textContent = item.label
    button.addEventListener("click", () => apply(item.value))
    root.append(button)
  }
}
function showText(value) {
  $("output").hidden = false
  $("output").textContent = value
  $("preview").hidden = true
  $("frame").hidden = true
}
function showHtml(html) {
  $("output").hidden = false
  $("output").textContent = html
  $("preview").hidden = true
  $("frame").hidden = false
  $("frame").srcdoc = `<!doctype html><style>body{font:16px/1.55 system-ui;margin:16px}table{border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px 8px}blockquote{border-left:3px solid #e3b341;padding-left:12px;color:#555}</style>${html}`
}
function showPreview(html) {
  $("output").hidden = false
  $("preview").hidden = false
  $("frame").hidden = true
  $("preview").innerHTML = html
}
copyButtons()

import { micromark } from "./micromark.js"
const input = $("input")
const gfm = Object.assign(document.createElement("label"), { innerHTML: '<input type="checkbox" id="gfm" checked> gfm' })
const html = Object.assign(document.createElement("label"), { innerHTML: '<input type="checkbox" id="raw"> allowDangerousHtml' })
$("toggles").append(gfm, html)
samples([
  { label: "GFM", value: "# Lab\n\n- [x] tasks\n- [ ] tables\n\n| a | b |\n| --- | --- |\n| 1 | 2 |\n\nAutolink: https://yeargun.github.io/micromarklil/\n" },
  { label: "code", value: "Paragraph with `code` and **bold**.\n\n```js\nconsole.log(1)\n```\n" },
  { label: "quote", value: "> blockquote\n>\n> still quoted\n\n---\n\n[link](https://example.com \"t\")\n" },
], (value) => { input.value = value; render() })
input.value = "# @itslil/micromark\n\nA [micromark](https://github.com/micromark/micromark) port in **LilScript**.\n\n- [x] CommonMark\n- [x] GFM\n\n| Lane | File |\n| --- | --- |\n| library | dist/micromark.esm.js |\n| closed | dist/micromark.closed.js |\n"
function render() {
  try {
    const out = micromark(input.value, {
      gfm: $("gfm").checked,
      allowDangerousHtml: $("raw").checked,
    })
    showHtml(out)
  } catch (error) {
    showText(String(error))
  }
}
input.addEventListener("input", render)
$("gfm").addEventListener("change", render)
$("raw").addEventListener("change", render)
render()
