"use client"

import { useState, use } from "react"
import { useRouter } from "next/navigation"
import { mockPrompts, AIPrompt } from "../data"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { Save, Play, ArrowLeft, RefreshCw, Send, Bot, User } from "lucide-react"

interface PageProps {
  params: Promise<{ id: string }>
}

export default function PromptDetailPage({ params }: PageProps) {
  const resolvedParams = use(params)
  const router = useRouter()
  const { toast } = useToast()
  
  const isNew = resolvedParams.id === "new"
  const existingPrompt = mockPrompts.find(p => p.id === resolvedParams.id)
  
  const [formData, setFormData] = useState<Partial<AIPrompt>>(
    existingPrompt || {
      name: "",
      description: "",
      systemPrompt: "You are a helpful AI assistant.",
    }
  )

  // Playground state
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant', content: string }[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleSave = () => {
    toast({
      title: "Success",
      description: isNew ? "Prompt created successfully" : "Prompt updated successfully",
    })
    router.push("/dashboard/prompts")
  }

  const handleTest = async () => {
    if (!input.trim()) return

    const userMessage = input
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])
    setInput("")
    setIsLoading(true)

    // Simulate AI response
    setTimeout(() => {
      setMessages(prev => [
        ...prev,
        { 
          role: 'assistant', 
          content: `[Simulated Response based on System Prompt]:\n${userMessage.split(' ').reverse().join(' ')} (This is a mock response)` 
        }
      ])
      setIsLoading(false)
    }, 1000)
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-none">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {isNew ? "Create Prompt" : "Edit Prompt"}
            </h1>
            <p className="text-muted-foreground">
              {isNew ? "Create a new system prompt" : "Refine and test your system prompt"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
           <Button onClick={handleSave}>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </Button>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-full min-h-0">
        
        {/* Left Column: Configuration */}
        <div className="flex flex-col gap-4 h-full min-h-0">
          <Card className="flex-none">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input 
                  id="name" 
                  value={formData.name} 
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="e.g. Customer Support Agent"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input 
                  id="description" 
                  value={formData.description} 
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  placeholder="Briefly describe what this prompt does"
                />
              </div>
            </CardContent>
          </Card>

          <Card className="flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">System Prompt</CardTitle>
              <CardDescription>Define the behavior and persona of the AI</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 p-0 relative">
              <Textarea 
                className="absolute inset-0 h-full w-full border-0 focus-visible:ring-0 resize-none p-6 font-mono text-sm leading-relaxed rounded-b-xl"
                value={formData.systemPrompt}
                onChange={(e) => setFormData({...formData, systemPrompt: e.target.value})}
                placeholder="You are a helpful assistant..."
              />
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Playground */}
        <Card className="flex flex-col h-full min-h-0 border-2 border-primary/10 overflow-hidden">
          <CardHeader className="bg-muted/30 pb-4 border-b">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Play className="h-4 w-4 text-primary" />
                Playground
              </CardTitle>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setMessages([])}
                className="text-muted-foreground hover:text-foreground h-8"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Clear
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="flex-1 flex flex-col p-0 min-h-0 bg-muted/10">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground opacity-50 space-y-2">
                  <Bot className="h-12 w-12" />
                  <p>Send a message to test your prompt</p>
                </div>
              )}
              
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-4 py-2 ${
                      msg.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted'
                    }`}
                  >
                    <p className="text-sm">{msg.content}</p>
                  </div>
                </div>
              ))}
              
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted rounded-lg px-4 py-2">
                     <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-foreground/30 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 border-t bg-background">
              <div className="flex gap-2">
                <Input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleTest()}
                  placeholder="Type a message..."
                  className="flex-1"
                />
                <Button onClick={handleTest} disabled={!input.trim() || isLoading}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      </div>
    </div>
  )
}
