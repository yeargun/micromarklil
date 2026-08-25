export interface ParseOptions {
  gfm?: boolean
  breaks?: boolean
  math?: boolean
  allowDangerousHtml?: boolean
  singleTilde?: boolean
}

export function micromark(
  value: string,
  encodingOrOptions?: string | ParseOptions,
  options?: ParseOptions,
): string
export function compile(src: string, options?: ParseOptions): string
export function parseInline(src: string, options?: ParseOptions): string
export function fromMarkdown(src: string, options?: ParseOptions): unknown
export default micromark
