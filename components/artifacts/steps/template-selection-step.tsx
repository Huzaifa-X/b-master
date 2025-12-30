"use client"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { TEMPLATES, CATEGORIES, ICON_MAP, TEMPLATE_FILES } from "./constants"
import type { Template, Category } from "@/types/artifacts"

interface TemplateSelectionStepProps {
  selectedTemplate: Template | null
  onTemplateSelect: (template: Template) => void
  templateHtml: string
  setTemplateHtml: (html: string) => void
}

export function TemplateSelectionStep({
  selectedTemplate,
  onTemplateSelect,
  templateHtml,
  setTemplateHtml,
}: TemplateSelectionStepProps) {
  const [selectedCategory, setSelectedCategory] = useState<Category>("accounting")

  // Get templates for selected category
  const categoryTemplates = TEMPLATES.filter((t) => t.category === selectedCategory)

  // Get template count for each category
  const getTemplateCount = (category: Category) => {
    return TEMPLATES.filter((t) => t.category === category).length
  }

  // Load template HTML when template changes
  useEffect(() => {
    const loadTemplate = async () => {
      if (selectedTemplate && !selectedTemplate.isCustom) {
        const templateFile = TEMPLATE_FILES[selectedTemplate.id]

        if (templateFile) {
          try {
            console.log("Loading template:", templateFile)
            const response = await fetch(templateFile)
            if (response.ok) {
              let htmlContent = await response.text()
              console.log("Template loaded successfully:", templateFile)
              htmlContent = htmlContent.replace(
                '<title>',
                `<title>${selectedTemplate.name} Preview - `
              )
              setTemplateHtml(htmlContent)
            } else {
              console.error("Failed to load template:", templateFile, "Status:", response.status)
              setTemplateHtml(getDummyHTML())
            }
          } catch (error) {
            console.error("Error loading template:", error)
            setTemplateHtml(getDummyHTML())
          }
        } else {
          console.warn("No template file found for:", selectedTemplate.id)
          setTemplateHtml(getDummyHTML())
        }
      } else {
        setTemplateHtml("")
      }
    }

    loadTemplate()
  }, [selectedTemplate])

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

  const handleTemplateSelect = (template: Template) => {
    onTemplateSelect(template)
  }

  return (
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
                        onTemplateSelect(null as any)
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
                const isSelected = selectedTemplate?.id === template.id
                return (
                  <button
                    key={template.id}
                    onClick={() => handleTemplateSelect(template)}
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

      {/* Right Side - HTML Preview (shows only for non-custom templates) */}
      {selectedTemplate && !selectedTemplate.isCustom && (
        <div className="flex-1 lg:w-1/2 border-l pl-6 hidden lg:flex">
          <div className="h-full flex flex-col w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Live Preview</h3>
              <Badge variant="outline" className="text-xs">
                {selectedTemplate.name}
              </Badge>
            </div>
            <div className="flex-1 border-2 rounded-lg overflow-hidden bg-white dark:bg-neutral-950 shadow-inner">
              {templateHtml ? (
                <iframe
                  srcDoc={templateHtml}
                  className="w-full h-full border-0"
                  title="Artifact Preview"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-sm text-muted-foreground">Loading preview...</p>
                  </div>
                </div>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              ✨ Preview of how your <span className="font-medium">{selectedTemplate.name}</span> will look
            </p>
          </div>
        </div>
      )}

      {/* Right Side - Custom Template Info (shows only for custom templates) */}
      {selectedTemplate && selectedTemplate.isCustom && (
        <div className="flex-1 lg:w-1/2 border-l pl-6 hidden lg:flex">
          <div className="h-full flex flex-col w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Custom Template</h3>
              <Badge variant="outline" className="text-xs">
                Start from Scratch
              </Badge>
            </div>
            <div className="flex-1 border-2 border-dashed border-purple-300 dark:border-purple-700 rounded-lg bg-purple-50 dark:bg-purple-950/30 flex items-center justify-center">
              <div className="text-center p-8">
                <div className="text-6xl mb-4">🎨</div>
                <h4 className="text-lg font-semibold text-purple-700 dark:text-purple-300 mb-2">
                  Build from Scratch
                </h4>
                <p className="text-sm text-purple-600 dark:text-purple-400">
                  Create a completely custom artifact with your own design and functionality
                </p>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              🚀 Ready to proceed to customization
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

