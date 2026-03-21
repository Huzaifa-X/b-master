/**
 * Template Registry
 * Central location for all B-Coder templates
 */

import { defaultTodoTemplate } from "./default-todo"
import { bookingSystemTemplate } from "./booking-system"
import { calendarBookingTemplate } from "./calendar-booking"
import { eventRegistrationTemplate } from "./event-registration"
import { meetingSchedulerTemplate } from "./meeting-scheduler"
import { officeBookingTemplate } from "./office-booking"
import { reservationSystemTemplate } from "./reservation-system"
import { accountingDashboardTemplate } from "./accounting-dashboard"
import { analyticsDashboardTemplate } from "./analytics-dashboard"
import { fromScratchTemplate } from "./from-scratch"
import { websiteTemplate } from "./website"
import { ecommerceTemplate } from "./e-commerce"
import { seoContentTemplate } from "./seo-content"
import { copywritingTemplate } from "./copywriting"
import { visualAdsTemplate } from "./visual-ads"
import { tradingTemplate } from "./trading"


export interface TemplateDefinition {
    id: string
    name: string
    description: string
    category: string
    icon?: string
    files: Record<string, string>
}

export interface Template extends TemplateDefinition {
    isEnabled: boolean
}

// Template registry
const templates: Record<string, Template> = {
    // Starter Templates
    "from-scratch": {
        ...fromScratchTemplate,
        isEnabled: true,
    } as Template,
    "default-todo": {
        ...defaultTodoTemplate,
        isEnabled: true,
    } as Template,
    // Website & Landing Pages
    "website": {
        ...websiteTemplate,
        isEnabled: true,
    } as Template,
    // E-Commerce
    "e-commerce": {
        ...ecommerceTemplate,
        isEnabled: true,
    } as Template,
    // Booking & Scheduling
    "booking-system": {
        ...bookingSystemTemplate,
        isEnabled: true,
    } as Template,
    "calendar-booking": {
        ...calendarBookingTemplate,
        isEnabled: true,
    } as Template,
    "event-registration": {
        ...eventRegistrationTemplate,
        isEnabled: true,
    } as Template,
    "meeting-scheduler": {
        ...meetingSchedulerTemplate,
        isEnabled: true,
    } as Template,
    "office-booking": {
        ...officeBookingTemplate,
        isEnabled: true,
    } as Template,
    "reservation-system": {
        ...reservationSystemTemplate,
        isEnabled: true,
    } as Template,
    // Finance & Analytics
    "accounting-dashboard": {
        ...accountingDashboardTemplate,
        isEnabled: true,
    } as Template,
    "analytics-dashboard": {
        ...analyticsDashboardTemplate,
        isEnabled: true,
    } as Template,
    "trading": {
        ...tradingTemplate,
        isEnabled: true,
    } as Template,
    // Marketing & Content
    "seo-content": {
        ...seoContentTemplate,
        isEnabled: true,
    } as Template,
    "copywriting": {
        ...copywritingTemplate,
        isEnabled: true,
    } as Template,
    "visual-ads": {
        ...visualAdsTemplate,
        isEnabled: true,
    } as Template,
}

/**
 * Get template by ID
 */
export function getTemplateById(id: string): Template | null {
    return templates[id] || null
}

/**
 * Get all available templates
 */
export function getAllTemplates(): Template[] {
    return Object.values(templates)
}

/**
 * Get enabled templates only
 */
export function getEnabledTemplates(): Template[] {
    return Object.values(templates).filter((t) => t.isEnabled)
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(
    category: Template["category"]
): Template[] {
    return Object.values(templates).filter((t) => t.category === category)
}
