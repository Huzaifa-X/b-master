import {
  Calculator,
  FileSpreadsheet,
  Receipt,
  FileText,
  CreditCard,
  Wallet,
  FileBox,
  BookOpen,
  BarChart,
  PieChart,
  Presentation,
  Layers,
  Calendar,
  Video,
  MapPin,
  HelpCircle,
  Ticket,
  Sparkles,
  Settings,
  Users,
} from "lucide-react"
import type { Template, Contact } from "@/types/artifacts"

export const TEMPLATES: Template[] = [
  // Accounting (2 + Custom)
  {
    id: "acc-1",
    name: "Expense Tracker",
    description: "Track and categorize business expenses efficiently",
    category: "accounting",
    icon: "Calculator",
    prefilledInstructions:
      "Create a system to track and categorize business expenses. Include fields for date, amount, category, vendor, and payment method. Generate monthly reports and expense summaries.",
  },
  {
    id: "acc-custom",
    name: "Start from Scratch",
    description: "Create a custom accounting artifact from scratch",
    category: "accounting",
    icon: "Sparkles",
    prefilledInstructions: "",
    isCustom: true,
  },

  // Invoice Templates (5 + Custom)
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

  // Payment Management (2 + Custom)
  {
    id: "pay-1",
    name: "Payment Tracker",
    description: "Track incoming and outgoing payments",
    category: "payment",
    icon: "CreditCard",
    prefilledInstructions:
      "Track payment status for invoices and bills. Monitor pending, completed, and overdue payments. Generate payment reminders and reports.",
  },
  {
    id: "pay-3",
    name: "Subscription Billing",
    description: "Manage recurring subscription payments",
    category: "payment",
    icon: "Calendar",
    prefilledInstructions:
      "Create a subscription billing system with recurring payment schedules, plan management, and automatic payment processing. Include trial periods and upgrade/downgrade handling.",
  },
  {
    id: "pay-custom",
    name: "Start from Scratch",
    description: "Create a custom payment artifact from scratch",
    category: "payment",
    icon: "Sparkles",
    prefilledInstructions: "",
    isCustom: true,
  },

  // Documentations (5 + Custom)
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

  // Analytics (2 + Custom)
  {
    id: "ana-1",
    name: "Sales Dashboard",
    description: "Visualize sales metrics and trends",
    category: "analytics",
    icon: "BarChart",
    prefilledInstructions:
      "Create a sales dashboard with charts for revenue, conversion rates, and sales trends. Include filters for date ranges and product categories.",
  },
  {
    id: "ana-2",
    name: "Performance Analytics",
    description: "Track KPIs and business performance",
    category: "analytics",
    icon: "PieChart",
    prefilledInstructions:
      "Build performance analytics tracking key metrics, goals, and benchmarks. Visualize data with interactive charts and export reports.",
  },
  {
    id: "ana-custom",
    name: "Start from Scratch",
    description: "Create a custom analytics artifact from scratch",
    category: "analytics",
    icon: "Sparkles",
    prefilledInstructions: "",
    isCustom: true,
  },

  // Presentations (5 + Custom)
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

  // Booking (5 + Custom)
  {
    id: "book-calendar",
    name: "Calendar Booking Widget",
    description: "Interactive calendar with Google Calendar integration",
    category: "booking",
    icon: "Calendar",
    prefilledInstructions:
      "Create an interactive booking calendar widget with Google Calendar integration. Automatically creates calendar events with Google Meet links and sends confirmation emails via Gmail. Include availability scheduling, time zone support, booking confirmations, and a beautiful user interface for selecting dates and times.",
  },
  {
    id: "book-1",
    name: "Online Meeting Scheduler",
    description: "Schedule virtual meetings and video calls",
    category: "booking",
    icon: "Video",
    prefilledInstructions:
      "Create a meeting scheduler with calendar integration, time zone support, and automatic video conference link generation.",
  },
  {
    id: "book-2",
    name: "Reservation System",
    description: "Manage bookings for restaurants, hotels, etc.",
    category: "booking",
    icon: "MapPin",
    prefilledInstructions:
      "Build a reservation system with availability calendar, booking confirmations, and cancellation management.",
  },
  {
    id: "book-3",
    name: "Office Booking",
    description: "Book meeting rooms and office spaces",
    category: "booking",
    icon: "MapPin",
    prefilledInstructions:
      "Set up office space booking with floor plans, room availability, equipment options, and booking approvals.",
  },
  {
    id: "book-4",
    name: "Event Registration",
    description: "Manage event registrations and attendees",
    category: "booking",
    icon: "Ticket",
    prefilledInstructions:
      "Create an event registration system with attendee management, ticket types, capacity limits, and check-in functionality. Include waitlist and cancellation management.",
  },
  {
    id: "book-custom",
    name: "Start from Scratch",
    description: "Create a custom booking artifact from scratch",
    category: "booking",
    icon: "Sparkles",
    prefilledInstructions: "",
    isCustom: true,
  },

  // Video Generation (2 + Custom)
  {
    id: "vid-custom",
    name: "Start from Scratch",
    description: "Create a custom video generation artifact from scratch",
    category: "video_generation",
    icon: "Sparkles",
    prefilledInstructions: "",
    isCustom: true,
  },

  // Others (2 + Custom)
  {
    id: "oth-2",
    name: "Ticketing System",
    description: "Support ticket management",
    category: "others",
    icon: "Ticket",
    prefilledInstructions:
      "Build a ticketing system with ticket creation, assignment, status tracking, priority levels, and resolution workflows.",
  },
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
  { id: "accounting", label: "Accounting", icon: Calculator },
  { id: "invoice", label: "Invoice Templates", icon: Receipt },
  { id: "payment", label: "Payment Management", icon: CreditCard },
  { id: "documentation", label: "Documentations", icon: BookOpen },
  { id: "analytics", label: "Analytics", icon: BarChart },
  { id: "presentation", label: "Presentations", icon: Presentation },
  { id: "booking", label: "Booking", icon: Calendar },
  { id: "video_generation", label: "Video Generation", icon: Video },
  { id: "others", label: "Others", icon: HelpCircle },
] as const

