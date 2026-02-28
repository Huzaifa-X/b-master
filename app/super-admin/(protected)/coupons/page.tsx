import { getStripeCoupons, getUserPromotions } from "@/app/actions/super-admin.action"
import CouponsClient from "./_components/coupons-client"

export const dynamic = "force-dynamic"

export default async function CouponsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; tab?: string }>
}) {
  const sp = await searchParams
  const page = Math.max(1, parseInt(sp.page ?? "1"))
  const search = sp.search ?? ""

  const [{ coupons: stripeCoupons, error: stripeError }, { promotions, total }] = await Promise.all([
    getStripeCoupons(),
    getUserPromotions(page, search, 20),
  ])

  return (
    <CouponsClient
      stripeCoupons={stripeCoupons}
      stripeError={stripeError}
      initialPromotions={promotions}
      total={total}
      page={page}
      search={search}
    />
  )
}
