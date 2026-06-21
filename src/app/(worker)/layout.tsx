import { WorkerHeader } from "@/components/layout/worker-header";

export default function WorkerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-bg mx-auto flex min-h-screen max-w-[540px] flex-col">
      <WorkerHeader />
      <main className="flex-1 px-[22px] pt-[22px] pb-10">{children}</main>
    </div>
  );
}
