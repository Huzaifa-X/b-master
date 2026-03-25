"use client"

import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  TrendingUp,
  Search,
  Zap,
  BookOpen,
  MessageSquare,
  ClipboardList,
  Shield,
  Key,
  ExternalLink,
  Info,
  Lightbulb,
} from "lucide-react"
import { useLocale } from "@/lib/i18n"

// ─── Types ────────────────────────────────────────────────────────────────────

interface Step {
  label: string
  content: string
}

interface Integration {
  id: string
  number: number
  title: string
  subtitle: string
  icon: React.ReactNode
  color: string
  badgeColor: string
  free: boolean
  authType: string
  getKeysUrl: string
  getKeysLabel: string
  steps: Step[]
  tip: string
  scopeOrHeaders?: string
}

// ─── Data ─────────────────────────────────────────────────────────────────────

const AZURE_SCOPES = [
  "Notes.ReadWrite",
  "ChannelMessage.Send",
  "Chat.ReadWrite",
  "Team.ReadBasic.All",
  "OnlineMeetings.ReadWrite",
  "Tasks.ReadWrite",
  "Group.ReadWrite.All",
  "Sites.ReadWrite.All",
  "User.Read",
  "offline_access",
]

// ─── Copy Button ──────────────────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <button
      onClick={copy}
      className="ml-1.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground hover:text-foreground transition-colors"
      title="Copy"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  )
}

// ─── Integration Card ─────────────────────────────────────────────────────────

