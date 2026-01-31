"use client"

import { useState } from "react"
import { DataTable } from "@/components/dashboard/data-table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Plus, Edit, Trash2, Eye } from "lucide-react"
import { ColumnDef } from "@tanstack/react-table"
import { useToast } from "@/hooks/use-toast"
import { formatDate } from "@/lib/utils"
import Image from "next/image"

interface MarketingBanner {
  id: string
  title: string
  imageUrl: string
  linkUrl: string
  position: "hero" | "sidebar" | "popup" | "inline"
  startDate: string
  endDate: string
  isActive: boolean
  priority: number
  targetAudience: "all" | "free" | "pro" | "enterprise"
}

// Mock Data
const mockBanners: MarketingBanner[] = [
  {
    id: "1",
    title: "Summer Sale - 50% Off",
    imageUrl: "/banners/summer-sale.jpg",
    linkUrl: "https://example.com/summer-sale",
    position: "hero",
    startDate: "2026-01-15",
    endDate: "2026-02-15",
    isActive: true,
    priority: 1,
    targetAudience: "all",
  },
  {
    id: "2",
    title: "New Feature Launch",
    imageUrl: "/banners/new-feature.jpg",
    linkUrl: "https://example.com/features",
    position: "sidebar",
    startDate: "2026-01-10",
    endDate: "2026-01-31",
    isActive: true,
    priority: 2,
    targetAudience: "pro",
  },
  {
    id: "3",
    title: "Upgrade to Pro",
    imageUrl: "/banners/upgrade.jpg",
    linkUrl: "https://example.com/pricing",
    position: "popup",
    startDate: "2026-01-01",
    endDate: "2026-03-01",
    isActive: true,
    priority: 3,
    targetAudience: "free",
  },
  {
    id: "4",
    title: "Webinar Announcement",
    imageUrl: "/banners/webinar.jpg",
    linkUrl: "https://example.com/webinar",
    position: "inline",
    startDate: "2026-01-20",
    endDate: "2026-01-25",
    isActive: false,
    priority: 4,
    targetAudience: "all",
  },
]

