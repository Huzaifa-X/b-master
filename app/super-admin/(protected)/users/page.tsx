import { getUsers } from "@/app/actions/super-admin.action"
import UsersClient from "./_components/users-client"

export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? "1"))
  const search = sp.search ?? ""
  const { users, total } = await getUsers(page, search, 20)
  return <UsersClient initial={users as any} total={total} page={page} search={search} />
}
