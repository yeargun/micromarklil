import {
  accessSync,
  appendFileSync,
  constants,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { spawnSync } from "node:child_process"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const lilscriptRoot = process.env.LILSCRIPT_ROOT ?? resolve(root, "..", "lilscript")
const dist = resolve(root, "dist")
const file = "micromark"
const banner = "/*! @itslil/micromark 4.0.3 | LilScript reimplementation of micromark | MIT */\n"
const publicApi = ["compile", "micromark", "parse", "postprocess", "preprocess"]

function compilerPath() {
  // A pinned compiler is used or the build fails; it never falls back to another binary.
  if (process.env.LILSCRIPT_COMPILER) {
    accessSync(process.env.LILSCRIPT_COMPILER, constants.X_OK)
    return process.env.LILSCRIPT_COMPILER
  }
  const candidates = [
    resolve(lilscriptRoot, "target", "release", "lilscript"),
    resolve(lilscriptRoot, "target", "debug", "lilscript"),
  ].filter(Boolean)
  for (const candidate of candidates) {
    try {
      accessSync(candidate, constants.X_OK)
      return candidate
    } catch {}
  }
  return null
}

function run(cmd, args) {
  const started = process.hrtime.bigint()
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit" })
  if (result.status !== 0) process.exit(result.status ?? 1)
  return Number(process.hrtime.bigint() - started) / 1e6
}

// LILSCRIPT_COMPILE_LOG names a file that receives one JSON line per compiler
// invocation with its wall time; scripts/record-release.mjs reads it for the site.
function compileLil(compiler, sourceName, configName, outputName) {
  const wallMs = run(compiler, [
    resolve(root, sourceName),
    "--target",
    "js-module",
    "--config",
    resolve(root, configName),
    "-o",
    resolve(dist, outputName),
  ])
  if (process.env.LILSCRIPT_COMPILE_LOG) {
    appendFileSync(
      process.env.LILSCRIPT_COMPILE_LOG,
      `${JSON.stringify({ source: sourceName, config: configName, output: outputName, wallMs })}\n`,
    )
  }
}

function compileIfRequested() {
  const generated = [
    `${file}.raw.js`,
    `${file}.closed.js`,
    `${file}.stream.raw.js`,
    `${file}.test.js`,
  ]
  if (
    !process.argv.includes("--compile") &&
    generated.every((name) => existsSync(resolve(dist, name)))
  ) {
    return
  }
  const compiler = compilerPath()
  if (!compiler) {
    throw new Error("LilScript compiler not found. Set LILSCRIPT_COMPILER or build lilscript.")
  }
  mkdirSync(dist, { recursive: true })
  compileLil(compiler, "src/index.lil", "lilscript.toml", `${file}.raw.js`)
  compileLil(compiler, "src/index.lil", "lilscript.closed.toml", `${file}.closed.js`)
  compileLil(compiler, "src/stream.lil", "lilscript.toml", `${file}.stream.raw.js`)
  compileLil(compiler, "test/support.lil", "lilscript.toml", `${file}.test.js`)
}

// The compiler writes an ES module whose last statement is its export clause.
// Every delivered file is that text: the ESM as written, and the CommonJS and
// browser builds with the clause replaced by a module wrapper. No minifier runs
// over the compiler's output.
function splitExports(text, expected, label) {
  const match = /;?export\s*\{([^}]*)\}\s*;?\s*$/.exec(text)
  if (!match) throw new Error(`${label}: the compiler's artifact has no trailing export clause`)
  const bindings = match[1].split(",").map((entry) => {
    const [local, exported = local] = entry.trim().split(/\s+as\s+/)
    return { local, exported }
  })
  const names = bindings.map(({ exported }) => exported).sort()
  if (names.join(",") !== [...expected].sort().join(",")) {
    throw new Error(`${label}: exports ${names.join(",")}, expected ${[...expected].sort().join(",")}`)
  }
  if (/\bimport\s*[{*\s"']|\bimport\.meta\b|\bexport\s/.test(text.slice(0, match.index))) {
    throw new Error(`${label}: module syntax outside the trailing export clause`)
  }
  return { body: `${text.slice(0, match.index)};`, bindings }
}

function objectOf(bindings) {
  return `{${bindings
    .map(({ local, exported }) => (local === exported ? local : `${exported}:${local}`))
    .join(",")}}`
}

function readCompiled(name) {
  const path = resolve(dist, name)
  if (!existsSync(path)) {
    throw new Error(`dist/${name} is missing. Run with --compile after building LilScript.`)
  }
  return readFileSync(path, "utf8").trimEnd()
}

compileIfRequested()
mkdirSync(dist, { recursive: true })

const raw = readCompiled(`${file}.raw.js`)
const main = splitExports(raw, publicApi, `${file}.raw.js`)
writeFileSync(resolve(dist, `${file}.esm.js`), `${banner}${raw}\n`)
writeFileSync(
  resolve(dist, `${file}.cjs`),
  `${banner}"use strict";${main.body}module.exports=${objectOf(main.bindings)};\n`,
)
// The browser build is a classic script: one function scope around the
// compiler's program, and `micromark` on the global object, as upstream's
// UMD consumers expect.
const micromarkLocal = main.bindings.find(({ exported }) => exported === "micromark").local
writeFileSync(
  resolve(dist, `${file}.umd.js`),
  `${banner}(function(){"use strict";${main.body}globalThis.micromark=${micromarkLocal}})();\n`,
)

const closed = readCompiled(`${file}.closed.js`)
splitExports(closed, publicApi, `${file}.closed.js`)

// The stream entry reads EventEmitter from node:events, as upstream does.
const streamRaw = readCompiled(`${file}.stream.raw.js`)
const stream = splitExports(streamRaw, ["stream"], `${file}.stream.raw.js`)
writeFileSync(
  resolve(dist, `${file}.stream.js`),
  `${banner}import {EventEmitter} from "node:events";\n${streamRaw}\n`,
)
writeFileSync(
  resolve(dist, `${file}.stream.cjs`),
  `${banner}"use strict";const{EventEmitter}=require("node:events");${stream.body}module.exports=${objectOf(stream.bindings)};\n`,
)

copyFileSync(resolve(root, "types", `${file}.d.ts`), resolve(dist, `${file}.d.ts`))
copyFileSync(
  resolve(root, "types", `${file}.stream.d.ts`),
  resolve(dist, `${file}.stream.d.ts`),
)
console.log(
  `wrote dist/${file}.esm.js, dist/${file}.cjs, dist/${file}.umd.js, dist/${file}.closed.js, dist/${file}.stream.js, dist/${file}.stream.cjs, dist/${file}.test.js from the compiler's output`,
)
