import assert from 'node:assert/strict'
import {errorMonitor, EventEmitter} from 'node:events'
import {createRequire} from 'node:module'
import {PassThrough} from 'node:stream'
import test from 'node:test'

import {stream} from '@itslil/micromark/stream'

const require = createRequire(import.meta.url)
const commonJsStream = require('@itslil/micromark/stream').stream

test('stream EventEmitter compatibility', async function (t) {
  await t.test('uses the upstream runtime dependency in ESM and CJS', function () {
    for (const emitter of [stream(), commonJsStream()]) {
      assert(emitter instanceof EventEmitter)
      assert.equal(Object.getPrototypeOf(emitter), EventEmitter.prototype)
      for (const name of [
        'addListener',
        'emit',
        'eventNames',
        'getMaxListeners',
        'listenerCount',
        'listeners',
        'off',
        'on',
        'once',
        'prependListener',
        'prependOnceListener',
        'rawListeners',
        'removeAllListeners',
        'removeListener',
        'setMaxListeners'
      ]) {
        assert.equal(emitter[name], EventEmitter.prototype[name], name)
      }
      assert.equal(emitter.on, emitter.addListener)
      assert.equal(emitter.off, emitter.removeListener)
      assert.deepEqual(Object.keys(emitter).slice(-5), [
        'end',
        'pipe',
        'readable',
        'writable',
        'write'
      ])
    }
  })

  await t.test('supports string and symbol names and variadic arguments', function () {
    const emitter = stream()
    const symbol = Symbol('symbol event')
    const calls = []

    emitter.on('event', function (...values) {
      calls.push(['on', this, ...values])
    })
    emitter.prependListener('event', function (...values) {
      calls.push(['prepend', this, ...values])
    })
    emitter.on(symbol, function (...values) {
      calls.push(['symbol', this, ...values])
    })

    assert.equal(emitter.emit('missing'), false)
    assert.equal(emitter.emit('event', 1, undefined, 3, 4), true)
    assert.equal(emitter.emit(symbol, 'value'), true)
    assert.deepEqual(calls, [
      ['prepend', emitter, 1, undefined, 3, 4],
      ['on', emitter, 1, undefined, 3, 4],
      ['symbol', emitter, 'value']
    ])
    assert.deepEqual(emitter.eventNames(), ['event', symbol])
  })

  await t.test('uses snapshots while emitting and removes latest duplicates', function () {
    const emitter = stream()
    const calls = []
    const duplicate = () => calls.push('duplicate')
    const second = () => calls.push('second')

    emitter.on('event', function () {
      calls.push('first')
      emitter.removeListener('event', second)
    })
    emitter.on('event', second)
    emitter.emit('event')
    assert.deepEqual(calls, ['first', 'second'])

    emitter.removeAllListeners()
    emitter.on('event', duplicate)
    emitter.once('event', duplicate)
    emitter.removeListener('event', duplicate)
    assert.deepEqual(emitter.rawListeners('event'), [duplicate])
  })

  await t.test('implements once wrappers and listener introspection', function () {
    const emitter = stream()
    const calls = []
    function listener(...values) {
      calls.push([this, ...values])
      emitter.emit('event', 'nested')
    }

    emitter.once('event', listener)
    assert.deepEqual(emitter.listeners('event'), [listener])
    const raw = emitter.rawListeners('event')
    assert.equal(raw.length, 1)
    assert.notEqual(raw[0], listener)
    assert.equal(raw[0].listener, listener)
    assert.equal(emitter.listenerCount('event'), 1)
    assert.equal(emitter.listenerCount('event', listener), 1)
    emitter.emit('event', 'outer', 2)
    assert.deepEqual(calls, [[emitter, 'outer', 2]])
    assert.equal(emitter.listenerCount('event'), 0)

    emitter.prependOnceListener('event', listener)
    emitter.removeListener('event', listener)
    assert.equal(emitter.emit('event'), false)
  })

  await t.test('emits newListener and removeListener with Node ordering', function () {
    const emitter = stream()
    const calls = []
    const listener = () => {}

    emitter.on('removeListener', function (name, removed) {
      if (name === 'event') {
        calls.push(['remove', name, removed, emitter.listenerCount(name)])
      }
    })
    emitter.once('newListener', function (name, added) {
      if (name === 'event') {
        calls.push(['new', name, added, emitter.listenerCount(name)])
        emitter.on(name, () => calls.push(['inserted']))
      }
    })
    emitter.on('event', listener)
    assert.equal(emitter.listeners('event')[1], listener)
    emitter.removeListener('event', listener)
    assert.deepEqual(calls, [
      ['new', 'event', listener, 0],
      ['remove', 'event', listener, 1]
    ])
  })

  await t.test('removes all listeners in LIFO order', function () {
    const emitter = stream()
    const removed = []
    const first = () => {}
    const second = () => {}

    emitter.on('removeListener', (name, listener) => {
      if (name === 'event') removed.push(listener)
    })
    emitter.on('event', first)
    emitter.on('event', second)
    assert.equal(emitter.removeAllListeners('event'), emitter)
    assert.deepEqual(removed, [second, first])
    assert.deepEqual(emitter.eventNames(), ['removeListener'])
    assert.equal(emitter.removeAllListeners(), emitter)
    assert.deepEqual(emitter.eventNames(), [])
  })

  await t.test('validates listeners and max listeners like Node', function () {
    const emitter = stream()

    for (const name of [
      'addListener',
      'on',
      'once',
      'prependListener',
      'prependOnceListener',
      'removeListener',
      'off'
    ]) {
      assert.throws(
        () => emitter[name]('event', undefined),
        (error) =>
          error instanceof TypeError && error.code === 'ERR_INVALID_ARG_TYPE',
        name
      )
    }

    assert.equal(emitter.getMaxListeners(), EventEmitter.defaultMaxListeners)
    assert.equal(emitter.setMaxListeners(0), emitter)
    assert.equal(emitter.getMaxListeners(), 0)
    assert.throws(
      () => emitter.setMaxListeners(-1),
      (error) => error instanceof RangeError && error.code === 'ERR_OUT_OF_RANGE'
    )
  })

  await t.test('preserves unhandled Error identity', function () {
    const emitter = stream()
    const error = new Error('identity')

    assert.throws(
      () => emitter.emit('error', error),
      (thrown) => thrown === error
    )
  })

  await t.test('monitors errors without handling them', function () {
    const emitter = stream()
    const error = new Error('monitored')
    let monitored
    emitter.on(errorMonitor, (value) => {
      monitored = value
    })

    assert.throws(
      () => emitter.emit('error', error),
      (thrown) => thrown === error
    )
    assert.equal(monitored, error)
  })

  await t.test('uses Node non-Error error-event behavior', function () {
    const emitter = stream()
    const context = {problem: true}

    assert.throws(
      () => emitter.emit('error', context),
      (error) =>
        error.code === 'ERR_UNHANDLED_ERROR' && error.context === context
    )
  })
})

