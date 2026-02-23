"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import prisma from "@/lib/prisma"
import { SA_EMAIL, SA_PASSWORD, SA_COOKIE, signToken, getSuperAdminSession } from "@/lib/super-admin-auth"
import bcrypt from "bcryptjs"

// ─── Auth ────────────────────────────────────────────────────
export async function loginSuperAdmin(formData: FormData) {
  const email = formData.get("email") as string
  const password = formData.get("password") as string

  if (email !== SA_EMAIL || password !== SA_PASSWORD) {
    return { success: false, error: "Invalid credentials" }
  }

  const token = signToken({ admin: true, ts: Date.now() })
  const store = await cookies()
  store.set(SA_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 8, // 8 hours
    path: "/",
  })
  return { success: true }
}

export async function logoutSuperAdmin() {
  const store = await cookies()
  store.delete(SA_COOKIE)
  redirect("/super-admin/login")
}

async function requireAdmin() {
  const session = await getSuperAdminSession()
  if (!session) throw new Error("Unauthorized")
}

// ─── Prompts ─────────────────────────────────────────────────
export async function getPrompts() {
  await requireAdmin()
  return prisma.prompt.findMany({ orderBy: { name: "asc" } })
}

export async function createPrompt(data: { name: string; prompt: string }) {
  await requireAdmin()
  const existing = await prisma.prompt.findUnique({ where: { name: data.name } })
  if (existing) return { success: false, error: "A prompt with this name already exists" }
  await prisma.prompt.create({ data })
  revalidatePath("/super-admin/prompts")
  return { success: true }
}

export async function updatePrompt(id: number, data: { name: string; prompt: string }) {
  await requireAdmin()
  await prisma.prompt.update({ where: { id }, data })
  revalidatePath("/super-admin/prompts")
  return { success: true }
}

export async function deletePrompt(id: number) {
  await requireAdmin()
  await prisma.prompt.delete({ where: { id } })
  revalidatePath("/super-admin/prompts")
  return { success: true }
}

// ─── Users ───────────────────────────────────────────────────
export async function getUsers(page = 1, search = "", limit = 20) {
  await requireAdmin()
  const skip = (page - 1) * limit
  const where = search
    ? { OR: [{ name: { contains: search, mode: "insensitive" as const } }, { email: { contains: search, mode: "insensitive" as const } }] }
    : {}
  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      select: {
        id: true, name: true, email: true, status: true,
        createdAt: true, loginType: true, isEmailVerified: true,
        currentPlanId: true, subscriptionStatus: true,
        _count: { select: { assistants: true } },
      },
    }),
    prisma.user.count({ where }),
  ])
  return {
    users: users.map((u) => ({ ...u, id: String(u.id) })),
    total,
    pages: Math.ceil(total / limit),
  }
}

export async function updateUserInfo(userId: string, data: { name?: string; status?: string }) {
  await requireAdmin()
  await prisma.user.update({ where: { id: BigInt(userId) }, data })
  revalidatePath("/super-admin/users")
  return { success: true }
}

export async function resetUserPassword(userId: string, newPassword: string) {
  await requireAdmin()
  const hashed = await bcrypt.hash(newPassword, 12)
  await prisma.user.update({ where: { id: BigInt(userId) }, data: { password: hashed } })
  return { success: true }
}

// ─── Plans ───────────────────────────────────────────────────
export async function getPlans() {
  await requireAdmin()
  const plans = await prisma.plan.findMany({
    orderBy: { amount: "asc" },
    include: { _count: { select: { subscribers: true } } },
  })
  // Serialize Decimal → number so it can cross the server→client boundary
  return plans.map((p) => ({ ...p, amount: Number(p.amount) }))
}

