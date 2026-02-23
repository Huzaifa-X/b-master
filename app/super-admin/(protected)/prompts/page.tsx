import { getPrompts } from "@/app/actions/super-admin.action"
import PromptsClient from "./_components/prompts-client"

export default async function PromptsPage() {
  const prompts = await getPrompts()
  return <PromptsClient initial={prompts as any} />
}
