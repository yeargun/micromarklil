import {
  accessSync,
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
import { build as esbuild } from "esbuild"

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..")
const lilscriptRoot = process.env.LILSCRIPT_ROOT ?? resolve(root, "..", "lilscript")
const dist = resolve(root, "dist")
const file = "micromark"
const banner = "/*! @itslil/micromark 4.0.3 | LilScript reimplementation of micromark | MIT */\n"

function compilerPath() {
  const candidates = [
    process.env.LILSCRIPT_COMPILER,
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
  const result = spawnSync(cmd, args, { cwd: root, stdio: "inherit" })
  if (result.status !== 0) process.exit(result.status ?? 1)
}

function compileLil(compiler, sourceName, configName, outputName) {
  run(compiler, [
    resolve(root, sourceName),
    "--target",
    "js-module",
    "--config",
    resolve(root, configName),
    "-o",
    resolve(dist, outputName),
  ])
}

function compileIfRequested() {
  const generated = [
    `${file}.raw.js`,
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

compileIfRequested()
mkdirSync(dist, { recursive: true })

const rawPath = resolve(dist, `${file}.raw.js`)
if (!existsSync(rawPath)) {
  throw new Error(`dist/${file}.raw.js is missing. Run with --compile after building LilScript.`)
}

writeFileSync(
  resolve(dist, `${file}.stream.js`),
  `${banner}import {EventEmitter} from "node:events";\n${readFileSync(resolve(dist, `${file}.stream.raw.js`), "utf8").trimEnd()}\n`,
)

await esbuild({
  absWorkingDir: dist,
  stdin: {
    contents: `export {compile,micromark,parse,postprocess,preprocess} from "./${file}.raw.js"`,
    resolveDir: dist,
    sourcefile: `${file}.public.js`,
  },
  outfile: resolve(dist, `${file}.esm.js`),
  bundle: true,
  format: "esm",
  platform: "neutral",
  legalComments: "none",
  // Without this esbuild prints every non-ASCII character as a `\uXXXX` escape:
  // six ASCII bytes where the literal character is two or three UTF-8 ones. The
  // compiler emits 2304 of them literally in dist/micromark.raw.js and the bundle
  // turned all 2304 into escapes, which is 7021 raw bytes and 173 Brotli.
  charset: "utf8",
  minifyWhitespace: true,
  // 8.7 (measured): bundling the public five exports out of micromark.raw.js
  // merges our module scope with the entry's, and esbuild then renames every
  // shadowed inner binding with a digit suffix -- 3,078 mentions of `a2`, `b2`,
  // `r2` in the shipped ESM against 6 in the file the compiler wrote. Letting
  // esbuild mangle instead removes all of them: -2,760 raw, -99 Brotli.
  minifyIdentifiers: true,
  // The compiler already picked the shorter spellings, and esbuild un-picks them
  // when it re-prints without minifySyntax: `!0` comes back out as `true`. That
  // cost this artifact all 87 of its compact booleans -- 0 left in the bundle
  // against 87 in dist/micromark.raw.js -- for 4538 raw bytes and 266 Brotli.
  minifySyntax: true,
  banner: { js: banner },
  logLevel: "error",
})

await esbuild({
  absWorkingDir: dist,
  entryPoints: [resolve(dist, `${file}.esm.js`)],
  outfile: resolve(dist, `${file}.cjs`),
  bundle: true,
  format: "cjs",
  platform: "neutral",
  legalComments: "none",
  // Without this esbuild prints every non-ASCII character as a `\uXXXX` escape:
  // six ASCII bytes where the literal character is two or three UTF-8 ones. The
  // compiler emits 2304 of them literally in dist/micromark.raw.js and the bundle
  // turned all 2304 into escapes, which is 7021 raw bytes and 173 Brotli.
  charset: "utf8",
  minifyWhitespace: true,
  minifyIdentifiers: false,
  minifySyntax: true,
  banner: { js: banner },
  logLevel: "error",
})

await esbuild({
  absWorkingDir: dist,
  entryPoints: [resolve(dist, `${file}.stream.js`)],
  outfile: resolve(dist, `${file}.stream.cjs`),
  bundle: true,
  external: ["node:events"],
  format: "cjs",
  platform: "neutral",
  legalComments: "none",
  // Without this esbuild prints every non-ASCII character as a `\uXXXX` escape:
  // six ASCII bytes where the literal character is two or three UTF-8 ones. The
  // compiler emits 2304 of them literally in dist/micromark.raw.js and the bundle
  // turned all 2304 into escapes, which is 7021 raw bytes and 173 Brotli.
  charset: "utf8",
  minifyWhitespace: true,
  minifyIdentifiers: false,
  minifySyntax: true,
  banner: { js: banner },
  logLevel: "error",
})

await esbuild({
  absWorkingDir: dist,
  entryPoints: [resolve(dist, `${file}.esm.js`)],
  outfile: resolve(dist, `${file}.umd.js`),
  bundle: true,
  format: "iife",
  globalName: "micromark",
  footer: {
    js: `globalThis.micromark=micromark.default||micromark.micromark||micromark;`,
  },
  legalComments: "none",
  // Without this esbuild prints every non-ASCII character as a `\uXXXX` escape:
  // six ASCII bytes where the literal character is two or three UTF-8 ones. The
  // compiler emits 2304 of them literally in dist/micromark.raw.js and the bundle
  // turned all 2304 into escapes, which is 7021 raw bytes and 173 Brotli.
  charset: "utf8",
  minifyWhitespace: true,
  minifyIdentifiers: false,
  minifySyntax: true,
  banner: { js: banner },
  logLevel: "error",
})

copyFileSync(resolve(root, "types", `${file}.d.ts`), resolve(dist, `${file}.d.ts`))
copyFileSync(
  resolve(root, "types", `${file}.stream.d.ts`),
  resolve(dist, `${file}.stream.d.ts`),
)
console.log(
  `wrote dist/${file}.esm.js, dist/${file}.cjs, dist/${file}.umd.js, dist/${file}.closed.js, dist/${file}.stream.js, dist/${file}.stream.cjs, dist/${file}.test.js`,
)
