"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  X,
  Check,
  Sparkles,
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
  Users,
  Settings,
  Plus,
  Trash2,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { UserSelectTable, type SelectedUser, type Contact } from "@/components/shared/user-select-table"

// Types
export type Category =
  | "accounting"
  | "invoice"
  | "payment"
  | "documentation"
  | "analytics"
  | "presentation"
  | "booking"
  | "others"

export type Permission = "private" | "team" | "public"

export interface Template {
  id: string
  name: string
  description: string
  category: Category
  icon: string
  prefilledInstructions: string
  isCustom?: boolean
}

export interface ApiConfig {
  id: string
  key: string
  value: string
}

export interface ArtifactFormData {
  templateId: string
  name: string
  instructions: string
  permissions: Permission
  selectedUsers: SelectedUser[]
  apiConfigs: ApiConfig[]
}

// Mock Contacts
const MOCK_CONTACTS: Contact[] = [
  { id: "1", name: "John Doe", email: "john@example.com" },
  { id: "2", name: "Jane Smith", email: "jane@example.com" },
  { id: "3", name: "Mike Johnson", email: "mike@example.com" },
  { id: "4", name: "Sarah Williams", email: "sarah@example.com" },
  { id: "5", name: "David Brown", email: "david@example.com" },
]

// Mock Data
const TEMPLATES: Template[] = [
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
    id: "acc-2",
    name: "Balance Sheet Generator",
    description: "Generate balance sheets from financial data",
    category: "accounting",
    icon: "FileSpreadsheet",
    prefilledInstructions:
      "Generate comprehensive balance sheets with assets, liabilities, and equity sections. Calculate totals and net worth automatically. Support multiple date ranges and comparison views.",
  },
  {
    id: "acc-3",
    name: "Budget Planner",
    description: "Plan and track budgets with forecasting",
    category: "accounting",
    icon: "Wallet",
    prefilledInstructions:
      "Create a budget planning tool with income tracking, expense categorization, and variance analysis. Include monthly and yearly budget comparisons with visual charts.",
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
    id: "inv-2",
    name: "Service Invoice",
    description: "Invoice template for service-based businesses",
    category: "invoice",
    icon: "FileText",
    prefilledInstructions:
      "Generate service invoices with hourly rates, service descriptions, and time tracking. Calculate subtotals and apply discounts automatically.",
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
    id: "inv-4",
    name: "Recurring Invoice",
    description: "Template for subscription-based billing",
    category: "invoice",
    icon: "Receipt",
    prefilledInstructions:
      "Set up recurring invoices for subscription services. Define billing cycles, auto-generate invoices, and track payment history.",
  },
  {
    id: "inv-5",
    name: "Proforma Invoice",
    description: "Preliminary invoice before final billing",
    category: "invoice",
    icon: "FileBox",
    prefilledInstructions:
      "Generate proforma invoices for quotes and estimates. Convert to final invoices once approved. Include validity period and terms.",
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
    id: "pay-2",
    name: "Payment Gateway Integration",
    description: "Integrate with payment processors",
    category: "payment",
    icon: "Wallet",
    prefilledInstructions:
      "Set up payment gateway integration for online transactions. Support multiple payment methods including cards, wallets, and bank transfers.",
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
    id: "doc-1",
    name: "API Documentation",
    description: "Generate API documentation automatically",
    category: "documentation",
    icon: "BookOpen",
    prefilledInstructions:
      "Create comprehensive API documentation with endpoints, parameters, request/response examples, and authentication details.",
  },
  {
    id: "doc-2",
    name: "User Manual",
    description: "Step-by-step user guide and manual",
    category: "documentation",
    icon: "FileText",
    prefilledInstructions:
      "Generate user manuals with step-by-step instructions, screenshots, and troubleshooting guides. Include table of contents and search functionality.",
  },
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
    id: "doc-4",
    name: "Release Notes",
    description: "Document software updates and changes",
    category: "documentation",
    icon: "Layers",
    prefilledInstructions:
      "Generate release notes documenting new features, bug fixes, improvements, and known issues for each version.",
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
    id: "doc-6",
    name: "Knowledge Base",
    description: "Organized knowledge base with search",
    category: "documentation",
    icon: "FileBox",
    prefilledInstructions:
      "Build a comprehensive knowledge base with categorized articles, advanced search, tagging system, and article versioning. Include analytics for popular articles and user feedback.",
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
    id: "ana-3",
    name: "Customer Insights",
    description: "Analyze customer behavior and patterns",
    category: "analytics",
    icon: "Users",
    prefilledInstructions:
      "Create customer analytics dashboard showing user behavior, demographics, purchase patterns, and customer lifetime value. Include segmentation and cohort analysis tools.",
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
    id: "pre-1",
    name: "Business Pitch Deck",
    description: "Professional pitch deck for investors",
    category: "presentation",
    icon: "Presentation",
    prefilledInstructions:
      "Create a compelling pitch deck with problem, solution, market size, business model, and financial projections slides.",
  },
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
    id: "pre-3",
    name: "Training Presentation",
    description: "Educational and training materials",
    category: "presentation",
    icon: "BookOpen",
    prefilledInstructions:
      "Develop training presentations with learning objectives, content modules, exercises, and assessment slides.",
  },
  {
    id: "pre-4",
    name: "Quarterly Review",
    description: "Business performance review deck",
    category: "presentation",
    icon: "BarChart",
    prefilledInstructions:
      "Generate quarterly review presentations with metrics, achievements, challenges, and goals for next quarter.",
  },
  {
    id: "pre-5",
    name: "Client Proposal",
    description: "Professional client proposal presentation",
    category: "presentation",
    icon: "FileText",
    prefilledInstructions:
      "Create client proposals with scope of work, timeline, deliverables, pricing, and terms and conditions.",
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

  // Booking (3 + Custom)
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
    icon: "Calendar",
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

  // Others (2 + Custom)
  {
    id: "oth-1",
    name: "Clarifications System",
    description: "Submit and track clarification requests",
    category: "others",
    icon: "HelpCircle",
    prefilledInstructions:
      "Create a system for submitting clarification requests, tracking responses, and managing Q&A threads.",
  },
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
    id: "oth-3",
    name: "Workflow Automation",
    description: "Automate repetitive tasks and workflows",
    category: "others",
    icon: "Settings",
    prefilledInstructions:
      "Build workflow automation with trigger conditions, action sequences, and integration with external tools. Include scheduling, notifications, and error handling.",
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

const CATEGORIES = [
  { id: "accounting", label: "Accounting", icon: Calculator },
  { id: "invoice", label: "Invoice Templates", icon: Receipt },
  { id: "payment", label: "Payment Management", icon: CreditCard },
  { id: "documentation", label: "Documentations", icon: BookOpen },
  { id: "analytics", label: "Analytics", icon: BarChart },
  { id: "presentation", label: "Presentations", icon: Presentation },
  { id: "booking", label: "Booking", icon: Calendar },
  { id: "others", label: "Others", icon: HelpCircle },
] as const

const ICON_MAP: Record<string, any> = {
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

interface CreateArtifactDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateArtifactDialog({ open, onOpenChange }: CreateArtifactDialogProps) {
  const [step, setStep] = useState(1)
  const [selectedCategory, setSelectedCategory] = useState<Category>("accounting")
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)
  const [apiSectionOpen, setApiSectionOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [formData, setFormData] = useState<ArtifactFormData>({
    templateId: "",
    name: "",
    instructions: "",
    permissions: "private",
    selectedUsers: [],
    apiConfigs: [],
  })

  const [errors, setErrors] = useState<Partial<Record<keyof ArtifactFormData, string>>>({})

  // Get available contacts (not yet added)
  const availableContacts = MOCK_CONTACTS.filter(
    (contact) => !formData.selectedUsers.some((user) => user.id === contact.id)
  )

  // Get templates for selected category
  const categoryTemplates = TEMPLATES.filter((t) => t.category === selectedCategory)

  // Get selected template object
  const selectedTemplateObj = TEMPLATES.find((t) => t.id === selectedTemplate)

  // Get template count for each category
  const getTemplateCount = (category: Category) => {
    return TEMPLATES.filter((t) => t.category === category).length
  }

  // Reset form when dialog closes
  useEffect(() => {
    if (!open) {
      setTimeout(() => {
        setStep(1)
        setSelectedCategory("accounting")
        setSelectedTemplate(null)
        setFormData({
          templateId: "",
          name: "",
          instructions: "",
          permissions: "private",
          selectedUsers: [],
          apiConfigs: [],
        })
        setErrors({})
        setApiSectionOpen(false)
      }, 200)
    }
  }, [open])

  // Pre-fill form when template is selected and moving to step 2
  useEffect(() => {
    if (step === 2 && selectedTemplateObj) {
      setFormData((prev) => ({
        ...prev,
        templateId: selectedTemplateObj.id,
        name: selectedTemplateObj.isCustom ? "" : `${selectedTemplateObj.name} - Copy`,
        instructions: selectedTemplateObj.prefilledInstructions,
      }))
    }
  }, [step, selectedTemplateObj])

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId)
  }

  const handleNextStep = () => {
    if (step === 1 && selectedTemplate) {
      setStep(2)
    }
  }

  const handleBackStep = () => {
    if (step === 2) {
      setStep(1)
    }
  }

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof ArtifactFormData, string>> = {}

    if (!formData.name.trim()) {
      newErrors.name = "Artifact name is required"
    }

    if (!formData.instructions.trim()) {
      newErrors.instructions = "Instructions are required"
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateForm()) {
      return
    }

    setIsSubmitting(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))

    console.log("Creating artifact:", formData)
    toast.success("Artifact created successfully!")

    setIsSubmitting(false)
    onOpenChange(false)
  }

  // User Select Handlers
  const handleAddUser = (userId: string) => {
    const contact = MOCK_CONTACTS.find((c) => c.id === userId)
    if (contact) {
      const newUser: SelectedUser = {
        id: contact.id,
        name: contact.name,
        email: contact.email,
      }
      setFormData((prev) => ({
        ...prev,
        selectedUsers: [...prev.selectedUsers, newUser],
      }))
    }
  }

  const handleRemoveUser = (userId: string) => {
    setFormData((prev) => ({
      ...prev,
      selectedUsers: prev.selectedUsers.filter((user) => user.id !== userId),
    }))
  }

  // API Config Handlers
  const handleAddApiConfig = () => {
    const newConfig: ApiConfig = {
      id: Date.now().toString(),
      key: "",
      value: "",
    }
    setFormData((prev) => ({
      ...prev,
      apiConfigs: [...prev.apiConfigs, newConfig],
    }))
  }

  const handleRemoveApiConfig = (configId: string) => {
    setFormData((prev) => ({
      ...prev,
      apiConfigs: prev.apiConfigs.filter((config) => config.id !== configId),
    }))
  }

  const handleUpdateApiConfig = (configId: string, field: "key" | "value", newValue: string) => {
    setFormData((prev) => ({
      ...prev,
      apiConfigs: prev.apiConfigs.map((config) =>
        config.id === configId ? { ...config, [field]: newValue } : config
      ),
    }))
  }

  // Dummy HTML code for preview
  const getDummyHTML = () => {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Artifact Preview</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
            padding: 40px;
            max-width: 600px;
            width: 100%;
        }
        h1 {
            color: #333;
            font-size: 32px;
            margin-bottom: 10px;
        }
        .subtitle {
            color: #666;
            font-size: 16px;
            margin-bottom: 30px;
        }
        .feature-list {
            list-style: none;
            margin-bottom: 30px;
        }
        .feature-list li {
            padding: 15px;
            background: #f8f9fa;
            border-radius: 10px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            transition: transform 0.2s;
        }
        .feature-list li:hover {
            transform: translateX(5px);
        }
        .feature-list li::before {
            content: "✓";
            display: inline-block;
            width: 24px;
            height: 24px;
            background: #667eea;
            color: white;
            border-radius: 50%;
            text-align: center;
            line-height: 24px;
            margin-right: 12px;
            font-weight: bold;
        }
        .cta-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 40px;
            border-radius: 30px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: transform 0.2s;
        }
        .cta-button:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎨 Custom Artifact</h1>
        <p class="subtitle">This is a preview of your custom artifact</p>
        
        <ul class="feature-list">
            <li>Create dynamic and interactive content</li>
            <li>Full HTML, CSS, and JavaScript support</li>
            <li>Responsive and mobile-friendly design</li>
            <li>Real-time preview of your creation</li>
        </ul>
        
        <button class="cta-button">Get Started</button>
    </div>
