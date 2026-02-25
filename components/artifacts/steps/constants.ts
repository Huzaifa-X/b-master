import {
  FileSpreadsheet,
  Receipt,
  FileBox,
  BookOpen,
  BarChart,
  Presentation,
  Layers,
  Video,
  HelpCircle,
  Sparkles,
} from "lucide-react"
import type { Template } from "@/types/artifacts"

export const TEMPLATES: Template[] = [
  // Presentations
  {
    id: "pre-2",
    name: "Product Demo",
    description: "Showcase product features and benefits",
    category: "presentation",
    icon: "Layers",
    prefilledInstructions:
      "Build a product demonstration presentation highlighting key features, use cases, and customer testimonials.",
  },
  {
    id: "pre-6",
    name: "Sales Presentation",
    description: "Persuasive sales deck with ROI calculator",
    category: "presentation",
    icon: "BarChart",
    prefilledInstructions:
      "Create sales presentations with value proposition, competitive analysis, pricing, ROI calculator, and case studies. Include interactive elements and testimonials.",
  },
  {
    id: "pre-custom",
    name: "Start from Scratch",
    description: "Create a custom presentation artifact from scratch",
    category: "presentation",
    icon: "Sparkles",
    prefilledInstructions: "",
    isCustom: true,
  },

  // Documentations
  {
    id: "doc-3",
    name: "Technical Specification",
    description: "Detailed technical specifications document",
    category: "documentation",
    icon: "FileBox",
    prefilledInstructions:
      "Create technical specifications with system architecture, requirements, diagrams, and implementation details.",
  },
  {
    id: "doc-5",
    name: "FAQ Document",
    description: "Frequently asked questions and answers",
    category: "documentation",
    icon: "HelpCircle",
    prefilledInstructions:
      "Create FAQ documents with categories, searchable questions, and detailed answers. Include related links and resources.",
  },
  {
    id: "doc-custom",
    name: "Start from Scratch",
    description: "Create a custom documentation artifact from scratch",
    category: "documentation",
    icon: "Sparkles",
    prefilledInstructions: "",
    isCustom: true,
  },

  // Invoices
  {
    id: "inv-1",
    name: "Professional Invoice",
    description: "Clean and professional invoice template",
    category: "invoice",
    icon: "Receipt",
    prefilledInstructions:
      "Create a professional invoice with company logo, itemized list, tax calculations, and payment terms. Include fields for invoice number, date, due date, and client information.",
  },
  {
    id: "inv-3",
    name: "Product Invoice",
    description: "Invoice for product sales with inventory tracking",
    category: "invoice",
    icon: "Layers",
    prefilledInstructions:
      "Create product invoices with quantity, unit price, and total calculations. Include product codes, descriptions, and shipping information.",
  },
  {
    id: "inv-6",
    name: "Tax Invoice",
    description: "Invoice with detailed tax breakdown and compliance",
    category: "invoice",
    icon: "FileSpreadsheet",
    prefilledInstructions:
      "Generate tax-compliant invoices with itemized tax calculations, tax registration numbers, and regional tax requirements. Support multiple tax rates and categories.",
  },
  {
    id: "inv-custom",
    name: "Start from Scratch",
    description: "Create a custom invoice artifact from scratch",
    category: "invoice",
    icon: "Sparkles",
    prefilledInstructions: "",
    isCustom: true,
  },

  // Video Generation
  {
    id: "vid-custom",
    name: "Start from Scratch",
    description: "Create a custom video generation artifact from scratch",
    category: "video_generation",
    icon: "Sparkles",
    prefilledInstructions: "",
    isCustom: true,
  },

  // Others
  {
    id: "oth-custom",
    name: "Start from Scratch",
    description: "Create a custom artifact from scratch",
    category: "others",
    icon: "Sparkles",
    prefilledInstructions: "",
    isCustom: true,
  },
]

export const CATEGORIES = [
  { id: "presentation", label: "Presentations", icon: Presentation },
  { id: "documentation", label: "Documentations", icon: BookOpen },
  { id: "invoice", label: "Invoices", icon: Receipt },
  { id: "video_generation", label: "Video Generation", icon: Video },
  { id: "others", label: "Others", icon: HelpCircle },
] as const

export const ICON_MAP: Record<string, any> = {
  FileSpreadsheet,
  Receipt,
  FileBox,
  BookOpen,
  BarChart,
  Presentation,
  Layers,
  Video,
  HelpCircle,
  Sparkles,
}

export const TEMPLATE_FILES: Record<string, string> = {
  // Presentation
  "pre-2": "/artifcatTemplates/productPresentation.html",
  "pre-6": "/artifcatTemplates/salesPresentation.html",

  // Documentation
  "doc-3": "/artifcatTemplates/techniacalSpecification.html",
  "doc-5": "/artifcatTemplates/faqDocument.html",

  // Invoice
  "inv-1": "/artifcatTemplates/professionalInvoice.html",
  "inv-3": "/artifcatTemplates/productInvoice.html",
  "inv-6": "/artifcatTemplates/taxInvoice.html",
}

