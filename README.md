# @itslil/micromark



Official [`micromark@4.0.2`](https://github.com/micromark/micromark) algorithms rewritten in LilScript. Official test suite 1927/1927. Not affiliated with upstream.

**Site:** [yeargun.github.io/micromarklil/](https://yeargun.github.io/micromarklil/)

```sh
npm install @itslil/micromark
```

The package mirrors micromark's public entry points:

```js
import {micromark} from '@itslil/micromark'
import {stream} from '@itslil/micromark/stream'
```

Two compiles ship from the same `.lil` source:

| Lane | Config | Meaning |
| --- | --- | --- |
| **library** (npm) | `lilscript.toml` · `--target js-module` | reusable ESM. Export names and `extern class` keys stay. |
| **closed** | `lilscript.closed.toml` · `--target js-module` | the same source under the conservative production policy. ESM export names stay so the lane is testable. |

You publish the library lane. The closed artifact is `dist/micromark.closed.js`.

Every delivered file is the compiler's own output. `scripts/build.mjs` adds a license banner and, for
the CommonJS files and the browser script, a module wrapper around the compiler's program; no
minifier runs after the compiler. `scripts/record-release.mjs` builds three times, checks the builds
agree byte for byte, and records the sizes, the compile wall time, the official suite and a
throughput sample in `site/results.json`, which the site renders next to the Terser and esbuild bars.

The LilScript compiler lives next door at `../lilscript`; set `LILSCRIPT_COMPILER` and
`LILSCRIPT_CODEC` to build with a pinned binary.
