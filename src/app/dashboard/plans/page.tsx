"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Plus, Edit, Trash2, Check, Users } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/utils"

interface SubscriptionPlan {
  id: string
  name: string
  price: number
  billingCycle: "monthly" | "yearly"
  features: string[]
  limits: {
    messagesPerMonth: number
    tokensPerMonth: number
    storage: number
  }
  isActive: boolean
  stripePriceId?: string
  userCount: number
}

// Mock Data
const mockPlans: SubscriptionPlan[] = [
  {
    id: "1",
    name: "Free",
    price: 0,
    billingCycle: "monthly",
    features: [
      "100 AI messages/month",
      "Basic support",
      "Access to GPT-3.5",
      "Community access",
    ],
    limits: {
      messagesPerMonth: 100,
      tokensPerMonth: 50000,
      storage: 100,
    },
    isActive: true,
    userCount: 1250,
  },
  {
    id: "2",
    name: "Basic",
    price: 9.99,
    billingCycle: "monthly",
    features: [
      "1,000 AI messages/month",
      "Email support",
      "Access to GPT-4",
      "Priority processing",
      "Basic analytics",
    ],
    limits: {
      messagesPerMonth: 1000,
      tokensPerMonth: 500000,
      storage: 1000,
    },
    isActive: true,
    stripePriceId: "price_basic_monthly",
    userCount: 499,
  },
  {
    id: "3",
    name: "Pro",
    price: 29.99,
    billingCycle: "monthly",
    features: [
      "10,000 AI messages/month",
      "Priority support",
      "Access to all AI models",
      "Advanced analytics",
      "Custom prompts",
      "API access",
      "Team collaboration",
    ],
    limits: {
      messagesPerMonth: 10000,
      tokensPerMonth: 5000000,
      storage: 10000,
    },
    isActive: true,
    stripePriceId: "price_pro_monthly",
    userCount: 199,
  },
  {
    id: "4",
    name: "Enterprise",
    price: 99.99,
    billingCycle: "monthly",
    features: [
      "Unlimited AI messages",
      "Dedicated support",
      "All AI models",
      "Custom integrations",
      "SLA guarantee",
      "White-label options",
      "Advanced security",
      "Custom training",
    ],
    limits: {
      messagesPerMonth: -1,
      tokensPerMonth: -1,
      storage: -1,
    },
    isActive: true,
    stripePriceId: "price_enterprise_monthly",
    userCount: 50,
  },
]

