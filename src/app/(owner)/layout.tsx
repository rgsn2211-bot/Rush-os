import { OwnerSidebar } from "@/components/layout/owner-sidebar";
import { OwnerHeader } from "@/components/layout/owner-header";

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg flex min-h-screen">
      <OwnerSidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <OwnerHeader />
        <main className="mx-auto w-full max-w-[1200px] flex-1 px-8 pt-7 pb-16">
          {children}
        </main>
      </div>
    </div>
  );
}
