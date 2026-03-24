"use client"

import { AssistantWizard } from "@/app/(dashboard)/assistants/add/_components/assistant-wizard"
import { useLocale } from "@/lib/i18n"

export default function NewAssistantPage() {
  const { t } = useLocale()
  return (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-background">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          <h1 className="text-2xl font-medium">{t("wizard.title.create")}</h1>
        </div>
      </div>
      
      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-4xl pb-16">
          <AssistantWizard />
        </div>
      </div>
    </div>
  )
}

