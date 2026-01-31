export interface User {
  id: string
  email: string
  name: string
  role: "USER" | "ADMIN" | "SUPER_ADMIN"
  plan: string
  status: "ACTIVE" | "SUSPENDED" | "INACTIVE"
  avatar?: string
  createdAt: string
  lastLogin: string
  totalUsage: number
}

// Mock Data
export const mockUsers: User[] = [
  {
    id: "1",
    email: "john.doe@example.com",
    name: "John Doe",
    role: "USER",
    plan: "Pro",
    status: "ACTIVE",
    createdAt: "2026-01-10",
    lastLogin: "2026-01-22",
    totalUsage: 15420,
  },
  {
    id: "2",
    email: "sarah.smith@example.com",
    name: "Sarah Smith",
    role: "USER",
    plan: "Enterprise",
    status: "ACTIVE",
    createdAt: "2025-12-05",
    lastLogin: "2026-01-21",
    totalUsage: 45200,
  },
  {
    id: "3",
    email: "mike.johnson@example.com",
    name: "Mike Johnson",
    role: "ADMIN",
    plan: "Pro",
    status: "ACTIVE",
    createdAt: "2025-11-15",
    lastLogin: "2026-01-22",
    totalUsage: 28900,
  },
  {
    id: "4",
    email: "lisa.anderson@example.com",
    name: "Lisa Anderson",
    role: "USER",
    plan: "Basic",
    status: "ACTIVE",
    createdAt: "2026-01-18",
    lastLogin: "2026-01-20",
    totalUsage: 3200,
  },
  {
    id: "5",
    email: "david.brown@example.com",
    name: "David Brown",
    role: "USER",
    plan: "Free",
    status: "SUSPENDED",
    createdAt: "2025-10-20",
    lastLogin: "2026-01-15",
    totalUsage: 8500,
  },
]
