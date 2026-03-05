declare module 'juice' {
  interface JuiceOptions {
    removeStyleTags?: boolean
    applyStyleTags?: boolean
    applyAttributesTableElements?: boolean
    inlinePseudoElements?: boolean
    preserveMediaQueries?: boolean
    preserveFontFaces?: boolean
    extraCss?: string
    [key: string]: unknown
  }
  function juice(html: string, options?: JuiceOptions): string
  export = juice
}
