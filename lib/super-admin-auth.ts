import { createHmac } from "crypto"
import { cookies } from "next/headers"

export const SA_EMAIL = "huzaifatahir7524@gmail.com"
export const SA_PASSWORD = "AskHuzaifa178*"
export const SA_COOKIE = "sa_session"
const SECRET = process.env.NEXTAUTH_SECRET ?? "sa-fallback-secret-key-2026"

export function signToken(payload: object): string {
  const data = Buffer.from(JSON.stringify(payload)).toString("base64url")
  const sig = createHmac("sha256", SECRET).update(data).digest("base64url")
  return `${data}.${sig}`
}

export function verifyToken(token: string): object | null {
  try {
    const [data, sig] = token.split(".")
    const expected = createHmac("sha256", SECRET).update(data).digest("base64url")
    if (sig !== expected) return null
    return JSON.parse(Buffer.from(data, "base64url").toString())
  } catch {
    return null
  }
}

export async function getSuperAdminSession(): Promise<{ admin: boolean } | null> {
  const store = await cookies()
  const raw = store.get(SA_COOKIE)?.value
  if (!raw) return null
  const payload = verifyToken(raw) as { admin?: boolean } | null
  if (!payload?.admin) return null
  return { admin: true }
}