export default function BannersPage() {
  const [banners, setBanners] = useState<MarketingBanner[]>(mockBanners)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingBanner, setEditingBanner] = useState<MarketingBanner | null>(null)
  const { toast } = useToast()

  const getPositionColor = (position: MarketingBanner["position"]) => {
    const colors = {
      hero: "bg-blue-100 text-blue-800",
      sidebar: "bg-green-100 text-green-800",
      popup: "bg-purple-100 text-purple-800",
      inline: "bg-orange-100 text-orange-800",
    }
    return colors[position]
  }

  const columns: ColumnDef<MarketingBanner>[] = [
    {
      accessorKey: "title",
      header: "Banner",
      cell: ({ row }) => (
        <div className="flex items-center gap-3">
          <div className="h-16 w-24 overflow-hidden rounded-md border bg-muted">
            <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
              Preview
            </div>
          </div>
          <div>
            <div className="font-medium">{row.getValue("title")}</div>
            <div className="text-sm text-muted-foreground">{row.original.linkUrl}</div>
          </div>
        </div>
      ),
    },
    {
      accessorKey: "position",
      header: "Position",
      cell: ({ row }) => {
        const position = row.getValue("position") as MarketingBanner["position"]
        return (
          <Badge className={getPositionColor(position)} variant="outline">
            {position}
          </Badge>
        )
      },
    },
    {
      accessorKey: "targetAudience",
      header: "Audience",
      cell: ({ row }) => (
        <Badge variant="outline">{row.getValue("targetAudience")}</Badge>
      ),
    },
    {
      accessorKey: "priority",
      header: "Priority",
    },
    {
      accessorKey: "startDate",
      header: "Start Date",
      cell: ({ row }) => formatDate(row.getValue("startDate")),
    },
    {
      accessorKey: "endDate",
      header: "End Date",
      cell: ({ row }) => formatDate(row.getValue("endDate")),
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
      id: "actions",
      cell: ({ row }) => {
        const banner = row.original
        return (
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon">
              <Eye className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleEdit(banner)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => handleDelete(banner.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        )
      },
    },
  ]

  const handleEdit = (banner: MarketingBanner) => {
    setEditingBanner(banner)
    setIsCreateOpen(true)
  }

  const handleDelete = (id: string) => {
    setBanners(banners.filter((b) => b.id !== id))
    toast({
      title: "Banner Deleted",
      description: "The banner has been deleted successfully.",
      variant: "destructive",
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Banner Management</h1>
          <p className="text-muted-foreground">
            Create and manage marketing banners across your platform
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => setEditingBanner(null)}>
              <Plus className="mr-2 h-4 w-4" />
              Create Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <BannerForm
              banner={editingBanner}
              onSave={(banner) => {
                if (editingBanner) {
                  setBanners(banners.map((b) => (b.id === banner.id ? banner : b)))
                  toast({ title: "Banner Updated", description: "Changes saved successfully." })
                } else {
                  setBanners([...banners, { ...banner, id: Math.random().toString() }])
                  toast({ title: "Banner Created", description: "New banner created successfully." })
                }
                setIsCreateOpen(false)
                setEditingBanner(null)
              }}
              onCancel={() => {
                setIsCreateOpen(false)
                setEditingBanner(null)
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Banners Preview */}
      <div className="grid gap-4 md:grid-cols-3">
        {banners
          .filter((b) => b.isActive)
          .slice(0, 3)
          .map((banner) => (
            <Card key={banner.id}>
              <CardContent className="p-4">
                <div className="aspect-video overflow-hidden rounded-md bg-muted">
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    {banner.title}
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <Badge className={getPositionColor(banner.position)} variant="outline">
                    {banner.position}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    Priority {banner.priority}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
      </div>

      {/* Data Table */}
      <DataTable
        columns={columns}
        data={banners}
        searchKey="title"
        searchPlaceholder="Search banners..."
      />
    </div>
  )
}

interface BannerFormProps {
  banner: MarketingBanner | null
  onSave: (banner: MarketingBanner) => void
  onCancel: () => void
}

function BannerForm({ banner, onSave, onCancel }: BannerFormProps) {
  const [formData, setFormData] = useState<Partial<MarketingBanner>>(
    banner || {
      title: "",
      imageUrl: "",
      linkUrl: "",
      position: "hero",
      startDate: new Date().toISOString().split("T")[0],
      endDate: "",
      isActive: true,
      priority: 1,
      targetAudience: "all",
    }
  )

  return (
    <>
      <DialogHeader>
        <DialogTitle>{banner ? "Edit Banner" : "Create New Banner"}</DialogTitle>
        <DialogDescription>
          Configure your marketing banner settings and scheduling
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            placeholder="e.g., Summer Sale"
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="imageUrl">Image URL</Label>
          <Input
            id="imageUrl"
            value={formData.imageUrl}
            onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="linkUrl">Link URL</Label>
          <Input
            id="linkUrl"
            value={formData.linkUrl}
            onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
            placeholder="https://..."
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="position">Position</Label>
            <Select
              value={formData.position}
              onValueChange={(value) =>
                setFormData({ ...formData, position: value as MarketingBanner["position"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hero">Hero</SelectItem>
                <SelectItem value="sidebar">Sidebar</SelectItem>
                <SelectItem value="popup">Popup</SelectItem>
                <SelectItem value="inline">Inline</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="targetAudience">Target Audience</Label>
            <Select
              value={formData.targetAudience}
              onValueChange={(value) =>
                setFormData({ ...formData, targetAudience: value as MarketingBanner["targetAudience"] })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Users</SelectItem>
                <SelectItem value="free">Free Users</SelectItem>
                <SelectItem value="pro">Pro Users</SelectItem>
                <SelectItem value="enterprise">Enterprise</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="startDate">Start Date</Label>
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="endDate">End Date</Label>
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="priority">Priority (1-10)</Label>
          <Input
            id="priority"
            type="number"
            min="1"
            max="10"
            value={formData.priority}
            onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
          />
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="isActive"
            checked={formData.isActive}
            onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
          />
          <Label htmlFor="isActive">Active</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={() => onSave(formData as MarketingBanner)}>
          {banner ? "Save Changes" : "Create Banner"}
        </Button>
      </DialogFooter>
    </>
  )
}