export const ICON_MAP: Record<string, any> = {
  Calculator,
  FileSpreadsheet,
  Receipt,
  FileText,
  CreditCard,
  Wallet,
  FileBox,
  BookOpen,
  BarChart,
  PieChart,
  Presentation,
  Layers,
  Calendar,
  Video,
  MapPin,
  HelpCircle,
  Ticket,
  Sparkles,
  Settings,
  Users,
}

export const TEMPLATE_FILES: Record<string, string> = {
  // Accounting
  "acc-1": "/artifcatTemplates/expenseTracker.html",

  // Invoice
  "inv-1": "/artifcatTemplates/professionalInvoice.html",
  "inv-3": "/artifcatTemplates/productInvoice.html",
  "inv-6": "/artifcatTemplates/taxInvoice.html",

  // Payment
  "pay-1": "/artifcatTemplates/paymentTracker.html",
  "pay-3": "/artifcatTemplates/subscription.html",

  // Documentation
  "doc-3": "/artifcatTemplates/techniacalSpecification.html",
  "doc-5": "/artifcatTemplates/faqDocument.html",

  // Analytics
  "ana-1": "/artifcatTemplates/salesDashboard.html",
  "ana-2": "/artifcatTemplates/performanceAnalysis.html",

  // Presentation
  "pre-2": "/artifcatTemplates/productPresentation.html",
  "pre-6": "/artifcatTemplates/salesPresentation.html",

  // Booking
  "book-calendar": "/artifcatTemplates/calendarBooking.html",
  "book-1": "/artifcatTemplates/meetingScheduler.html",
  "book-2": "/artifcatTemplates/reservationSystem.html",
  "book-3": "/artifcatTemplates/officeBooking.html",
  "book-4": "/artifcatTemplates/eventRegistration.html",

  // Others
  "oth-2": "/artifcatTemplates/ticketingSystem.html",
}

