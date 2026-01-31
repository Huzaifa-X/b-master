# Component Architecture

## 📦 Component Hierarchy

```
app/
├── layout.tsx (Root Layout)
│   ├── ThemeProvider
│   └── Toaster
│
├── page.tsx (Landing Page)
│
└── dashboard/
    ├── layout.tsx (Dashboard Layout)
    │   ├── Sidebar
    │   └── Header
    │
    └── [pages]/ (All dashboard pages)
```

## 🧩 Reusable Components

### 1. StatsCard Component
**Location:** `src/components/dashboard/stats-card.tsx`

**Props:**
```typescript
interface StatsCardProps {
  title: string
  value: string | number
  description?: string
  icon: LucideIcon
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
}
```

**Usage:**
```tsx
<StatsCard
  title="Total Users"
  value={formatNumber(2150)}
  icon={Users}
  trend={{ value: 12.5, isPositive: true }}
  description="from last month"
/>
```

**Features:**
- Icon display
- Trend indicator with color coding
- Optional description
- Responsive sizing

### 2. DataTable Component
**Location:** `src/components/dashboard/data-table.tsx`

**Props:**
```typescript
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  searchKey?: string
  searchPlaceholder?: string
}
```

**Usage:**
```tsx
<DataTable
  columns={columns}
  data={users}
  searchKey="name"
  searchPlaceholder="Search users..."
/>
```

**Features:**
- Built on TanStack Table
- Search/filter functionality
- Pagination with customizable rows per page
- Column sorting
- Row selection
- Responsive design

### 3. Sidebar Component
**Location:** `src/components/dashboard/sidebar.tsx`

**Features:**
- Collapsible (toggle button)
- Active route highlighting
- Icon + label navigation
- User profile section
- Responsive (hidden on mobile, toggleable)

**Navigation Items:**
- Dashboard
- Prompts
- Users
- Analytics
- Messages
- Banners
- Plans
- Settings

### 4. Header Component
**Location:** `src/components/dashboard/header.tsx`

**Features:**
- Search bar
- Theme toggle (light/dark)
- Notifications dropdown with badge
- User menu dropdown
- Sticky positioning

## 🎨 shadcn/ui Components Used

### Form Components
- **Button** - Primary, secondary, outline, ghost variants
- **Input** - Text, email, password, number, date types
- **Label** - Form labels
- **Textarea** - Multi-line text input
- **Select** - Dropdown selection
- **Switch** - Toggle switches
- **Slider** - Range input (temperature control)

### Display Components
- **Card** - Content containers with header, content, footer
- **Badge** - Status indicators, labels, counts
- **Avatar** - User profile pictures with fallback
- **Skeleton** - Loading placeholders
- **Tabs** - Tabbed content sections

### Overlay Components
- **Dialog** - Modal dialogs for forms and details
- **DropdownMenu** - Action menus and user menus
- **Toast** - Notification system

### Data Display
- **Table** - Structured data display
- **Separator** - Visual dividers

## 📊 Chart Components (Recharts)

### Used Chart Types
- **LineChart** - Trends over time
- **AreaChart** - Filled area trends
- **BarChart** - Comparisons (vertical & horizontal)
- **PieChart** - Distribution percentages

### Common Configuration
```tsx
<ResponsiveContainer width="100%" height={300}>
  <ChartType data={data}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="key" />
    <YAxis />
    <Tooltip />
    <Legend />
    {/* Chart-specific elements */}
  </ChartType>
</ResponsiveContainer>
```

## 🔧 Utility Functions

**Location:** `src/lib/utils.ts`

```typescript
// Tailwind class merging
cn(...inputs: ClassValue[]): string

// Currency formatting
formatCurrency(amount: number): string
// Returns: "$1,234.56"

// Number formatting
formatNumber(num: number): string
// Returns: "1,234"

// Date formatting
formatDate(date: Date | string): string
// Returns: "Jan 22, 2026"

formatDateTime(date: Date | string): string
// Returns: "Jan 22, 2026, 10:30 AM"

// Percentage calculation
calculatePercentageChange(current: number, previous: number): number
```

## 🎯 Form Patterns

### Dialog Form Pattern
```tsx
<Dialog open={isOpen} onOpenChange={setIsOpen}>
  <DialogTrigger asChild>
    <Button>Create</Button>
  </DialogTrigger>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle>Title</DialogTitle>
      <DialogDescription>Description</DialogDescription>
    </DialogHeader>
    <div className="grid gap-4 py-4">
      {/* Form fields */}
    </div>
    <DialogFooter>
      <Button variant="outline" onClick={onCancel}>Cancel</Button>
      <Button onClick={onSave}>Save</Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

### Data Table with Actions Pattern
```tsx
const columns: ColumnDef<Type>[] = [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <div>{row.getValue("name")}</div>
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const item = row.original
      return (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleEdit(item)}>
            <Edit className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      )
    }
  }
]
```

## 🎨 Styling Conventions

### Card Layout
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    {/* Actions */}
  </CardFooter>
</Card>
```

### Grid Layouts
```tsx
// Stats cards
<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">

// Charts
<div className="grid gap-4 md:grid-cols-2">

// Content sections
<div className="space-y-6">
```

### Badge Variants
```tsx
<Badge variant="default">Active</Badge>
<Badge variant="secondary">Inactive</Badge>
<Badge variant="destructive">Suspended</Badge>
<Badge variant="outline">Free</Badge>
```

## 🔄 State Management Pattern

### Page-Level State
```tsx
const [data, setData] = useState<Type[]>(mockData)
const [isDialogOpen, setIsDialogOpen] = useState(false)
const [editingItem, setEditingItem] = useState<Type | null>(null)
const [filters, setFilters] = useState({ status: "all", plan: "all" })
const { toast } = useToast()
```

### CRUD Operations
```tsx
// Create
const handleCreate = (item: Type) => {
  setData([...data, { ...item, id: generateId() }])
  toast({ title: "Created", description: "Item created successfully" })
  setIsDialogOpen(false)
}

// Update
const handleUpdate = (item: Type) => {
  setData(data.map(d => d.id === item.id ? item : d))
  toast({ title: "Updated", description: "Changes saved" })
}

// Delete
const handleDelete = (id: string) => {
  setData(data.filter(d => d.id !== id))
  toast({ title: "Deleted", description: "Item deleted", variant: "destructive" })
}
```

## 📱 Responsive Breakpoints

```css
/* Tailwind Breakpoints */
sm: 640px   /* Small devices */
md: 768px   /* Tablets */
lg: 1024px  /* Laptops */
xl: 1280px  /* Desktops */
2xl: 1536px /* Large screens */

/* Usage */
className="grid gap-4 md:grid-cols-2 lg:grid-cols-4"
```

## 🎭 Animation Classes

```tsx
// Transitions
className="transition-colors hover:bg-accent"
className="transition-all duration-300"

// Hover effects
className="hover:shadow-md"
className="hover:scale-105"

// Dark mode
className="rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
```

## 🔐 Type Safety

All components are fully typed with TypeScript interfaces:
- Props interfaces for all custom components
- Type-safe form data
- Strongly typed table columns
- Enum types for status, roles, etc.

---

**This architecture ensures maintainability, reusability, and scalability for future development.**