</body>
</html>`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[98vw] sm:!max-w-[98vw] w-full h-[98vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-2xl">Create Artifact</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">Step {step} of 2</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {step === 1 && (
            <div className="h-full flex flex-col lg:flex-row gap-6 p-6">
              {/* Left Side - Category & Template Selection */}
              <div className={cn("flex-1 overflow-y-auto", selectedTemplate && "lg:w-1/2")}>
                <div className="space-y-6">
                  {/* Category Selection */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Select Category</h3>
                    <div className="w-full overflow-x-auto pb-4 scrollbar-hide">
                      <div className="flex gap-2">
                        {CATEGORIES.map((category) => {
                          const Icon = category.icon
                          const isActive = selectedCategory === category.id
                          return (
                            <button
                              key={category.id}
                              onClick={() => {
                                setSelectedCategory(category.id as Category)
                                setSelectedTemplate(null)
                              }}
                              className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-full border-2 transition-all whitespace-nowrap shrink-0",
                                isActive
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border hover:border-primary/50 hover:bg-muted"
                              )}
                            >
                              <Icon className="h-4 w-4" />
                              <span className="font-medium">{category.label}</span>
                              <Badge
                                variant={isActive ? "secondary" : "outline"}
                                className={cn("ml-1", isActive && "bg-primary-foreground/20 text-primary-foreground")}
                              >
                                {getTemplateCount(category.id as Category)}
                              </Badge>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Template Grid */}
                  <div>
                    <h3 className="text-lg font-semibold mb-4">Choose Template</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {categoryTemplates.map((template) => {
                        const Icon = ICON_MAP[template.icon]
                        const isSelected = selectedTemplate === template.id
                        return (
                          <button
                            key={template.id}
                            onClick={() => handleTemplateSelect(template.id)}
                            className={cn(
                              "relative p-4 rounded-lg border-2 text-left",
                              isSelected
                                ? "border-primary bg-primary/5"
                                : template.isCustom
                                ? "border-dashed border-purple-300 dark:border-purple-700 hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950/30"
                                : "border-border hover:border-primary/50"
                            )}
                          >
                            {isSelected && (
                              <div className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                                <Check className="h-4 w-4 text-primary-foreground" />
                              </div>
                            )}
                            <div className="flex items-start gap-3 mb-3">
                              <div
                                className={cn(
                                  "p-2 rounded-lg",
                                  template.isCustom
                                    ? "bg-purple-100 dark:bg-purple-900/30"
                                    : "bg-muted"
                                )}
                              >
                                <Icon
                                  className={cn(
                                    "h-5 w-5",
                                    template.isCustom && "text-purple-600 dark:text-purple-400"
                                  )}
                                />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm mb-1">{template.name}</h4>
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {template.description}
                                </p>
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Side - HTML Preview (shows when any template selected) */}
              {selectedTemplateObj && (
                <div className="flex-1 lg:w-1/2 border-l pl-6 hidden lg:flex">
                  <div className="h-full flex flex-col w-full">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold">Live Preview</h3>
                      <Badge variant="outline" className="text-xs">
                        {selectedTemplateObj.name}
                      </Badge>
                    </div>
                    <div className="flex-1 border-2 rounded-lg overflow-hidden bg-white dark:bg-neutral-950 shadow-inner">
                      <iframe
                        srcDoc={getDummyHTML()}
                        className="w-full h-full border-0"
                        title="Artifact Preview"
                        sandbox="allow-scripts allow-forms allow-popups allow-same-origin"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-2 text-center">
                      ✨ Preview of how your <span className="font-medium">{selectedTemplateObj.name}</span> will look
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {step === 2 && selectedTemplateObj && (
            <div className="h-full overflow-y-auto p-6">
              <div className="space-y-6 max-w-3xl mx-auto">
              {/* Selected Template Display */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-background">
                    {(() => {
                      const Icon = ICON_MAP[selectedTemplateObj.icon]
                      return <Icon className="h-5 w-5" />
                    })()}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Selected Template</p>
                    <p className="font-semibold">{selectedTemplateObj.name}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={handleBackStep}>
                  Change Template
                </Button>
              </div>

              {/* Basic Information */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">
                    Artifact Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData({ ...formData, name: e.target.value })
                      if (errors.name) setErrors({ ...errors, name: undefined })
                    }}
                    placeholder="Enter artifact name"
                    className="mt-2"
                  />
                  {errors.name && <p className="text-xs text-destructive mt-1">{errors.name}</p>}
                </div>

                <div>
                  <Label htmlFor="instructions">
                    Instructions <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="instructions"
                    value={formData.instructions}
                    onChange={(e) => {
                      setFormData({ ...formData, instructions: e.target.value })
                      if (errors.instructions) setErrors({ ...errors, instructions: undefined })
                    }}
                    placeholder="Describe what this artifact should do..."
                    className="mt-2 min-h-[120px]"
                    rows={5}
                  />
                  {errors.instructions && (
                    <p className="text-xs text-destructive mt-1">{errors.instructions}</p>
                  )}
                </div>
              </div>

              {/* Sharing & Permissions */}
              <div>
                <h3 className="text-lg font-semibold mb-4">Sharing & Permissions</h3>
                <UserSelectTable
                  selectedUsers={formData.selectedUsers}
                  availableContacts={availableContacts}
                  onAddUser={handleAddUser}
                  onRemoveUser={handleRemoveUser}
                />
              </div>

              {/* API Configuration */}
              <Collapsible open={apiSectionOpen} onOpenChange={setApiSectionOpen}>
                <CollapsibleTrigger asChild>
                  <Button variant="outline" className="w-full justify-between hover:text-primary hover:bg-transparent">
                    <div className="flex items-center gap-2">
                      <Settings className="h-4 w-4" />
                      <span>Advanced: API Configuration</span>
                      {formData.apiConfigs.length > 0 && (
                        <Badge variant="secondary" className="ml-2">
                          {formData.apiConfigs.length}
                        </Badge>
                      )}
                    </div>
                    <ChevronDown
                      className={cn("h-4 w-4 transition-transform", apiSectionOpen && "rotate-180")}
                    />
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-muted-foreground">
                      Add API key-value pairs to configure external integrations
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddApiConfig}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Config
                    </Button>
                  </div>

                  {formData.apiConfigs.length > 0 ? (
                    <div className="space-y-3">
                      {formData.apiConfigs.map((config) => (
                        <div key={config.id} className="flex gap-2 items-start p-3 border rounded-lg">
                          <div className="flex-1 grid grid-cols-2 gap-2">
                            <div>
                              <Label className="text-xs text-muted-foreground">Key</Label>
                              <Input
                                value={config.key}
                                onChange={(e) => handleUpdateApiConfig(config.id, "key", e.target.value)}
                                placeholder="API_KEY"
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <Label className="text-xs text-muted-foreground">Value</Label>
                              <Input
                                value={config.value}
                                onChange={(e) => handleUpdateApiConfig(config.id, "value", e.target.value)}
                                placeholder="your-api-key-value"
                                type="password"
                                className="mt-1"
                              />
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveApiConfig(config.id)}
                            className="hover:bg-destructive/10 hover:text-destructive mt-6"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 border rounded-lg border-dashed">
                      <Settings className="h-10 w-10 mx-auto mb-2 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">No API configurations added</p>
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="px-6 py-4 border-t flex-shrink-0">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)} className="hover:text-primary hover:bg-transparent">
                Cancel
              </Button>
              <Button onClick={handleNextStep} disabled={!selectedTemplate}>
                Next Step
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={handleBackStep} className="hover:text-primary hover:bg-transparent">
                <ChevronLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Artifact"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

