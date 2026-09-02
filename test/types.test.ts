import {PassThrough} from 'node:stream'
import {gfm, gfmHtml} from 'micromark-extension-gfm'
import type {
  Extension,
  HtmlExtension,
  Options as MicromarkOptions
} from 'micromark-util-types'

import {
  compile,
  micromark,
  parse,
  postprocess,
  preprocess,
  type Options
} from '@itslil/micromark'
import {
  stream,
  type Callback,
  type MinimalDuplex,
  type PipeOptions
} from '@itslil/micromark/stream'

const extension: Extension = gfm()
const htmlExtension: HtmlExtension = gfmHtml()
const options: Options = {
  allowDangerousHtml: true,
  extensions: [extension],
  htmlExtensions: [htmlExtension]
}
const upstreamOptions: MicromarkOptions = options
const localOptions: Options = upstreamOptions
const chunks = preprocess()('# heading', 'utf-8', true)
const events = parse(options).document().write(chunks)

compile(options)(postprocess(events))
micromark(new TextEncoder().encode('# heading'), 'utf-8', options)
micromark('# heading', options)
micromark('| a |\n| - |', localOptions)

const duplex: MinimalDuplex = stream(options)
duplex.pipe(new PassThrough())
duplex.pipe(new PassThrough(), {end: false} satisfies PipeOptions)
duplex.write('# heading', 'utf8', (() => undefined) satisfies Callback)
duplex.end()

const listener = (left: unknown, right: unknown) => {
  void left
  void right
}
const event = Symbol('event')
duplex
  .addListener(event, listener)
  .on(event, listener)
  .once(event, listener)
  .prependListener(event, listener)
  .prependOnceListener(event, listener)
  .removeListener(event, listener)
  .off(event, listener)
  .removeAllListeners(event)
  .setMaxListeners(20)
duplex.emit(event, 'left', 'right')
duplex.eventNames()
duplex.getMaxListeners()
duplex.listenerCount(event, listener)
duplex.listeners(event)
duplex.rawListeners(event)
