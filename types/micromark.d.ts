export interface Options {
  allowDangerousHtml?: boolean
  allowDangerousProtocol?: boolean
  defaultLineEnding?: '\r' | '\n' | '\r\n'
  extensions?: Array<Record<string, unknown>>
  htmlExtensions?: Array<Record<string, unknown>>
}

export function micromark(
  value: string | Uint8Array,
  encoding?: string | Options | null,
  options?: Options | null,
): string

export function parse(options?: Options | null): {
  constructs: unknown
  defined: string[]
  lazy: Record<string, boolean>
  content(from?: unknown): TokenizeContext
  document(from?: unknown): TokenizeContext
  flow(from?: unknown): TokenizeContext
  string(from?: unknown): TokenizeContext
  text(from?: unknown): TokenizeContext
}

export interface TokenizeContext {
  write(slice: unknown[]): unknown[]
  defineSkip(point: unknown): void
  now(): unknown
  sliceSerialize(token: unknown, expandTabs?: boolean): string
  sliceStream(token: unknown): unknown[]
  events: unknown[]
}

export function compile(options?: Options | null): (events: unknown) => string
export function preprocess(): (
  value: string | Uint8Array,
  encoding?: string | null,
  end?: boolean,
) => unknown[]
export function postprocess(events: unknown): unknown
export function stream(options?: Options | null): unknown
export class SpliceBuffer {
  constructor(initial?: unknown[])
  get length(): number
  push(item: unknown): void
  pop(): unknown
  splice(start: number, remove: number, items?: unknown[]): unknown[]
  slice(start?: number, end?: number): unknown[]
}
export function decodeString(value: string): string
export function splice(
  list: unknown[],
  start: number,
  remove: number,
  items: unknown[],
): void
export const htmlBlockNames: string[]
export const htmlRawNames: string[]
export const codes: Record<string, number | null>
export const constants: Record<string, number | string>
export const types: Record<string, string>
export const values: Record<string, string>
