import { createClient } from "@/lib/supabase/server";
import { requireOwner } from "@/lib/auth";
import { getPlatforms } from "@/services/delivery";
import { getAllSettlements } from "@/services/money";
import { DeliveryDashboard } from "@/features/delivery/delivery-dashboard";

export default async function DeliveryPage() {
  const db = await createClient();
  await requireOwner(db);

  const [platforms, settlements] = await Promise.all([
    getPlatforms(db),
    getAllSettlements(db),
  ]);

  // Delivery settlements only — card/BenefitPay live in the Money › Cash Flow tab.
  const deliverySettlements = settlements.filter(
    (s) => s.channel === "delivery",
  );

  return (
    <DeliveryDashboard
      platforms={platforms}
      settlements={deliverySettlements}
    />
  );
}
