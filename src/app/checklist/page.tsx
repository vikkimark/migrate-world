'use client';

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

type ChecklistItem = {
  id: number;
  user_id: string;
  type: "program" | "visa" | "housing" | "job" | "flight" | "custom";
  ref_table: string | null;
  ref_id: number | null;
  title: string;
  status: "todo" | "done";
  due_date: string | null; // we'll pass YYYY-MM-DD
};

export default function ChecklistPage() {
  const [loading, setLoading] = useState(true);
  const [signedInEmail, setSignedInEmail] = useState<string | null>(null);
  const [items, setItems] = useState<ChecklistItem[]>([]);

  // form state
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ChecklistItem["type"]>("custom");
  const [dueDate, setDueDate] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user ?? null;
      setSignedInEmail(user?.email ?? null);

      if (!user) {
        setLoading(false);
        return;
      }

      await refresh(user.id);
    })();
    return () => { mounted = false; };
  }, []);

  async function refresh(userId?: string) {
    setLoading(true);
    // If userId not provided, fetch current user
    let uid = userId;
    if (!uid) {
      const { data } = await supabase.auth.getUser();
      uid = data.user?.id ?? undefined;
    }
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("checklist_items")
      .select("*")
      .eq("user_id", uid)
      .order("status", { ascending: true })
      .order("due_date", { ascending: true, nullsFirst: true })
      .order("id", { ascending: true });

    if (error) {
      console.error("fetch checklist error:", error);
    }
    setItems(data ?? []);
    setLoading(false);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) return alert("Please sign in first.");

    const { error } = await supabase.from("checklist_items").insert([
      {
        user_id: user.id,
        type,
        title: title.trim(),
        status: "todo",
        due_date: dueDate || null,
      },
    ]);
    if (error) {
      console.error("add checklist error:", error);
      alert("Could not add item.");
      return;
    }
    setTitle("");
    setDueDate("");
    setType("custom");
    await refresh(user.id);
  }

  async function toggleStatus(item: ChecklistItem) {
    const newStatus = item.status === "done" ? "todo" : "done";
    const { error } = await supabase
      .from("checklist_items")
      .update({ status: newStatus })
      .eq("id", item.id);
    if (error) {
      console.error("toggle error:", error);
      alert("Could not update item.");
      return;
    }
    await refresh();
  }

  async function deleteItem(item: ChecklistItem) {
    const { error } = await supabase.from("checklist_items").delete().eq("id", item.id);
    if (error) {
      console.error("delete error:", error);
      alert("Could not delete item.");
      return;
    }
    await refresh();
  }

  if (!signedInEmail) {
    return (
      <section>
        <h1 className="text-2xl font-semibold tracking-tight">Checklist</h1>
        <p className="mt-2 text-zinc-600">
          Please <Link className="underline" href="/signup">sign in</Link> to view and manage your checklist.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">My checklist</h1>
      <p className="mt-1 text-zinc-600">Signed in as {signedInEmail}</p>

      <form onSubmit={handleAdd} className="mt-4 grid gap-3 sm:grid-cols-4">
        <input
          className="border rounded px-3 py-2 sm:col-span-2"
          placeholder="Add an item (e.g., Apply to Carleton MSc)"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <select
          className="border rounded px-3 py-2"
          value={type}
          onChange={(e) => setType(e.target.value as ChecklistItem["type"])}
        >
          <option value="custom">Custom</option>
          <option value="program">Program</option>
          <option value="visa">Visa</option>
          <option value="housing">Housing</option>
          <option value="job">Job</option>
          <option value="flight">Flight</option>
        </select>
        <input
          type="date"
          className="border rounded px-3 py-2"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <div className="sm:col-span-4">
          <button className="border rounded px-3 py-2" type="submit">Add</button>
        </div>
      </form>

      {loading ? (
        <p className="mt-6">Loading…</p>
      ) : (
        <ul className="mt-6 space-y-2">
          {items.map((it) => (
            <li key={it.id} className="border rounded p-3 flex items-center justify-between">
              <div>
                <div className={"font-medium " + (it.status === "done" ? "line-through text-zinc-500" : "")}>
                  {it.title}
                </div>
                <div className="text-xs text-zinc-500">
                  {it.type}{it.due_date ? ` • due ${it.due_date}` : ""}
                </div>
              </div>
              <div className="flex gap-2">
                <button className="border rounded px-2 py-1" onClick={() => toggleStatus(it)}>
                  {it.status === "done" ? "Mark todo" : "Mark done"}
                </button>
                <button className="border rounded px-2 py-1" onClick={() => deleteItem(it)}>
                  Delete
                </button>
              </div>
            </li>
          ))}
          {items.length === 0 && (
            <li className="text-zinc-500">No items yet. Add your first above.</li>
          )}
        </ul>
      )}
    </section>
  );
}
