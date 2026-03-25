"use client"

import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { InputGroup, InputGroupAddon, InputGroupText, InputGroupInput } from "@/components/ui/input-group"
import { AssistantCategory, BasicInformationStepProps } from "@/types/assistant"
import { useLocale } from "@/lib/i18n"

export function BasicInformationStep({ formData, updateFormData }: BasicInformationStepProps) {
  const { t } = useLocale()
  
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">{t("wizard.basicInfo.title")}</h2>
        <p className="text-muted-foreground">
          {t("wizard.basicInfo.description")}
        </p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            {t("wizard.basicInfo.nameLabel")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            placeholder={t("wizard.basicInfo.namePlaceholder")}
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            className="w-full"
          />
          <p className="text-sm text-muted-foreground">
            {t("wizard.basicInfo.nameHint")}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">
            {t("wizard.basicInfo.categoryLabel")} <span className="text-destructive">*</span>
          </Label>
          <Select
            value={formData.category}
            onValueChange={(value) => updateFormData({ category: value as AssistantCategory })}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t("wizard.basicInfo.categoryPlaceholder")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Education" className="focus:bg-muted focus:text-foreground">{t("wizard.basicInfo.categories.education")}</SelectItem>
              <SelectItem value="Travelling" className="focus:bg-muted focus:text-foreground capitalize">{t("wizard.basicInfo.categories.travelling")}</SelectItem>
              <SelectItem value="Programming" className="focus:bg-muted focus:text-foreground capitalize">{t("wizard.basicInfo.categories.programming")}</SelectItem>
              <SelectItem value="Markteting" className="focus:bg-muted focus:text-foreground capitalize">{t("wizard.basicInfo.categories.marketing")}</SelectItem>
              <SelectItem value="Analysis" className="focus:bg-muted focus:text-foreground capitalize">{t("wizard.basicInfo.categories.analysis")}</SelectItem>
              <SelectItem value="Booking" className="focus:bg-muted focus:text-foreground capitalize">{t("wizard.basicInfo.categories.booking")}</SelectItem>
              <SelectItem value="Other" className="focus:bg-muted focus:text-foreground capitalize">{t("wizard.basicInfo.categories.other")}</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-sm text-muted-foreground">
            {t("wizard.basicInfo.categoryHint")}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="price">
            {t("wizard.basicInfo.priceLabel")} <span className="text-destructive">*</span>
          </Label>
          <InputGroup>
            <InputGroupAddon>
              <InputGroupText>CHF</InputGroupText>
            </InputGroupAddon>
            <InputGroupInput
              placeholder={t("wizard.basicInfo.pricePlaceholder")}
              value={formData.price}
              onChange={(e) => updateFormData({ price: e.target.value })}
              type="number"
              min="0"
              step="0.01"
            />
          </InputGroup>
          <p className="text-sm text-muted-foreground">
            {t("wizard.basicInfo.priceHint")}
          </p>
        </div>


        <div className="space-y-2">
          <Label htmlFor="description">
            {t("wizard.basicInfo.descLabel")} <span className="text-destructive">*</span>
          </Label>
          <Textarea
            id="description"
            placeholder={t("wizard.basicInfo.descPlaceholder")}
            value={formData.description}
            onChange={(e) => updateFormData({ description: e.target.value })}
            rows={6}
            className="resize-none"
          />
          <p className="text-sm text-muted-foreground">
            {t("wizard.basicInfo.descHint")}
          </p>
        </div>
      </div>
    </div>
  )
}

