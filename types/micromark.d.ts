import type {
  Chunk,
  Compile,
  CompileOptions,
  Encoding,
  Event,
  Options,
  ParseContext,
  ParseOptions,
  Value
} from 'micromark-util-types'

export type {Options} from 'micromark-util-types'

export function micromark(
  value: Value,
  encoding: Encoding | null | undefined,
  options?: Options | null | undefined
): string
export function micromark(
  value: Value,
  options?: Options | null | undefined
): string

export function parse(options?: ParseOptions | null | undefined): ParseContext
export function compile(options?: CompileOptions | null | undefined): Compile
export function preprocess(): (
  value: Value,
  encoding?: Encoding | null | undefined,
  end?: boolean | null | undefined
) => Array<Chunk>
export function postprocess(events: Array<Event>): Array<Event>
