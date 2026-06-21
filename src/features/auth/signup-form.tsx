"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function SignupForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    const supabase = createClient();
    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      return;
    }

    router.push("/owner");
    router.refresh();
  }

  return (
    <div className="border-line bg-card rounded-2xl border p-6">
      <h1 className="text-ink text-center text-lg font-bold">
        Create Owner Account
      </h1>
      <p className="text-ink-3 mt-1 text-center text-sm">
        One-time setup — this becomes the owner of Rush OS
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <div>
          <label htmlFor="email" className="text-ink-2 mb-1 block text-sm font-medium">
            Email
          </label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="owner@rush.bh"
            required
            autoComplete="email"
          />
        </div>

        <div>
          <label htmlFor="password" className="text-ink-2 mb-1 block text-sm font-medium">
            Password
          </label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 6 characters"
            required
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="bg-rush-red-bg text-rush-red rounded-lg px-3 py-2 text-sm">
            {error}
          </div>
        )}

        <Button type="submit" full disabled={loading}>
          {loading ? "Creating account..." : "Create Account"}
        </Button>
      </form>

      <p className="text-ink-3 mt-4 text-center text-sm">
        Already have an account?{" "}
        <Link href="/login" className="text-navy font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
