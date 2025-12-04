"use client"

import { useState } from "react"
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
import { toast } from "sonner"
import Image from "next/image"
import { purchaseAssistant } from "@/app/actions/assistant.action"

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
  const [isPurchasing, setIsPurchasing] = useState(false)

  if (!assistant) return null

  const handlePurchase = async () => {
    try {
      setIsPurchasing(true)
      const result = await purchaseAssistant(assistant.id)

      if (result.success && result.url) {
        // Redirect to Stripe Checkout
        window.location.href = result.url
      } else {
        toast.error(result.error || "Failed to initiate purchase")
        setIsPurchasing(false)
      }
    } catch (error: any) {
      console.error("Error purchasing assistant:", error)
      toast.error(error.message || "Something went wrong")
      setIsPurchasing(false)
    }
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
          {/* Assistant Image */}
          {assistant.image && (
            <div className="relative w-full h-48 rounded-lg overflow-hidden bg-muted">
              <Image
                src={assistant.image}
                alt={assistant.name}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Price Display */}
          <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
            <span className="text-lg font-semibold">Price</span>
            <span className="text-2xl font-bold text-[#BDA76D]">
              CHF {assistant.price.toFixed(2)}
            </span>
          </div>

          {/* Category */}
          {assistant.category && (
            <div className="text-sm text-muted-foreground">
              Category: <span className="font-medium">{assistant.category}</span>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isPurchasing}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={isPurchasing}
            className="bg-[#BDA76D] hover:bg-[#BDA76D]/90 text-white"
          >
            {isPurchasing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <ShoppingCart className="mr-2 h-4 w-4" />
                Purchase
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