export default function PlansPage() {
  const [plans, setPlans] = useState<SubscriptionPlan[]>(mockPlans)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [editingPlan, setEditingPlan] = useState<SubscriptionPlan | null>(null)
  const [viewMode, setViewMode] = useState<"cards" | "table">("cards")
  const { toast } = useToast()

  const handleEdit = (plan: SubscriptionPlan) => {
    setEditingPlan(plan)
    setIsCreateOpen(true)
  }

  const handleDelete = (id: string) => {
    setPlans(plans.filter((p) => p.id !== id))
    toast({
      title: "Plan Deleted",
      description: "The subscription plan has been deleted.",
      variant: "destructive",
    })
  }

  const handleToggleActive = (id: string) => {
    setPlans(
      plans.map((p) =>
        p.id === id ? { ...p, isActive: !p.isActive } : p
      )
    )
    toast({
      title: "Plan Updated",
      description: "Plan status has been updated.",
    })
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Plan Management</h1>
          <p className="text-muted-foreground">
            Manage subscription plans and pricing tiers
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "cards" | "table")}>
            <TabsList>
              <TabsTrigger value="cards">Cards</TabsTrigger>
              <TabsTrigger value="table">Table</TabsTrigger>
            </TabsList>
          </Tabs>
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => setEditingPlan(null)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Plan
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <PlanForm
                plan={editingPlan}
                onSave={(plan) => {
                  if (editingPlan) {
                    setPlans(plans.map((p) => (p.id === plan.id ? plan : p)))
                    toast({ title: "Plan Updated", description: "Changes saved successfully." })
                  } else {
                    setPlans([...plans, { ...plan, id: Math.random().toString(), userCount: 0 }])
                    toast({ title: "Plan Created", description: "New plan created successfully." })
                  }
                  setIsCreateOpen(false)
                  setEditingPlan(null)
                }}
                onCancel={() => {
                  setIsCreateOpen(false)
                  setEditingPlan(null)
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Plan Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Plans</CardDescription>
            <CardTitle className="text-2xl">{plans.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Plans</CardDescription>
            <CardTitle className="text-2xl">
              {plans.filter((p) => p.isActive).length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Subscribers</CardDescription>
            <CardTitle className="text-2xl">
              {plans.reduce((sum, p) => sum + p.userCount, 0)}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Monthly Revenue</CardDescription>
            <CardTitle className="text-2xl">
              {formatCurrency(
                plans.reduce((sum, p) => sum + p.price * p.userCount, 0)
              )}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Plans Display */}
      {viewMode === "cards" ? (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <Card key={plan.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>{plan.name}</CardTitle>
                  <Badge variant={plan.isActive ? "default" : "secondary"}>
                    {plan.isActive ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <CardDescription>
                  <div className="mt-4">
                    <span className="text-3xl font-bold">
                      {formatCurrency(plan.price)}
                    </span>
                    <span className="text-muted-foreground">/{plan.billingCycle}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span>{plan.userCount} subscribers</span>
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleEdit(plan)}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleToggleActive(plan.id)}
                >
                  <Switch checked={plan.isActive} />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleDelete(plan.id)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="pb-3 text-left font-medium">Plan</th>
                    <th className="pb-3 text-left font-medium">Price</th>
                    <th className="pb-3 text-left font-medium">Billing</th>
                    <th className="pb-3 text-left font-medium">Users</th>
                    <th className="pb-3 text-left font-medium">Status</th>
                    <th className="pb-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {plans.map((plan) => (
                    <tr key={plan.id} className="border-b last:border-0">
                      <td className="py-4">
                        <div className="font-medium">{plan.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {plan.features.length} features
                        </div>
                      </td>
                      <td className="py-4">{formatCurrency(plan.price)}</td>
                      <td className="py-4">{plan.billingCycle}</td>
                      <td className="py-4">{plan.userCount}</td>
                      <td className="py-4">
                        <Badge variant={plan.isActive ? "default" : "secondary"}>
                          {plan.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(plan)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(plan.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

interface PlanFormProps {
  plan: SubscriptionPlan | null
  onSave: (plan: SubscriptionPlan) => void
  onCancel: () => void
}

function PlanForm({ plan, onSave, onCancel }: PlanFormProps) {
  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>(
    plan || {
      name: "",
      price: 0,
      billingCycle: "monthly",
      features: [],
      limits: {
        messagesPerMonth: 100,
        tokensPerMonth: 50000,
        storage: 100,
      },
      isActive: true,
    }
  )
  const [newFeature, setNewFeature] = useState("")

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...(formData.features || []), newFeature.trim()],
      })
      setNewFeature("")
    }
  }

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features?.filter((_, i) => i !== index),
    })
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>{plan ? "Edit Plan" : "Create New Plan"}</DialogTitle>
        <DialogDescription>
          Configure subscription plan details and pricing
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Plan Name</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Pro"
            />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="price">Price</Label>
            <Input
              id="price"
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
            />
          </div>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="billingCycle">Billing Cycle</Label>
          <Select
            value={formData.billingCycle}
            onValueChange={(value) =>
              setFormData({ ...formData, billingCycle: value as "monthly" | "yearly" })
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="yearly">Yearly</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2">
          <Label>Features</Label>
          <div className="flex gap-2">
            <Input
              value={newFeature}
              onChange={(e) => setNewFeature(e.target.value)}
              placeholder="Add a feature"
              onKeyPress={(e) => e.key === "Enter" && addFeature()}
            />
            <Button type="button" onClick={addFeature}>
              Add
            </Button>
          </div>
          <ul className="space-y-2">
            {formData.features?.map((feature, index) => (
              <li key={index} className="flex items-center justify-between rounded-md border p-2">
                <span className="text-sm">{feature}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFeature(index)}
                >
                  Remove
                </Button>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid gap-2">
          <Label>Limits</Label>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <Label htmlFor="messages" className="text-xs">
                Messages/Month
              </Label>
              <Input
                id="messages"
                type="number"
                value={formData.limits?.messagesPerMonth}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    limits: {
                      ...formData.limits!,
                      messagesPerMonth: parseInt(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="tokens" className="text-xs">
                Tokens/Month
              </Label>
              <Input
                id="tokens"
                type="number"
                value={formData.limits?.tokensPerMonth}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    limits: {
                      ...formData.limits!,
                      tokensPerMonth: parseInt(e.target.value),
                    },
                  })
                }
              />
            </div>
            <div>
              <Label htmlFor="storage" className="text-xs">
                Storage (MB)
              </Label>
              <Input
                id="storage"
                type="number"
                value={formData.limits?.storage}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    limits: {
                      ...formData.limits!,
                      storage: parseInt(e.target.value),
                    },
                  })
                }
              />
            </div>
          </div>
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
        <Button onClick={() => onSave(formData as SubscriptionPlan)}>
          {plan ? "Save Changes" : "Create Plan"}
        </Button>
      </DialogFooter>
    </>
  )
}
