"use client"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, ShoppingCart } from "lucide-react"
import Image from "next/image"
import { usePurchaseAssistant } from "@/hooks/useAssistantMutations"
import { useLocale } from "@/lib/i18n"

interface Assistant {
  id: string
  name: string
  price: number
  description: string
  image: string
  category?: string
}

interface PurchaseAssistantDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assistant: Assistant | null
}

export function PurchaseAssistantDialog({
  open,
  onOpenChange,
  assistant,
}: PurchaseAssistantDialogProps) {
  const { purchaseAssistant, isPurchasing } = usePurchaseAssistant()
  const { t } = useLocale()

  if (!assistant) return null

  const handlePurchase = () => {
    purchaseAssistant(assistant.id)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl">{assistant.name}</DialogTitle>
          <DialogDescription className="text-base">
            {assistant.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Price Display */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="text-lg font-semibold">{t("store.price")}</span>
            <span className="text-2xl font-bold text-[#BDA76D]">
              CHF {assistant.price.toFixed(2)}
            </span>
          </div>

          {/* Category */}
          {assistant.category && (
            <div className="text-sm text-muted-foreground">
              {t("store.categories")}: <span className="font-medium">{assistant.category}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPurchasing}
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={isPurchasing}
            className="bg-[#BDA76D] hover:bg-[#BDA76D]/90 text-white"
          >
            {isPurchasing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t("store.processing")}
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                {t("store.purchaseAssistant")}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

