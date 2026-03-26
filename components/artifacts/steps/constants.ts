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
  TrendingUp,
  Calendar,
  CreditCard,
  Users,
  Building2,
  ClipboardList,
  Ticket,
  LineChart,
  Activity,
  LayoutDashboard,
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
    id: "inv-swiss-qr",
    name: "Swiss QR Invoice",
    description: "🇨🇭 Swiss QR-bill compliant invoice with payment slip",
    category: "invoice",
    icon: "Receipt",
    prefilledInstructions:
      "Create a Swiss QR-bill compliant invoice (QR-Facture) with payment slip. Include: company IBAN (CH format), complete creditor/debtor addresses, invoice items with CHF amounts and 8.1% TVA, and a Swiss QR code at the bottom with Récépissé (receipt) and Section Paiement. The QR code must contain Swiss Payment Standard data: SPC header, IBAN, structured addresses, amount in CHF, and EPD end marker. Add Swiss cross overlay on QR code. Payment slip must be 105mm height with dashed borders.",
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

  // CRM & Business
  {
    id: "crm-1",
    name: "Real-Time Project Tracker",
    description: "Live project monitoring with milestones, team progress, and interactive controls",
    category: "crm",
    icon: "Activity",
    prefilledInstructions:
      "Create a real-time project tracking artifact with milestones, team assignments, progress bars, status badges, deadline countdowns, and an interactive control panel to update task statuses. Include charts for burn-down rate and completion percentage.",
  },
  {
    id: "crm-2",
    name: "CRM & Payment Dashboard",
    description: "CRM artifact with Stripe-style payments, invoicing, and sales pipeline",
    category: "crm",
    icon: "CreditCard",
    prefilledInstructions:
      "Build a CRM dashboard with sales pipeline, received payments, unpaid invoices, and Stripe-style payment management. Include a contacts list, deal stages, revenue metrics, and invoice generation.",
  },
  {
    id: "crm-3",
    name: "Sales CRM Dashboard",
    description: "Full CRM with leads, opportunities, and revenue analytics",
    category: "crm",
    icon: "Users",
    prefilledInstructions:
      "Create a sales CRM dashboard with lead tracking, opportunity pipeline, contact management, deal stages, activity log, and revenue analytics charts.",
  },
  {
    id: "crm-4",
    name: "Payment Tracker",
    description: "Track payments, invoices, and financial transactions",
    category: "crm",
    icon: "TrendingUp",
    prefilledInstructions:
      "Build a payment tracking artifact with paid/unpaid invoice lists, payment status badges, total revenue widget, overdue alerts, and filter by date or client.",
  },
  {
    id: "crm-5",
    name: "Expense Tracker",
    description: "Personal or business expense management with budgets",
    category: "crm",
    icon: "LineChart",
    prefilledInstructions:
      "Create an expense tracker with categorized expenses, monthly budget limits, spending charts, receipt notes, and a summary of total spend vs. budget.",
  },
  {
    id: "crm-6",
    name: "Subscription Manager",
    description: "Manage subscriptions, renewals, and billing cycles",
    category: "crm",
    icon: "ClipboardList",
    prefilledInstructions:
      "Build a subscription manager with active/cancelled subscription lists, renewal dates, billing amounts, cost summary, and cancel/upgrade action buttons.",
  },
  {
    id: "crm-7",
    name: "Ticketing System",
    description: "Support ticket management with priority and status tracking",
    category: "crm",
    icon: "Ticket",
    prefilledInstructions:
      "Create a support ticketing system with open/closed/in-progress tickets, priority levels (high/medium/low), assignee management, SLA timers, and a dashboard with ticket stats.",
  },
  {
    id: "crm-8",
    name: "Performance Analytics",
    description: "Team and business performance analysis dashboard",
    category: "crm",
    icon: "LayoutDashboard",
    prefilledInstructions:
      "Build a performance analytics dashboard with KPI cards, team velocity charts, goal completion rates, comparison with previous periods, and exportable reports.",
  },
  {
    id: "crm-9",
    name: "All-in-One Master Dashboard",
    description: "Complete business command center: KPIs, CRM pipeline, projects, invoices, team & analytics",
    category: "crm",
    icon: "LayoutDashboard",
    prefilledInstructions:
      "Build a comprehensive all-in-one business master dashboard with: a top KPI bar (revenue, active deals, open tasks, team members), a CRM sales pipeline (Kanban columns: Lead → Qualified → Proposal → Won/Lost), a project tracker with progress bars, an invoice summary widget with paid/unpaid amounts, a team activity feed, a mini calendar for upcoming events, and a revenue line chart by month. All sections interactive with status updates.",
  },
  {
    id: "crm-10",
    name: "Full CRM Suite",
    description: "Enterprise CRM: contacts, deals pipeline, activity log, email history, tasks & revenue analytics",
    category: "crm",
    icon: "Users",
    prefilledInstructions:
      "Create a detailed enterprise CRM suite with multiple tabs: (1) Dashboard – revenue metrics, win rate, avg deal size, pipeline value, and a monthly revenue chart; (2) Contacts – searchable/filterable table with contact cards, tags, last activity, and lead score; (3) Deals – full Kanban pipeline with drag-drop stages (New Lead, Contacted, Qualified, Proposal Sent, Negotiation, Closed Won, Closed Lost), deal value, probability, and owner; (4) Activities – chronological timeline of calls, emails, meetings, and notes with filters; (5) Tasks – task list with due dates, priorities, and completion tracking; (6) Reports – bar/pie charts for deals by stage, deals by owner, monthly targets vs actual. Include sidebar navigation, search, and notification bell.",
  },
  {
    id: "crm-custom",
    name: "Start from Scratch",
    description: "Create a custom CRM or business artifact from scratch",
    category: "crm",
    icon: "Sparkles",
    prefilledInstructions: "",
    isCustom: true,
  },
]


export const CATEGORIES = [
  { id: "presentation", label: "Presentations", icon: Presentation },
  { id: "documentation", label: "Documentations", icon: BookOpen },
  { id: "invoice", label: "Invoices", icon: Receipt },
  { id: "crm", label: "CRM & Business", icon: TrendingUp },
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
  TrendingUp,
  Calendar,
  CreditCard,
  Users,
  Building2,
  ClipboardList,
  Ticket,
  LineChart,
  Activity,
  LayoutDashboard,
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
  "inv-swiss-qr": "/artifcatTemplates/swissQrInvoice.html",

  // CRM & Business
  "crm-1": "/artifcatTemplates/performanceAnalysis.html",
  "crm-2": "/artifcatTemplates/paymentTracker.html",
  "crm-3": "/artifcatTemplates/salesDashboard.html",
  "crm-4": "/artifcatTemplates/paymentTracker.html",
  "crm-5": "/artifcatTemplates/expenseTracker.html",
  "crm-6": "/artifcatTemplates/subscription.html",
  "crm-7": "/artifcatTemplates/ticketingSystem.html",
  "crm-8": "/artifcatTemplates/performanceAnalysis.html",
  "crm-9": "/artifcatTemplates/masterDashboard.html",
  "crm-10": "/artifcatTemplates/fullCrmSuite.html",
}

