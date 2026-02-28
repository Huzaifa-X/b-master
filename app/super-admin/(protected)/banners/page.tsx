import { getAdminBanners, getAdminPlansSimple } from "@/app/actions/super-admin.action"
import BannersClient from "./_components/banners-client"

export const dynamic = "force-dynamic"

export default async function BannersPage() {
  const [banners, plans] = await Promise.all([
    getAdminBanners(),
    getAdminPlansSimple(),
  ])
  return <BannersClient initial={banners as any} plans={plans} />
}
