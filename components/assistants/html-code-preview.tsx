"use client"

/**
 * HtmlCodePreview
 * Renders a code block with "Code" / "Preview" tabs.
 * Preview tab shows the HTML inside a sandboxed iframe — safe, no Prisma changes.
 */
import { useState } from "react"
import { useLocale } from "@/lib/i18n"
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter"
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism"
import { Copy, Eye, Code2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

interface HtmlCodePreviewProps {
  code: string
  language?: string
}

export function HtmlCodePreview({ code, language = "html" }: HtmlCodePreviewProps) {
  const { t } = useLocale()
  const [tab, setTab] = useState<"code" | "preview">("code")

  const isHtml = language.toLowerCase() === "html"

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    toast.success(t("common.codeCopied"))
  }

  return (
    <div className="not-prose my-3 w-full rounded-lg border border-border overflow-hidden">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[rgb(24,24,24)] border-b border-border">
        <div className="flex items-center gap-1">
          {/* Language badge */}
          <span className="text-xs text-muted-foreground font-mono px-1.5">{language}</span>

          {/* Preview tabs — only for HTML */}
          {isHtml && (
            <div className="flex items-center gap-0.5 ml-2">
              <button
                onClick={() => setTab("code")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  tab === "code"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Code2 className="h-3 w-3" />
                {t("common.code")}
              </button>
              <button
                onClick={() => setTab("preview")}
                className={`flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  tab === "preview"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Eye className="h-3 w-3" />
                {t("common.preview")}
              </button>
            </div>
          )}
        </div>

        {/* Copy button */}
        <Button
          size="icon"
          variant="ghost"
          className="h-6 w-6 text-muted-foreground hover:text-foreground"
          onClick={handleCopy}
          title={t("common.copyCode")}
        >
          <Copy className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Content */}
      {tab === "code" || !isHtml ? (
        <div className="w-full overflow-x-auto bg-[rgb(30,30,30)]">
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            PreTag="pre"
            customStyle={{
              margin: 0,
              padding: "1rem",
              fontSize: "0.875rem",
              background: "rgb(30,30,30)",
              width: "fit-content",
              minWidth: "max-content",
            }}
          >
            {code}
          </SyntaxHighlighter>
        </div>
      ) : (
        /* Sandboxed iframe preview — safe, no external scripts can escape */
        <div className="w-full bg-white">
          <iframe
            title={t("common.preview")}
            sandbox="allow-scripts allow-same-origin"
            srcDoc={code}
            className="w-full min-h-[280px] border-0"
            style={{ height: "340px", resize: "vertical" }}
          />
        </div>
      )}
    </div>
  )
}