test('stream pipe compatibility', async function (t) {
  await t.test('returns and identifies the destination', function () {
    const source = stream()
    const destination = new PassThrough()
    let piped

    destination.on('pipe', (value) => {
      piped = value
    })
    assert.equal(source.pipe(destination), destination)
    assert.equal(piped, source)
    source.end()
  })

  await t.test('ignores destination backpressure like upstream', function () {
    const source = stream()
    const events = []
    const destination = new EventEmitter()
    destination.writable = true
    destination.write = (value) => {
      events.push(['write', value])
      return false
    }
    destination.end = () => events.push(['end'])

    source.pipe(destination)
    assert.equal(source.write('alpha'), true)
    assert.deepEqual(events, [])
    assert.equal(source.end('bravo'), true)
    assert.deepEqual(events, [['write', '<p>alphabravo</p>'], ['end']])
    assert.equal('pause' in source, false)
    assert.equal('resume' in source, false)
  })

  await t.test('does not write to a non-writable destination', function () {
    const source = stream()
    const destination = new EventEmitter()
    let writes = 0
    destination.writable = false
    destination.write = () => {
      writes++
    }
    destination.end = () => {}

    source.pipe(destination)
    source.end('value')
    assert.equal(writes, 0)
  })

  await t.test('honors end false, stdio, and truthy end exactly', function () {
    for (const [pipeOptions, stdio] of [[{end: false}, false], [undefined, true]]) {
      const source = stream()
      const destination = new EventEmitter()
      let ended = false
      destination.writable = true
      destination.write = () => true
      destination.end = () => {
        ended = true
      }
      destination._isStdio = stdio
      source.pipe(destination, pipeOptions)
      source.end('value')
      assert.equal(ended, false)
    }

    const source = stream()
    const destination = new EventEmitter()
    destination.writable = true
    destination.write = () => true
    destination.end = true
    source.pipe(destination)
    assert.throws(() => source.end('value'), TypeError)
  })

  await t.test('cleans both sides on source end or close', function () {
    for (const event of ['end', 'close']) {
      const source = stream()
      const destination = new PassThrough()
      source.pipe(destination, {end: false})

      assert.equal(source.listenerCount('data'), 1)
      assert.equal(source.listenerCount('error'), 1)
      assert.equal(destination.listenerCount('error'), 1)
      source.emit(event)
      assert.equal(source.listenerCount('data'), 0)
      assert.equal(source.listenerCount('error'), 0)
      assert.equal(destination.listenerCount('error'), 0)
    }
  })

  await t.test('cleans both sides on destination close', function () {
    const source = stream()
    const destination = new PassThrough()
    source.pipe(destination)
    destination.emit('close')

    assert.equal(source.listenerCount('data'), 0)
    assert.equal(source.listenerCount('end'), 0)
    assert.equal(source.listenerCount('error'), 0)
    assert.equal(destination.listenerCount('error'), 0)
  })

  await t.test('preserves source error identity when unheard', function () {
    const source = stream()
    const destination = new PassThrough()
    const error = new Error('source identity')
    source.pipe(destination)

    assert.throws(
      () => source.emit('error', error),
      (thrown) => thrown === error
    )
    assert.equal(source.listenerCount('data'), 0)
    assert.equal(destination.listenerCount('error'), 0)
  })

  await t.test('preserves destination error identity when unheard', function () {
    const source = stream()
    const destination = new PassThrough()
    const error = new Error('destination identity')
    source.pipe(destination)

    assert.throws(
      () => destination.emit('error', error),
      (thrown) => thrown === error
    )
    assert.equal(source.listenerCount('data'), 0)
    assert.equal(destination.listenerCount('error'), 0)
  })

  await t.test('leaves heard source and destination pipe errors handled', function () {
    for (const side of ['source', 'destination']) {
      const source = stream()
      const destination = new PassThrough()
      const heard = []
      source.on('error', (error) => heard.push(error))
      source.pipe(destination)
      const error = new Error(side)

      assert.doesNotThrow(() =>
        (side === 'source' ? source : destination).emit('error', error)
      )
      assert.deepEqual(heard, side === 'source' ? [error] : [])
    }
  })

  await t.test('supports independent multiple destinations', function () {
    const source = stream()
    const left = new PassThrough()
    const right = new PassThrough()
    let leftValue = ''
    let rightValue = ''
    left.on('data', (chunk) => {
      leftValue += chunk
    })
    right.on('data', (chunk) => {
      rightValue += chunk
    })
    source.pipe(left)
    source.pipe(right)
    source.end('value')
    assert.equal(leftValue, '<p>value</p>')
    assert.equal(rightValue, '<p>value</p>')
  })
})

test('stream write and end edge behavior', async function (t) {
  await t.test('calls callbacks synchronously with undefined this', function () {
    const source = stream()
    const calls = []
    source.write('a', function () {
      'use strict'
      calls.push(['write', this])
    })
    source.end('b', function () {
      'use strict'
      calls.push(['end', this])
    })
    assert.deepEqual(calls, [['write', undefined], ['end', undefined]])
  })

  await t.test('calls a truthy callback value like upstream', function () {
    assert.throws(() => stream().write('', undefined, true), TypeError)
    assert.throws(() => stream().end('', undefined, true), TypeError)
  })

  await t.test('permits reentrant writes until end emission completes', function () {
    const source = stream()
    const events = []
    source.on('data', (value) => {
      events.push(['data', value])
      assert.equal(source.write('late'), true)
    })
    source.on('end', () => events.push(['end']))
    source.end('value')
    assert.deepEqual(events, [['data', '<p>value</p>'], ['end']])
    assert.throws(() => source.write('too late'), /write.*after.*end/)
  })
})
