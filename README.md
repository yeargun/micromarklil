# @itslil/micromark

<!-- current-build-audit -->
**Build audit, 2026-09-10:** [blocked; compiler, machine, build times, version gaps and behavior checks](https://yeargun.github.io/micromarklil/#build-audit). The [JSON receipt](site/build-audit.json) records the current comparison; older benchmark prose retains its original scope.


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
| **closed** | `lilscript.closed.toml` · `--target js-module` | closed LilScript world. `extern class` keys may mangle. ESM export names stay so the lane is testable. |

You publish the library lane. The closed artifact is `dist/micromark.closed.js`.

The LilScript compiler lives next door at `../lilscript`.
