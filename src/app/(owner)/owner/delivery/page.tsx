import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getPlatforms } from "@/services/delivery";
import { DeliveryDashboard } from "@/features/delivery/delivery-dashboard";

export default async function DeliveryPage() {
  const db = await createClient();
  await requireOwner(db);

  const platforms = await getPlatforms(db);

  return <DeliveryDashboard platforms={platforms} />;
}
