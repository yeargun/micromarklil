import assert from 'node:assert/strict'
import {createRequire} from 'node:module'
import test from 'node:test'

import * as micromarkModule from '@itslil/micromark'
import * as streamModule from '@itslil/micromark/stream'
import {gfm, gfmHtml} from 'micromark-extension-gfm'
import {micromark as closedMicromark} from '../dist/micromark.closed.js'

const require = createRequire(import.meta.url)

test('public package exports', async function (t) {
  await t.test('exposes the upstream root surface in ESM', function () {
    assert.deepEqual(Object.keys(micromarkModule).sort(), [
      'compile',
      'micromark',
      'parse',
      'postprocess',
      'preprocess'
    ])
  })

  await t.test('exposes the stream subpath in ESM', function () {
    assert.deepEqual(Object.keys(streamModule), ['stream'])
    assert.equal(typeof streamModule.stream, 'function')
  })

  await t.test('exposes both entry points to CommonJS', function () {
    const main = require('@itslil/micromark')
    assert.deepEqual(Object.keys(main).sort(), [
      'compile',
      'micromark',
      'parse',
      'postprocess',
      'preprocess'
    ])
    assert.deepEqual(Object.keys(require('@itslil/micromark/stream')), ['stream'])
  })

  await t.test('accepts real syntax and HTML extension objects', function () {
    assert.match(
      micromarkModule.micromark('| a |\n| - |', {
        extensions: [gfm()],
        htmlExtensions: [gfmHtml()]
      }),
      /<table>/
    )
  })

  await t.test('keeps the browser and closed artifacts executable', async function () {
    assert.equal(closedMicromark('# closed'), '<h1>closed</h1>')
    await import('../dist/micromark.umd.js')
    assert.equal(globalThis.micromark('# browser'), '<h1>browser</h1>')
    delete globalThis.micromark
  })
})

test('tokenizer boundary semantics', async function (t) {
  await t.test('reads each initial point field once', function () {
    const reads = []
    const from = new Proxy(
      {line: 2, column: 3, offset: 4},
      {
        get(target, key, receiver) {
          reads.push(key)
          return Reflect.get(target, key, receiver)
        }
      }
    )

    assert.deepEqual(micromarkModule.parse().document(from).now(), {
      _bufferIndex: -1,
      _index: 0,
      line: 2,
      column: 3,
      offset: 4
    })
    assert.deepEqual(reads, ['line', 'column', 'offset'])
  })

  await t.test('accepts an inherited tokenize hook', function () {
    assert.equal(
      micromarkModule.micromark('!', {
        extensions: [{text: {33: nestedAttempt(false)}}]
      }),
      '<p>!</p>'
    )
  })

  await t.test('calls a truthy resolver and preserves its error', function () {
    assert.throws(
      () =>
        micromarkModule.micromark('!', {
          extensions: [{text: {33: nestedAttempt(true)}}]
        }),
      TypeError
    )
  })
})

function nestedAttempt(invalidResolver) {
  const construct = Object.create({
    tokenize(effects, ok, nok) {
      return function start(code) {
        if (code !== 33) return nok(code)
        effects.enter('data')
        effects.consume(code)
        effects.exit('data')
        return ok
      }
    }
  })

  if (invalidResolver) construct.resolve = 1

  return {
    tokenize(effects, ok, nok) {
      return function start(code) {
        return effects.attempt(construct, ok, nok)(code)
      }
    }
  }
}
