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

const INTEGRATIONS: Integration[] = [
  {
    id: "alpaca",
    number: 1,
    title: "Trading API",
    subtitle: "Alpaca Markets",
    icon: <TrendingUp className="h-5 w-5" />,
    color: "from-emerald-500/10 to-emerald-500/5",
    badgeColor: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    free: true,
    authType: "API Key (2 headers)",
    getKeysUrl: "https://alpaca.markets",
    getKeysLabel: "alpaca.markets",
    scopeOrHeaders: "APCA-API-KEY-ID · APCA-API-SECRET-KEY",
    steps: [
      { label: "Schema", content: "Select or paste the Alpaca Trading schema in the Advanced Config step when creating your assistant." },
      { label: "Auth Type", content: "Choose API Key authentication." },
      { label: "Header 1", content: "Set custom header name to APCA-API-KEY-ID and enter your Alpaca Key ID as the value." },
      { label: "Header 2", content: "Add a second header APCA-API-SECRET-KEY with your Alpaca Secret Key." },
      { label: "Get Keys", content: "Sign up free at alpaca.markets → go to Paper Trading dashboard → copy your Key ID and Secret Key." },
    ],
    tip: "Always start with the paper trading URL (paper-api.alpaca.markets) — it costs nothing and behaves identically to live trading.",
  },
  {
    id: "dataforseo",
    number: 2,
    title: "SEO API",
    subtitle: "DataForSEO",
    icon: <Search className="h-5 w-5" />,
    color: "from-blue-500/10 to-blue-500/5",
    badgeColor: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    free: false,
    authType: "Basic Auth",
    getKeysUrl: "https://dataforseo.com",
    getKeysLabel: "dataforseo.com",
    scopeOrHeaders: "Email + API password",
    steps: [
      { label: "Schema", content: "Select or paste the DataForSEO SEO schema when creating your assistant." },
      { label: "Auth Type", content: "Choose Basic Auth." },
      { label: "Username", content: "Enter your DataForSEO account email address." },
      { label: "Password", content: "Enter your DataForSEO API password (from the API Access page, not your login password)." },
      { label: "Get Keys", content: "Go to dataforseo.com → Sign up → Account → API Access. New accounts get $1 free credit." },
    ],
    tip: "Start with getKeywordSearchVolume and getSerpResults to validate your setup. DataForSEO is pay-per-call — batch keyword requests to keep costs minimal.",
  },
  {
    id: "pipedream",
    number: 3,
    title: "Diese Integration API",
    subtitle: "Pipedream",
    icon: <Zap className="h-5 w-5" />,
    color: "from-violet-500/10 to-violet-500/5",
    badgeColor: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    free: true,
    authType: "Bearer Token",
    getKeysUrl: "https://pipedream.com",
    getKeysLabel: "pipedream.com",
    scopeOrHeaders: "Pipedream API key",
    steps: [
      { label: "Schema", content: "Select or paste the Diese Integration (Pipedream) schema when creating your assistant." },
      { label: "Auth Type", content: "Choose Bearer Token authentication." },
      { label: "Token", content: "Paste your Pipedream API key as the bearer token." },
      { label: "Get Keys", content: "Login to pipedream.com → click your avatar → Settings → API → copy your API key." },
    ],
    tip: "Use listApps first to browse 2,000+ available connectors, then createSource to set up event triggers. Free tier includes 10,000 invocations/month.",
  },
  {
    id: "onenote",
    number: 4,
    title: "OneNote API",
    subtitle: "Microsoft Graph",
    icon: <BookOpen className="h-5 w-5" />,
    color: "from-orange-500/10 to-orange-500/5",
    badgeColor: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    free: true,
    authType: "OAuth 2.0",
    getKeysUrl: "https://portal.azure.com",
    getKeysLabel: "portal.azure.com",
    scopeOrHeaders: "Notes.ReadWrite User.Read offline_access",
    steps: [
      { label: "Schema", content: "Select or paste the OneNote Integration API schema when creating your assistant." },
      { label: "Auth Type", content: "Choose OAuth." },
      { label: "Auth URL", content: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize" },
      { label: "Token URL", content: "https://login.microsoftonline.com/common/oauth2/v2.0/token" },
      { label: "Client ID & Secret", content: "Use the Client ID and Secret from your Azure App Registration (see Step 1 above)." },
      { label: "Scope", content: "Notes.ReadWrite User.Read offline_access" },
    ],
    tip: "Use getDeltaPages with the saved @odata.deltaLink for efficient incremental sync — only pages that changed since your last call are returned.",
  },
  {
    id: "teams",
    number: 5,
    title: "Microsoft Teams API",
    subtitle: "Microsoft Graph",
    icon: <MessageSquare className="h-5 w-5" />,
    color: "from-sky-500/10 to-sky-500/5",
    badgeColor: "bg-sky-500/10 text-sky-400 border-sky-500/20",
    free: true,
    authType: "OAuth 2.0",
    getKeysUrl: "https://portal.azure.com",
    getKeysLabel: "Same Azure app",
    scopeOrHeaders: "ChannelMessage.Send Chat.ReadWrite Team.ReadBasic.All OnlineMeetings.ReadWrite User.Read offline_access",
    steps: [
      { label: "Schema", content: "Select or paste the Microsoft Teams Integration API schema when creating your assistant." },
      { label: "Auth Type", content: "Choose OAuth — same app registration as OneNote." },
      { label: "Auth URL", content: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize" },
      { label: "Token URL", content: "https://login.microsoftonline.com/common/oauth2/v2.0/token" },
      { label: "Client ID & Secret", content: "Same Azure App Registration as OneNote — no new registration needed." },
      { label: "Scope", content: "ChannelMessage.Send Chat.ReadWrite Team.ReadBasic.All OnlineMeetings.ReadWrite User.Read offline_access" },
    ],
    tip: "Use createSubscription with your webhook URL to receive real-time push events for new messages instead of polling — far more efficient.",
  },
  {
    id: "project",
    number: 6,
    title: "MS Project API",
    subtitle: "Microsoft Graph / Planner",
    icon: <ClipboardList className="h-5 w-5" />,
    color: "from-rose-500/10 to-rose-500/5",
    badgeColor: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    free: true,
    authType: "OAuth 2.0",
    getKeysUrl: "https://portal.azure.com",
    getKeysLabel: "Same Azure app",
    scopeOrHeaders: "Tasks.ReadWrite Group.ReadWrite.All Sites.ReadWrite.All User.Read offline_access",
    steps: [
      { label: "Schema", content: "Select or paste the Microsoft Project Integration API schema when creating your assistant." },
      { label: "Auth Type", content: "Choose OAuth — same Azure app as OneNote and Teams." },
      { label: "Auth URL", content: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize" },
      { label: "Token URL", content: "https://login.microsoftonline.com/common/oauth2/v2.0/token" },
      { label: "Client ID & Secret", content: "Same Azure App Registration — just ensure these additional scopes are granted." },
      { label: "Scope", content: "Tasks.ReadWrite Group.ReadWrite.All Sites.ReadWrite.All User.Read offline_access" },
    ],
    tip: "Always include the If-Match header (ETag from your GET response) when doing PATCH updates — this prevents conflicts in concurrent edits.",
  },
]

const QUICK_REFERENCE = [
  { num: 1, name: "Trading (Alpaca)", auth: "API Key", where: "alpaca.markets", free: true },
  { num: 2, name: "SEO (DataForSEO)", auth: "Basic Auth", where: "dataforseo.com", free: false },
  { num: 3, name: "Diese (Pipedream)", auth: "Bearer Token", where: "pipedream.com", free: true },
  { num: 4, name: "OneNote", auth: "OAuth 2.0", where: "portal.azure.com", free: true },
  { num: 5, name: "Teams", auth: "OAuth 2.0", where: "Same Azure app", free: true },
  { num: 6, name: "MS Project", auth: "OAuth 2.0", where: "Same Azure app", free: true },
]

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
                <span>{integration.free ? "✅ Free" : "💰 Pay-per-use"}</span>
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
                  {(step.label === "Auth URL" || step.label === "Token URL" || step.label === "Scope") && (
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
                {integration.authType === "OAuth 2.0" ? "Required Scopes" : "Required Headers"}
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
              <span className="font-semibold text-amber-400">Tip: </span>
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
            Get API keys → {integration.getKeysLabel}
          </a>
        </CardContent>
      )}
    </Card>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ApiSetupGuidePage() {
  const [azureExpanded, setAzureExpanded] = useState(false)
  const [tipsExpanded, setTipsExpanded] = useState(false)

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2 flex items-center gap-2">
          <Badge variant="outline" className="border-border/60 text-xs text-muted-foreground">
            Setup Guide
          </Badge>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
          🗺️ API Integration Setup Guide
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything you need to configure all 6 API integrations for your assistants — from
          authentication to first API call.
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
                    Step 1 — Azure App Registration
                  </CardTitle>
                  <CardDescription className="text-xs">
                    One-time setup · Covers OneNote, Teams & MS Project
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
                {[
                  { step: 1, text: "Go to portal.azure.com → Azure Active Directory → App registrations → New registration." },
                  { step: 2, text: "Give it a name like \"My Custom GPT App\" and set the redirect URI to your OAuth callback URL." },
                  { step: 3, text: "Go to API Permissions → Add a permission → Microsoft Graph → Delegated permissions." },
                  { step: 4, text: "Add all scopes for all three Microsoft integrations at once (see list below)." },
                  { step: 5, text: "Click Grant admin consent for your organisation." },
                  { step: 6, text: "Copy your Client ID from the Overview page." },
                  { step: 7, text: "Go to Certificates & Secrets → New client secret → copy the value immediately." },
                ].map(({ step, text }) => (
                  <div key={step} className="flex gap-3">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-500/10 text-[10px] font-semibold text-indigo-400">
                      {step}
                    </div>
                    <p className="text-xs text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>

              <Separator className="opacity-50" />

              {/* All required scopes */}
              <div>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-foreground">
                  <Info className="h-3.5 w-3.5 text-indigo-400" />
                  All scopes you need (add these all at once)
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
                Open Azure Portal
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
            Step 2 — Configure Each Integration
          </h2>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">
          Click any integration below to expand its configuration steps. Each one maps directly to an
          example schema in the assistant&apos;s Advanced Config step.
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
                    Step 3 — Pro Tips Across All APIs
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Best practices for efficiency, cost saving, and reliability
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
              {[
                {
                  title: "One Azure app for all 3 Microsoft integrations",
                  body: "OneNote, Teams, and MS Project all use Microsoft Graph. Add all scopes to a single app registration — no need to manage multiple Client IDs or secrets.",
                },
                {
                  title: "Save Delta tokens for incremental sync",
                  body: "getDeltaPages (OneNote), getDeltaTasks (MS Project), and getDeltaMessages (Teams) all return an @odata.deltaLink. Save this token — your next call will only return what changed, not everything.",
                },
                {
                  title: "Paper trade before going live",
                  body: "For the Trading API, always test on paper-api.alpaca.markets before switching to live trading. The schema defaults to paper mode — zero financial risk while you build.",
                },
                {
                  title: "DataForSEO is pay-per-call, not subscription",
                  body: "$10 gives you thousands of SEO lookups. Batch keyword requests to keep costs minimal — use the bulk keyword endpoint rather than individual calls.",
                },
                {
                  title: "Pipedream free tier is generous",
                  body: "10,000 invocations/month free. Use webhook subscriptions and delta patterns to avoid polling and burning your quota unnecessarily.",
                },
                {
                  title: "Always send If-Match for PATCH requests (MS APIs)",
                  body: "Microsoft Graph PATCH operations require the ETag from your preceding GET response as the If-Match header. This prevents lost updates in concurrent scenarios.",
                },
              ].map((tip, i) => (
                <div key={i} className="flex gap-3">
                  <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-[10px] font-semibold text-amber-400">
                    {i + 1}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{tip.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{tip.body}</p>
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
          📊 Quick Reference
        </h2>
        <Card className="overflow-hidden border-border/60 bg-card/50">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border/60 bg-muted/30">
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">#</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Integration</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Auth Type</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Where to Get Keys</th>
                  <th className="px-4 py-2.5 text-left font-semibold text-muted-foreground">Cost</th>
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
                          Free
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="border-amber-500/20 bg-amber-500/10 text-[10px] text-amber-400"
                        >
                          Pay-per-use
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
          Ready to build your first integration assistant?
        </p>
        <p className="text-xs text-muted-foreground">
          Go to Assistants → Create New → Advanced Config → pick an example schema from the dropdown.
        </p>
        <Button
          size="sm"
          variant="outline"
          className="mt-1"
          onClick={() => window.location.href = "/assistants/add"}
        >
          Create an Assistant →
        </Button>
      </div>
    </div>
  )
}
