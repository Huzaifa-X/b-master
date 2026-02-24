/**
 * Template Registry
 * Central location for all B-Coder templates
 */

import { defaultTodoTemplate } from "./default-todo"
import { bookingSystemTemplate } from "./booking-system"
import { accountingDashboardTemplate } from "./accounting-dashboard"
import { analyticsDashboardTemplate } from "./analytics-dashboard"

export interface Template {
    id: string
    name: string
    description: string
    category: "default" | "booking" | "accounting" | "analytics"
    files: Record<string, string>
    isEnabled: boolean
}

// Template registry
const templates: Record<string, Template> = {
    "default-todo": {
        ...defaultTodoTemplate,
        isEnabled: true,
    } as Template,
    "booking-system": {
        ...bookingSystemTemplate,
        isEnabled: true,
    } as Template,
    "accounting-dashboard": {
        ...accountingDashboardTemplate,
        isEnabled: true,
    } as Template,
    "analytics-dashboard": {
        ...analyticsDashboardTemplate,
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