function IntegrationCard({ integration }: { integration: Integration }) {
  const [expanded, setExpanded] = useState(false)
  const { t } = useLocale()

  return (
    <Card className="overflow-hidden border-border/60 bg-card/50 backdrop-blur-sm transition-all duration-200 hover:border-border">
      <CardHeader
        className={`cursor-pointer select-none bg-gradient-to-r ${integration.color} pb-3`}
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Number badge */}
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-background/80 text-sm font-bold text-foreground shadow-sm">
              {integration.number}
            </div>
            {/* Icon + title */}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-foreground">{integration.icon}</span>
                <CardTitle className="text-base font-semibold leading-tight">
                  {integration.title}
                </CardTitle>
                <Badge
                  variant="outline"
                  className={`text-[10px] font-medium ${integration.badgeColor}`}
                >
                  {integration.subtitle}
                </Badge>
              </div>
              <CardDescription className="mt-0.5 flex items-center gap-2 text-xs">
                <span className="flex items-center gap-1">
                  {integration.authType === "OAuth 2.0" ? (
                    <Shield className="h-3 w-3" />
                  ) : (
                    <Key className="h-3 w-3" />
                  )}
                  {integration.authType}
                </span>
                <span>·</span>
                <span>{integration.free ? `✅ ${t("apiSetup.step2.free")}` : `💰 ${t("apiSetup.step2.payPerUse")}`}</span>
              </CardDescription>
            </div>
          </div>
          <button className="mt-1 shrink-0 text-muted-foreground">
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 pt-4">
          {/* Steps */}
          <div className="space-y-2">
            {integration.steps.map((step, i) => (
              <div key={i} className="flex gap-3">
                <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground">
                  {i + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-semibold text-foreground">{step.label}: </span>
                  <span className="break-all text-xs text-muted-foreground">{step.content}</span>
                  {(step.label === "Auth URL" || step.label === "Token URL" || step.label === "Scope" || step.label === "Header 1" || step.label === "Header 2") && (
                    <CopyButton text={step.content} />
                  )}
                </div>
              </div>
            ))}
          </div>

          <Separator className="opacity-50" />

          {/* Scope / Headers summary */}
          {integration.scopeOrHeaders && (
            <div className="rounded-md bg-muted/50 px-3 py-2">
              <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {integration.authType === "OAuth 2.0" ? t("apiSetup.step2.requiredScopes") : t("apiSetup.step2.requiredHeaders")}
              </p>
              <p className="break-all font-mono text-xs text-foreground">
                {integration.scopeOrHeaders}
              </p>
            </div>
          )}

          {/* Tip */}
          <div className="flex gap-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2">
            <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            <p className="text-xs text-muted-foreground">
              <span className="font-semibold text-amber-400">{t("apiSetup.step2.tip")} </span>
              {integration.tip}
            </p>
          </div>

          {/* External link */}
          <a
            href={integration.getKeysUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            <ExternalLink className="h-3 w-3" />
            {t("apiSetup.step2.getKeys", { label: integration.getKeysLabel })}
          </a>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApiSetupGuidePage() {
  const { t } = useLocale()
  const [azureExpanded, setAzureExpanded] = useState(false)
  const [tipsExpanded, setTipsExpanded] = useState(false)

  const INTEGRATIONS: Integration[] = [
    {
      id: "alpaca",
      number: 1,
      title: t("apiSetup.integrations.alpaca.title"),
      subtitle: t("apiSetup.integrations.alpaca.subtitle"),
      icon: <TrendingUp className="h-5 w-5" />,
      color: "from-emerald-500/10 to-emerald-500/5",
      badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      free: true,
      authType: "API Key (2 headers)",
      getKeysUrl: "https://alpaca.markets",
      getKeysLabel: "alpaca.markets",
      scopeOrHeaders: "APCA-API-KEY-ID · APCA-API-SECRET-KEY",
      steps: [
        { label: "Schema", content: t("apiSetup.integrations.alpaca.steps.1") },
        { label: "Auth Type", content: t("apiSetup.integrations.alpaca.steps.2") },
        { label: "Header 1", content: t("apiSetup.integrations.alpaca.steps.3") },
        { label: "Header 2", content: t("apiSetup.integrations.alpaca.steps.4") },
        { label: "Get Keys", content: t("apiSetup.integrations.alpaca.steps.5") },
      ],
      tip: t("apiSetup.integrations.alpaca.tip"),
    },
    {
      id: "dataforseo",
      number: 2,
      title: t("apiSetup.integrations.dataforseo.title"),
      subtitle: t("apiSetup.integrations.dataforseo.subtitle"),
      icon: <Search className="h-5 w-5" />,
      color: "from-blue-500/10 to-blue-500/5",
      badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      free: false,
      authType: "Basic Auth",
      getKeysUrl: "https://dataforseo.com",
      getKeysLabel: "dataforseo.com",
      scopeOrHeaders: "Email + API password",
      steps: [
        { label: "Schema", content: t("apiSetup.integrations.dataforseo.steps.1") },
        { label: "Auth Type", content: t("apiSetup.integrations.dataforseo.steps.2") },
        { label: "Username", content: t("apiSetup.integrations.dataforseo.steps.3") },
        { label: "Password", content: t("apiSetup.integrations.dataforseo.steps.4") },
        { label: "Get Keys", content: t("apiSetup.integrations.dataforseo.steps.5") },
      ],
      tip: t("apiSetup.integrations.dataforseo.tip"),
    },
    {
      id: "pipedream",
      number: 3,
      title: t("apiSetup.integrations.pipedream.title"),
      subtitle: t("apiSetup.integrations.pipedream.subtitle"),
      icon: <Zap className="h-5 w-5" />,
      color: "from-violet-500/10 to-violet-500/5",
      badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
      free: true,
      authType: "Bearer Token",
      getKeysUrl: "https://pipedream.com",
      getKeysLabel: "pipedream.com",
      scopeOrHeaders: "Pipedream API key",
      steps: [
        { label: "Schema", content: t("apiSetup.integrations.pipedream.steps.1") },
        { label: "Auth Type", content: t("apiSetup.integrations.pipedream.steps.2") },
        { label: "Token", content: t("apiSetup.integrations.pipedream.steps.3") },
        { label: "Get Keys", content: t("apiSetup.integrations.pipedream.steps.4") },
      ],
      tip: t("apiSetup.integrations.pipedream.tip"),
    },
    {
      id: "onenote",
      number: 4,
      title: t("apiSetup.integrations.onenote.title"),
      subtitle: t("apiSetup.integrations.onenote.subtitle"),
      icon: <BookOpen className="h-5 w-5" />,
      color: "from-orange-500/10 to-orange-500/5",
      badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      free: true,
      authType: "OAuth 2.0",
      getKeysUrl: "https://portal.azure.com",
      getKeysLabel: "portal.azure.com",
      scopeOrHeaders: "Notes.ReadWrite User.Read offline_access",
      steps: [
        { label: "Schema", content: t("apiSetup.integrations.onenote.steps.1") },
        { label: "Auth Type", content: t("apiSetup.integrations.onenote.steps.2") },
        { label: "Auth URL", content: t("apiSetup.integrations.onenote.steps.3") },
        { label: "Token URL", content: t("apiSetup.integrations.onenote.steps.4") },
        { label: "Client ID & Secret", content: t("apiSetup.integrations.onenote.steps.5") },
        { label: "Scope", content: t("apiSetup.integrations.onenote.steps.6") },
      ],
      tip: t("apiSetup.integrations.onenote.tip"),
    },
    {
      id: "teams",
      number: 5,
      title: t("apiSetup.integrations.teams.title"),
      subtitle: t("apiSetup.integrations.teams.subtitle"),
      icon: <MessageSquare className="h-5 w-5" />,
      color: "from-sky-500/10 to-sky-500/5",
      badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/20",
      free: true,
      authType: "OAuth 2.0",
      getKeysUrl: "https://portal.azure.com",
      getKeysLabel: t("apiSetup.integrations.onenote.steps.5"), // Same azure app
      scopeOrHeaders: "ChannelMessage.Send Chat.ReadWrite Team.ReadBasic.All OnlineMeetings.ReadWrite User.Read offline_access",
      steps: [
        { label: "Schema", content: t("apiSetup.integrations.teams.steps.1") },
        { label: "Auth Type", content: t("apiSetup.integrations.teams.steps.2") },
        { label: "Auth URL", content: t("apiSetup.integrations.teams.steps.3") },
        { label: "Token URL", content: t("apiSetup.integrations.teams.steps.4") },
        { label: "Client ID & Secret", content: t("apiSetup.integrations.teams.steps.5") },
        { label: "Scope", content: t("apiSetup.integrations.teams.steps.6") },
      ],
      tip: t("apiSetup.integrations.teams.tip"),
    },
    {
      id: "project",
      number: 6,
      title: t("apiSetup.integrations.project.title"),
      subtitle: t("apiSetup.integrations.project.subtitle"),
      icon: <ClipboardList className="h-5 w-5" />,
      color: "from-rose-500/10 to-rose-500/5",
      badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
      free: true,
      authType: "OAuth 2.0",
      getKeysUrl: "https://portal.azure.com",
      getKeysLabel: t("apiSetup.integrations.onenote.steps.5"), // Same azure app
      scopeOrHeaders: "Tasks.ReadWrite Group.ReadWrite.All Sites.ReadWrite.All User.Read offline_access",
      steps: [
        { label: "Schema", content: t("apiSetup.integrations.project.steps.1") },
        { label: "Auth Type", content: t("apiSetup.integrations.project.steps.2") },
        { label: "Auth URL", content: t("apiSetup.integrations.project.steps.3") },
        { label: "Token URL", content: t("apiSetup.integrations.project.steps.4") },
        { label: "Client ID & Secret", content: t("apiSetup.integrations.project.steps.5") },
        { label: "Scope", content: t("apiSetup.integrations.project.steps.6") },
      ],
      tip: t("apiSetup.integrations.project.tip"),
    },
  ]

  const QUICK_REFERENCE = [
    { num: 1, name: t("apiSetup.integrations.alpaca.title"), auth: "API Key", where: "alpaca.markets", free: true },
    { num: 2, name: t("apiSetup.integrations.dataforseo.title"), auth: "Basic Auth", where: "dataforseo.com", free: false },
    { num: 3, name: t("apiSetup.integrations.pipedream.title"), auth: "Bearer Token", where: "pipedream.com", free: true },
    { num: 4, name: t("apiSetup.integrations.onenote.title"), auth: "OAuth 2.0", where: "portal.azure.com", free: true },
    { num: 5, name: t("apiSetup.integrations.teams.title"), auth: "OAuth 2.0", where: t("apiSetup.integrations.onenote.steps.5"), free: true },
    { num: 6, name: t("apiSetup.integrations.project.title"), auth: "OAuth 2.0", where: t("apiSetup.integrations.onenote.steps.5"), free: true },
  ]

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline" className="border-border/60 text-xs text-muted-foreground">
            {t("apiSetup.badge")}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          🗺️ {t("apiSetup.title")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("apiSetup.description")}
        </p>
      </div>

      {/* Step 1 — Azure App Registration */}
      <section className="mb-6">
        <Card className="overflow-hidden border-border/60 bg-card/50">
          <CardHeader
            className="cursor-pointer select-none bg-gradient-to-r from-indigo-500/10 to-indigo-500/5 pb-3"
            onClick={() => setAzureExpanded((v) => !v)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background/80 shadow-sm">
                  <Shield className="h-4 w-4 text-indigo-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    {t("apiSetup.step1.title")}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t("apiSetup.step1.description")}
                  </CardDescription>
                </div>
              </div>
              {azureExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>

          {azureExpanded && (
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-3">
                {[1, 2, 3, 4, 5, 6, 7].map((num) => (
                  <div key={num} className="flex gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-[10px] font-semibold text-indigo-400">
                      {num}
                    </div>
                    <p className="text-xs text-muted-foreground">{t(`apiSetup.step1.steps.${num}` as any)}</p>
                  </div>
                ))}
              </div>

              <Separator className="opacity-50" />

              {/* All required scopes */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Info className="h-3.5 w-3.5 text-indigo-400" />
                  {t("apiSetup.step1.scopesTitle")}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {AZURE_SCOPES.map((scope) => (
                    <code
                      key={scope}
                      className="inline-flex items-center gap-1 rounded border border-indigo-500/20 bg-indigo-500/5 px-2 py-0.5 font-mono text-[11px] text-indigo-300"
                    >
                      {scope}
                      <CopyButton text={scope} />
                    </code>
                  ))}
                </div>
              </div>

              <a
                href="https://portal.azure.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
              >
                <ExternalLink className="h-3 w-3" />
                {t("apiSetup.step1.openAzure")}
              </a>
            </CardContent>
          )}
        </Card>
      </section>

      {/* Step 2 — Per-Integration Setup */}
      <section className="mb-6">
        <div className="mb-3 flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
            2
          </div>
          <h2 className="text-sm font-semibold text-foreground">
            {t("apiSetup.step2.title")}
          </h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          {t("apiSetup.step2.description")}
        </p>
        <div className="space-y-3">
          {INTEGRATIONS.map((integration) => (
            <IntegrationCard key={integration.id} integration={integration} />
          ))}
        </div>
      </section>

      {/* Step 3 — Pro Tips */}
      <section className="mb-6">
        <Card className="overflow-hidden border-border/60 bg-card/50">
          <CardHeader
            className="cursor-pointer select-none bg-gradient-to-r from-amber-500/10 to-amber-500/5 pb-3"
            onClick={() => setTipsExpanded((v) => !v)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-background/80 shadow-sm">
                  <Lightbulb className="h-4 w-4 text-amber-400" />
                </div>
                <div>
                  <CardTitle className="text-base font-semibold">
                    {t("apiSetup.step3.title")}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    {t("apiSetup.step3.description")}
                  </CardDescription>
                </div>
              </div>
              {tipsExpanded ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </CardHeader>

          {tipsExpanded && (
            <CardContent className="space-y-3 pt-4">
              {[1, 2, 3, 4, 5, 6].map((num) => (
                <div key={num} className="flex gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-[10px] font-semibold text-amber-400">
                    {num}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{t(`apiSetup.step3.tips.${num}.title` as any)}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t(`apiSetup.step3.tips.${num}.body` as any)}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          )}
        </Card>
      </section>

      {/* Quick Reference Table */}
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
          📊 {t("apiSetup.quickReference.title")}
        </h2>
        <Card className="overflow-hidden border-border/60 bg-card/50">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">{t("apiSetup.quickReference.headers.num")}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">{t("apiSetup.quickReference.headers.integration")}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">{t("apiSetup.quickReference.headers.authType")}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">{t("apiSetup.quickReference.headers.where")}</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">{t("apiSetup.quickReference.headers.cost")}</th>
                </tr>
              </thead>
              <tbody>
                {QUICK_REFERENCE.map((row, i) => (
                  <tr
                    key={row.num}
                    className={`border-b border-border/40 transition-colors hover:bg-muted/20 ${
                      i === QUICK_REFERENCE.length - 1 ? "border-b-0" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5 font-medium text-muted-foreground">{row.num}</td>
                    <td className="px-4 py-2.5 font-medium text-foreground">{row.name}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      <code className="rounded bg-muted/60 px-1.5 py-0.5 font-mono text-[10px]">
                        {row.auth}
                      </code>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{row.where}</td>
                    <td className="px-4 py-2.5">
                      {row.free ? (
                        <Badge
                          variant="outline"
                          className="border-emerald-500/20 bg-emerald-500/10 text-[10px] text-emerald-400"
                        >
                          {t("apiSetup.step2.free")}
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-400"
                        >
                          {t("apiSetup.step2.payPerUse")}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* Footer CTA */}
      <div className="mt-8 flex flex-col items-center gap-3 rounded-xl border border-border/60 bg-muted/20 px-6 py-5 text-center">
        <p className="text-sm font-medium text-foreground">
          {t("apiSetup.footer.title")}
        </p>
        <p className="text-xs text-muted-foreground">
          {t("apiSetup.footer.description")}
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-1"
          onClick={() => window.location.href = "/assistants/add"}
        >
          {t("apiSetup.footer.button")}
        </Button>
      </div>
    </div>
  )
}
