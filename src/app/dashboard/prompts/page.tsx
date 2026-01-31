"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { DataTable } from "@/components/dashboard/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Plus, Edit, Copy, Trash2, TestTube, Search } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { useToast } from "@/hooks/use-toast"
import { mockPrompts, AIPrompt } from "./data"
import { Input } from "@/components/ui/input"

export default function PromptsPage() {
  const router = useRouter()
  const [prompts, setPrompts] = useState<AIPrompt[]>(mockPrompts)
  const [searchQuery, setSearchQuery] = useState("")
  const { toast } = useToast()

  const filteredPrompts = prompts.filter(prompt => 
    prompt.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    prompt.description.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const columns: ColumnDef<AIPrompt>[] = [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => (
        <div 
          className="cursor-pointer hover:underline"
          onClick={() => router.push(`/dashboard/prompts/${row.original.id}`)}
        >
          <div className="font-medium text-base">{row.getValue("name")}</div>
          <div className="text-sm text-muted-foreground">{row.original.description}</div>
        </div>
      ),
    },
    {
      accessorKey: "isActive",
      header: "Status",
      cell: ({ row }) => (
        <Badge variant={row.getValue("isActive") ? "default" : "secondary"}>
          {row.getValue("isActive") ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      accessorKey: "updatedAt",
      header: "Last Updated",
      cell: ({ row }) => new Date(row.getValue("updatedAt")).toLocaleDateString(),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        const prompt = row.original
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="hidden md:flex"
              onClick={() => router.push(`/dashboard/prompts/${prompt.id}`)}
            >
              <TestTube className="h-3.5 w-3.5 mr-2" />
              Test
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.push(`/dashboard/prompts/${prompt.id}`)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDuplicate(prompt)}
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(prompt.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )
      },
    },
  ]

  const handleDuplicate = (prompt: AIPrompt) => {
    toast({
      title: "Duplicate Prompt",
      description: `Duplicated "${prompt.name}"`,
    })
  }

  const handleDelete = (id: string) => {
    setPrompts(prompts.filter((p) => p.id !== id))
    toast({
      title: "Prompt Deleted",
      description: "The prompt has been permanently deleted.",
      variant: "destructive",
    })
  }

  return (
    <div className="space-y-6 h-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Prompt Management</h1>
          <p className="text-muted-foreground">
            Create, test, and manage your system prompts
          </p>
        </div>
        <Button onClick={() => router.push("/dashboard/prompts/new")}>
          <Plus className="mr-2 h-4 w-4" /> New Prompt
        </Button>
      </div>

      <div className="flex items-center space-x-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search prompts..." 
            className="pl-8" 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="border rounded-md">
        <DataTable columns={columns} data={filteredPrompts} />
      </div>
    </div>
  )
}
