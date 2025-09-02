'use client';

import { useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { toast } from "sonner";
import { posthog } from "@/lib/analytics";
const supabase = getSupabase();

export default function ContactPage() {
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("Support");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!/\S+@\S+\.\S+/.test(email)) {
      toast.error("Please enter a valid email.");
      return;
    }
    if (!message.trim()) {
      toast.error("Please enter a message.");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.from("messages").insert([{
      email, name: name || null, topic, message,
    }]);
    setSubmitting(false);
    if (error) {
      console.error("contact insert error:", error);
      toast.error("Could not send. Please try again.");
      return;
    }
    posthog.capture("contact_message_submitted", { topic });
    toast.success("Thanks — we received your message!");
    setEmail(""); setName(""); setTopic("Support"); setMessage("");
  }

  return (
    <section className="max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Contact</h1>
      <p className="mt-2 text-zinc-600">Send us a note and we’ll get back to you.</p>

      <form onSubmit={handleSubmit} className="mt-6 grid gap-4">
        <div>
          <label className="block text-sm mb-1">Your email</label>
          <input className="w-full border rounded px-3 py-2" type="email"
                 value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-sm mb-1">Name (optional)</label>
            <input className="w-full border rounded px-3 py-2"
                   value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm mb-1">Topic</label>
            <select className="w-full border rounded px-3 py-2"
                    value={topic} onChange={(e) => setTopic(e.target.value)}>
              <option>Support</option>
              <option>Suggestion</option>
              <option>Partnership</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm mb-1">Message</label>
          <textarea className="w-full border rounded px-3 py-2 min-h-[120px]"
                    value={message} onChange={(e) => setMessage(e.target.value)} required />
        </div>

        <button className="border rounded px-4 py-2"
                type="submit" disabled={submitting}>
          {submitting ? "Sending…" : "Send"}
        </button>
      </form>
    </section>
  );
}
