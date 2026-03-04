declare module 'html-to-docx' {
  interface HTMLtoDOCXOptions {
    title?: string
    font?: string
    fontSize?: number
    margins?: {
      top?: number
      right?: number
      bottom?: number
      left?: number
      header?: number
      footer?: number
      gutter?: number
    }
    table?: {
      row?: { cantSplit?: boolean }
    }
    pageNumber?: boolean
    [key: string]: any
  }

  function HTMLtoDOCX(
    html: string,
    headerHtml?: string | null,
    options?: HTMLtoDOCXOptions,
    footerHtml?: string | null
  ): Promise<Buffer>

  export = HTMLtoDOCX
}
