import { OwnerSidebar } from "@/components/layout/owner-sidebar";
import { OwnerHeader } from "@/components/layout/owner-header";
import { OwnerMobileTopbar } from "@/components/layout/owner-mobile-topbar";
import { OwnerMobileNav } from "@/components/layout/owner-mobile-nav";

/**
 * Responsive owner shell.
 * - Desktop (lg+): navy sidebar on the left + white header on top.
 * - Phone: navy top bar + bottom navigation, no sidebar.
 * The sidebar/header are hidden below lg; the mobile bars are hidden at lg+.
 */
export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg flex min-h-screen">
      <OwnerSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <OwnerMobileTopbar />
        <OwnerHeader />
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-4 pt-5 pb-16 lg:px-8 lg:pt-7">
          {children}
        </main>
        <OwnerMobileNav />
      </div>
    </div>
  );
}
