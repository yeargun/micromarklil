# @itslil/micromark

micromark markdown compiler reimplemented in LilScript. This is **not** the official [`micromark`](https://github.com/micromark/micromark) package.

**Site:** [yeargun.github.io/micromarklil/](https://yeargun.github.io/micromarklil/)

```sh
npm install @itslil/micromark
```

Two compiles ship from the same `.lil` source:

| Lane | Config | Meaning |
| --- | --- | --- |
| **library** (npm) | `lilscript.toml` · `--target js-module` | reusable ESM. Export names and `extern class` keys stay. |
| **closed** | `lilscript.closed.toml` · `--target js-module` | closed LilScript world. `extern class` keys may mangle. ESM export names stay so the lane is testable. |

You publish the library lane. The closed artifact is `dist/micromark.closed.js`.

The LilScript compiler lives next door at `../lilscript`.
