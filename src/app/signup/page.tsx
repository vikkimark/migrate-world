'use client';

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/lib/supabase";
const supabase = getSupabase();

export default function SignUpPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;
      const session = data.session ?? null;
      setEmail(session?.user?.email ?? null);
      setLoading(false);
    })();
    return () => { mounted = false; };
  }, []);

  async function handleSignOut() {
    await supabase.auth.signOut();
    setEmail(null);
    router.refresh();
  }

  if (loading) {
    return <div>Loading…</div>;
  }

  if (email) {
    return (
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">You’re signed in</h1>
        <p className="mt-2 text-zinc-600">Email: {email}</p>
        <div className="mt-4 flex gap-3">
          <button
            className="border rounded px-3 py-2"
            onClick={() => router.push("/checklist")}
          >
            Go to my checklist
          </button>
          <button
            className="border rounded px-3 py-2"
            onClick={handleSignOut}
          >
            Sign out
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="max-w-md">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-2 text-zinc-600">
        Enter your email and we’ll send you a magic link to sign in.
      </p>

      <div className="mt-6">
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          view="magic_link"
          providers={[]}
          // After the user clicks the email link, send them back to the home page for now.
          // (We’ll change this to /checklist after we build it.)
	 redirectTo={typeof window !== "undefined" ? `${window.location.origin}/checklist` : 		 undefined}
        />
      </div>

      <p className="mt-4 text-xs text-zinc-500">
        By continuing, you agree to our Terms and Privacy Policy.
      </p>
    </section>
  );
}
