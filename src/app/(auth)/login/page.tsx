import Link from "next/link";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="bg-bg flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="border-line bg-card rounded-2xl border p-6">
          <h1 className="text-ink text-center text-lg font-bold">
            Sign in to Rush OS
          </h1>
          <p className="text-ink-3 mt-1 text-center text-sm">
            Authentication will be connected once Supabase keys are set.
          </p>

          <div className="mt-6 space-y-3">
            <Link href="/owner">
              <Button variant="primary" full>
                Enter as Owner (demo)
              </Button>
            </Link>
            <Link href="/worker">
              <Button variant="secondary" full>
                Enter as Worker (demo)
              </Button>
            </Link>
          </div>
        </div>

        <p className="text-ink-3 mt-4 text-center text-xs">
          These are demo links. Real login with username/password and worker PIN
          will be built when Supabase auth is configured.
        </p>
      </div>
    </div>
  );
}
