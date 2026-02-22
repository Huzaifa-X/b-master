/**
 * Template Registry
 * Central location for all B-Coder templates
 */

import { defaultTodoTemplate } from "./default-todo"

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
    // Future templates (disabled for now)
    "booking-system": {
        id: "booking-system",
        name: "Booking System",
        description: "Complete booking management system",
        category: "booking",
        files: {},
        isEnabled: false,
    },
    "accounting-dashboard": {
        id: "accounting-dashboard",
        name: "Accounting Dashboard",
        description: "Financial tracking and reporting dashboard",
        category: "accounting",
        files: {},
        isEnabled: false,
    },
    "analytics-dashboard": {
        id: "analytics-dashboard",
        name: "Analytics Dashboard",
        description: "Data visualization and analytics platform",
        category: "analytics",
        files: {},
        isEnabled: false,
    },
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
