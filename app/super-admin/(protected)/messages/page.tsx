import { getMessages } from "@/app/actions/super-admin.action"
import MessagesClient from "./_components/messages-client"

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; type?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? "1"))
  const search = sp.search ?? ""
  const msgType = (sp.type === "ai" ? "ai" : "chat") as "chat" | "ai"
  const { messages, total } = await getMessages(page, search, msgType, 25)
  return (
    <MessagesClient
      initial={messages as any}
      total={total}
      page={page}
      search={search}
      msgType={msgType}
    />
  )
}
