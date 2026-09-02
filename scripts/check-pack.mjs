import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

const json = execFileSync("npm", ["pack", "--dry-run", "--json"], { encoding: "utf8" })
const result = JSON.parse(json)[0]
const file = "micromark"
const required = new Set([
  `dist/${file}.esm.js`,
  `dist/${file}.cjs`,
  `dist/${file}.umd.js`,
  `dist/${file}.closed.js`,
  `dist/${file}.stream.js`,
  `dist/${file}.stream.cjs`,
  `dist/${file}.stream.d.ts`,
  `dist/${file}.d.ts`,
  "src/index.lil",
  "src/stream.lil",
  "src/util-decode-numeric-character-reference.lil",
  "LICENSE",
  "NOTICE.md",
  "README.md",
])
const files = new Set(result.files.map(({ path }) => path))
for (const path of required) {
  if (!files.has(path)) throw new Error(`npm tarball is missing ${path}`)
}
for (const path of [
  `dist/${file}.test.js`,
  `dist/${file}.util.js`,
  "src/entry.lil",
  "src/util-decode-numeric.lil",
]) {
  if (files.has(path)) throw new Error(`npm tarball contains stale or internal ${path}`)
}
const manifest = JSON.parse(readFileSync("package.json", "utf8"))
if (manifest.name !== "@itslil/micromark") throw new Error("unexpected package name")
const stream = manifest.exports?.["./stream"]
if (
  stream?.types !== `./dist/${file}.stream.d.ts` ||
  stream?.import !== `./dist/${file}.stream.js` ||
  stream?.require !== `./dist/${file}.stream.cjs`
) {
  throw new Error("unexpected stream export")
}
const dependencies = Object.keys(manifest.dependencies ?? {})
if (JSON.stringify(dependencies.sort()) !== JSON.stringify(["@types/node", "micromark-util-types"])) {
  throw new Error("unexpected declaration dependencies")
}
console.log(`npm pack: ${result.entryCount} files, ${result.size} bytes packed, ${result.unpackedSize} bytes unpacked`)
