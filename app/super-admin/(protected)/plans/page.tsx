import { getPlans } from "@/app/actions/super-admin.action"
import PlansClient from "./_components/plans-client"

export default async function PlansPage() {
  const plans = await getPlans()
  return <PlansClient initial={plans as any} />
}
