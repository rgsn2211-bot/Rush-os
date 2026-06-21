import { Logo } from "@/components/layout/logo";
import { SignupForm } from "@/features/auth/signup-form";

export default function SignupPage() {
  return (
    <div className="bg-bg flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <SignupForm />
      </div>
    </div>
  );
}
