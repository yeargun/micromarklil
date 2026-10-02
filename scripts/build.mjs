import {dirname, resolve} from 'node:path'
import {fileURLToPath} from 'node:url'
import {buildPackage} from './compiler-package.mjs'
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
await buildPackage({root,
  profiles:[{name:'public',config:'lilscript.toml'},{name:'closed',config:'lilscript.closed.toml'}],
  aliases:{'micromark.raw.js':'micromark.esm.js','micromark.stream.raw.js':'micromark.stream.js'},
  assets:[{source:'types/micromark.d.ts',destination:'micromark.d.ts'},{source:'types/micromark.stream.d.ts',destination:'micromark.stream.d.ts'}]})
