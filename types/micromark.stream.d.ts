/// <reference types="node" />

import type {Options} from '@itslil/micromark'

export type {Options} from '@itslil/micromark'

export type Callback = () => undefined

export interface PipeOptions {
  end?: boolean | null | undefined
}

export type MinimalDuplex = Omit<
  NodeJS.ReadableStream & NodeJS.WritableStream,
  | 'isPaused'
  | 'pause'
  | 'read'
  | 'resume'
  | 'setEncoding'
  | 'unpipe'
  | 'unshift'
  | 'wrap'
>

export function stream(options?: Options | null | undefined): MinimalDuplex
