import { PosManagerHeader } from "@/components/layout/pos-manager-header";

export default function PosManagerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg flex min-h-screen flex-col">
      <PosManagerHeader />
      <main className="mx-auto w-full max-w-[1100px] flex-1 px-[22px] pt-[22px] pb-10">
        {children}
      </main>
    </div>
  );
}