export async function updatePlan(id: number, data: {
  title?: string; description?: string; amount?: number;
  assistantLimit?: number; isActive?: boolean; features?: any
}) {
  await requireAdmin()
  const { features, amount, ...rest } = data
  await prisma.plan.update({
    where: { id },
    data: {
      ...rest,
      ...(amount !== undefined ? { amount } : {}),
      ...(features !== undefined ? { features } : {}),
    },
  })
  revalidatePath("/super-admin/plans")
  return { success: true }
}

// ─── Analytics ───────────────────────────────────────────────
export async function getAnalyticsSummary() {
  await requireAdmin()
  const [totalUsers, activeUsers, totalAssistants, totalMessages, usageStats] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { status: "active" } }),
    prisma.assistant.count({ where: { isDeleted: false } }),
    prisma.assistantChatMessage.count(),
    prisma.usageMetric.aggregate({
      _sum: { totalToken: true, totalCost: true, inputToken: true, outputToken: true },
    }),
  ])

  // Last 14 days usage
  const since = new Date()
  since.setDate(since.getDate() - 14)
  const dailyUsage = await prisma.$queryRaw<{ day: Date; cost: number; tokens: number }[]>`
    SELECT DATE_TRUNC('day', "createdAt") as day,
           SUM("totalCost")::float as cost,
           SUM("totalToken")::float as tokens
    FROM usage_metrics
    WHERE "createdAt" >= ${since}
    GROUP BY day ORDER BY day ASC
  `

  // Top users by cost
  const topUsers = await prisma.usageMetric.groupBy({
    by: ["userId"],
    _sum: { totalCost: true, totalToken: true },
    _count: { _all: true },
    orderBy: { _sum: { totalCost: "desc" } },
    take: 10,
  })

  const topUserIds = topUsers.map((u) => u.userId)
  const topUserDetails = await prisma.user.findMany({
    where: { id: { in: topUserIds } },
    select: { id: true, name: true, email: true },
  })

  // Serialize BigInt fields before returning
  const topUsersWithDetails = topUsers.map((u) => ({
    userId: String(u.userId),
    _sum: { totalCost: u._sum.totalCost ?? 0, totalToken: u._sum.totalToken ?? 0 },
    _count: u._count,
    user: topUserDetails.find((d) => d.id === u.userId)
      ? { ...topUserDetails.find((d) => d.id === u.userId)!, id: String(topUserDetails.find((d) => d.id === u.userId)!.id) }
      : null,
  }))

  return {
    totalUsers, activeUsers, totalAssistants, totalMessages,
    totalCost: usageStats._sum.totalCost ?? 0,
    totalTokens: usageStats._sum.totalToken ?? 0,
    dailyUsage: dailyUsage.map((d) => ({
      cost: Number(d.cost),
      tokens: Number(d.tokens),
      day: (d.day instanceof Date ? d.day.toISOString() : String(d.day)).slice(0, 10),
    })),
    topUsers: topUsersWithDetails,
  }
}

// ─── Messages ────────────────────────────────────────────────
export async function getMessages(page = 1, search = "", msgType = "chat", limit = 25) {
  await requireAdmin()
  const skip = (page - 1) * limit

  if (msgType === "chat") {
    const where = search ? { message: { contains: search, mode: "insensitive" as const } } : {}
    const [messages, total] = await Promise.all([
      prisma.assistantChatMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          sender: { select: { name: true, email: true } },
          assistant: { select: { name: true } },
        },
      }),
      prisma.assistantChatMessage.count({ where }),
    ])
    return { messages: messages.map((m) => ({ ...m, id: String(m.id) })), total, pages: Math.ceil(total / limit) }
  } else {
    const where = search ? { message: { contains: search, mode: "insensitive" as const } } : {}
    const [messages, total] = await Promise.all([
      prisma.assistantUserChatMessage.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { name: true, email: true } },
          assistant: { select: { name: true } },
        },
      }),
      prisma.assistantUserChatMessage.count({ where }),
    ])
    return { messages: messages.map((m) => ({ ...m })), total, pages: Math.ceil(total / limit) }
  }
}
