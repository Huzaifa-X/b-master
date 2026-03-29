"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Loader2,
  Globe,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink
} from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useLocale } from "@/lib/i18n"
import { addCustomDomain, checkDomainStatus } from "@/app/actions/domain.action"
import { toast } from "sonner"

interface DnsRecord {
  type: string
  host: string
  value: string
  ttl: number
  purpose: string
}

interface CustomDomainDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  artifactId: number
  githubUrl: string
}

type DialogStep = "input" | "dns-config" | "verifying" | "success" | "error"

export function CustomDomainDialog({
  open,
  onOpenChange,
  artifactId,
  githubUrl
}: CustomDomainDialogProps) {
  const { t } = useLocale()

  const [step, setStep] = useState<DialogStep>("input")
  const [domain, setDomain] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // DNS Configuration state
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([])
  const [verificationRecords, setVerificationRecords] = useState<DnsRecord[]>([])
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null)

  // Verification polling
  const [isVerified, setIsVerified] = useState(false)
  const [pollCount, setPollCount] = useState(0)

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep("input")
        setDomain("")
        setError(null)
        setDnsRecords([])
        setVerificationRecords([])
        setIsVerified(false)
        setPollCount(0)
        setIsLoading(false)
      }, 300)
    }
  }, [open])

  // Polling for domain verification
  useEffect(() => {
    if (step !== "verifying" || isVerified) return

    const pollInterval = setInterval(async () => {
      setPollCount(prev => prev + 1)

      const result = await checkDomainStatus({
        artifactId,
        domain,
        githubUrl
      })

      if (result.success && result.data?.verified) {
        setIsVerified(true)
        setStep("success")
        clearInterval(pollInterval)
      } else if (result.data?.misconfigured) {
        setError("DNS records appear to be misconfigured. Please double-check your settings.")
        setStep("error")
        clearInterval(pollInterval)
      }

      // Stop polling after 10 attempts (5 minutes)
      if (pollCount >= 9) {
        setError("Verification timeout. DNS propagation can take up to 48 hours. Please check back later.")
        setStep("error")
        clearInterval(pollInterval)
      }
    }, 30000) // Poll every 30 seconds

    return () => clearInterval(pollInterval)
  }, [step, isVerified, pollCount, artifactId, domain, githubUrl])

  const handleAddDomain = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const result = await addCustomDomain({
        artifactId,
        domain: domain.trim(),
        githubUrl
      })

      if (!result.success || result.error) {
        setError(result.error?.message || "Failed to add domain")
        setIsLoading(false)
        return
      }

      // Store DNS records and move to configuration step
      setDnsRecords(result.data?.dnsRecords || [])
      setVerificationRecords(result.data?.verificationRecords || [])
      setStep("dns-config")
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartVerification = () => {
    setPollCount(0)
    setStep("verifying")
  }

  const copyToClipboard = async (text: string, index: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedIndex(index)
      toast.success("Copied to clipboard")
      setTimeout(() => setCopiedIndex(null), 2000)
    } catch {
      toast.error("Failed to copy")
    }
  }

  const handleClose = () => {
    if (isLoading || step === "verifying") return
    onOpenChange(false)
  }

  const renderDnsRecord = (record: DnsRecord, index: number, type: "routing" | "verification") => (
    <div key={`${type}-${index}`} className="border rounded-lg p-3 space-y-2 bg-muted/20">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-muted-foreground uppercase">
          {record.type} Record - {record.purpose}
        </span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => copyToClipboard(record.value, `${type}-${index}`)}
          className="h-7 px-2"
        >
          {copiedIndex === `${type}-${index}` ? (
            <Check className="h-3 w-3 text-green-600" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>
      <div className="space-y-1">
        <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
          <span className="text-muted-foreground font-medium">Type:</span>
          <code className="font-mono">{record.type}</code>
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
          <span className="text-muted-foreground font-medium">Host:</span>
          <code className="font-mono">{record.host}</code>
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
          <span className="text-muted-foreground font-medium">Value:</span>
          <code className="font-mono text-xs break-all">{record.value}</code>
        </div>
        <div className="grid grid-cols-[80px_1fr] gap-2 text-sm">
          <span className="text-muted-foreground font-medium">TTL:</span>
          <code className="font-mono">{record.ttl}</code>
        </div>
      </div>
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5 text-emerald-500" />
            {step === "success" ? t("bCoder.deploy.domainVerified") : t("bCoder.deploy.addCustomDomain")}
          </DialogTitle>
          <DialogDescription>
            {step === "input" && t("bCoder.deploy.customDomainDescription")}
            {step === "dns-config" && t("bCoder.deploy.dnsRecordsHelp")}
            {step === "verifying" && t("bCoder.deploy.domainVerifying")}
            {step === "success" && t("bCoder.deploy.domainLive")}
            {step === "error" && "There was an issue with domain verification"}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: Domain Input */}
        {step === "input" && (
          <form onSubmit={handleAddDomain}>
            <div className="space-y-4 py-4">
              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="domain">{t("bCoder.deploy.domainInputLabel")}</Label>
                <Input
                  id="domain"
                  placeholder={t("bCoder.deploy.domainInputPlaceholder")}
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  disabled={isLoading}
                  autoFocus
                />
                <p className="text-xs text-muted-foreground">
                  {t("bCoder.deploy.domainInputHelp")}
                </p>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  You'll need access to your domain's DNS settings (usually at your registrar like GoDaddy, Namecheap, or Cloudflare).
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleClose} disabled={isLoading}>
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !domain.trim()}
                className="bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-700 hover:to-cyan-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Adding Domain...
                  </>
                ) : (
                  <>
                    <Globe className="mr-2 h-4 w-4" />
                    Continue
                  </>
                )}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* Step 2: DNS Configuration */}
        {step === "dns-config" && (
          <div className="space-y-4 py-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {t("bCoder.deploy.dnsPropagationNote")}
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs font-bold">1</span>
                  {t("bCoder.deploy.routingRecordsTitle")}
                </h4>
                <div className="space-y-2">
                  {dnsRecords.map((record, index) => renderDnsRecord(record, index, "routing"))}
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                  <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">2</span>
                  {t("bCoder.deploy.verificationRecordsTitle")}
                </h4>
                <div className="space-y-2">
                  {verificationRecords.map((record, index) => renderDnsRecord(record, index, "verification"))}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("input")}>
                Back
              </Button>
              <Button onClick={handleStartVerification} className="bg-emerald-600 hover:bg-emerald-700">
                {t("bCoder.deploy.dnsAdded")}
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 3: Verifying */}
        {step === "verifying" && (
          <div className="py-8 flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            </div>
            <div className="space-y-1 text-center">
              <h3 className="font-semibold text-lg">{t("bCoder.deploy.domainVerifying")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("bCoder.deploy.checkingDns")}
              </p>
              <p className="text-xs text-muted-foreground">
                Attempt {pollCount + 1} of 10
              </p>
            </div>
            <Alert className="w-full">
              <AlertDescription className="text-xs">
                {t("bCoder.deploy.dnsPropagationNote")}. You can close this dialog and we'll continue checking in the background.
              </AlertDescription>
            </Alert>
            <Button variant="outline" onClick={() => setStep("dns-config")}>
              {t("bCoder.deploy.viewDnsRecords")}
            </Button>
          </div>
        )}

        {/* Step 4: Success */}
        {step === "success" && (
          <div className="py-6 flex flex-col items-center justify-center space-y-4">
            <div className="h-16 w-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center">
              <CheckCircle2 className="h-8 w-8" />
            </div>
            <div className="space-y-1 text-center">
              <h3 className="font-semibold text-lg text-emerald-600">{t("bCoder.deploy.domainVerified")}</h3>
              <p className="text-sm text-muted-foreground">
                {t("bCoder.deploy.domainLive")} <code className="font-mono font-semibold">{domain}</code>
              </p>
            </div>
            <div className="w-full bg-muted/50 p-3 rounded-lg">
              <a
                href={`https://${domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-600 hover:underline flex items-center justify-center gap-2"
              >
                <Globe className="h-4 w-4" />
                Visit {domain}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
            <DialogFooter className="w-full">
              <Button onClick={handleClose} className="w-full">
                Done
              </Button>
            </DialogFooter>
          </div>
        )}

        {/* Step 5: Error */}
        {step === "error" && (
          <div className="py-6 space-y-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("dns-config")}>
                {t("bCoder.deploy.viewDnsRecords")}
              </Button>
              <Button onClick={handleClose}>
                Close
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
