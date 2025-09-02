'use client';
import { posthog } from "@/lib/analytics";
import { useMemo, useState } from "react";
import { getSupabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { sleep } from "@/lib/sleep";
const supabase = getSupabase();

type ShopItem = {
  id: string;
  title: string;
  category: string;   // e.g., Winter Wear, Groceries - Indian
  city?: "Ottawa" | "Toronto"; // when relevant; else omit
  url: string;        // external link (search/result/category)
  provider?: string;  // Amazon, Walmart, Google Maps, etc.
  notes?: string;
};

const ITEMS: ShopItem[] = [
  // --- Groceries: Indian / Nigerian / Chains (Ottawa) ---
  {
    id: "gro-ott-ind",
    title: "Indian groceries near Ottawa (map)",
    category: "Groceries - Indian",
    city: "Ottawa",
    url: "https://www.google.com/maps/search/Indian+grocery+Ottawa",
    provider: "Google Maps",
  },
  {
    id: "gro-ott-nga",
    title: "Nigerian / African groceries near Ottawa (map)",
    category: "Groceries - Nigerian",
    city: "Ottawa",
    url: "https://www.google.com/maps/search/African+grocery+Ottawa",
    provider: "Google Maps",
  },
  {
    id: "gro-ott-chains",
    title: "Major grocery chains (Ottawa): Walmart / No Frills / Loblaws (map)",
    category: "Groceries - Chains",
    city: "Ottawa",
    url: "https://www.google.com/maps/search/Walmart+OR+No+Frills+OR+Loblaws+Ottawa",
    provider: "Google Maps",
  },

  // --- Groceries: Indian / Nigerian / Chains (Toronto) ---
  {
    id: "gro-tor-ind",
    title: "Indian groceries near Toronto (map)",
    category: "Groceries - Indian",
    city: "Toronto",
    url: "https://www.google.com/maps/search/Indian+grocery+Toronto",
    provider: "Google Maps",
  },
  {
    id: "gro-tor-nga",
    title: "Nigerian / African groceries near Toronto (map)",
    category: "Groceries - Nigerian",
    city: "Toronto",
    url: "https://www.google.com/maps/search/African+grocery+Toronto",
    provider: "Google Maps",
  },
  {
    id: "gro-tor-chains",
    title: "Major grocery chains (Toronto): Walmart / No Frills / Loblaws (map)",
    category: "Groceries - Chains",
    city: "Toronto",
    url: "https://www.google.com/maps/search/Walmart+OR+No+Frills+OR+Loblaws+Toronto",
    provider: "Google Maps",
  },

  // --- Winter wear ---
  {
    id: "win-coat",
    title: "Winter coat / parka (Canada)",
    category: "Winter Wear",
    url: "https://www.amazon.ca/s?k=winter+coat+parka",
    provider: "Amazon",
    notes: "Look for insulated, hooded; check temperature rating.",
  },
  {
    id: "win-boots",
    title: "Winter boots (men/women)",
    category: "Winter Wear",
    url: "https://www.amazon.ca/s?k=winter+boots",
    provider: "Amazon",
    notes: "Waterproof + good traction; consider thermal rating.",
  },
  {
    id: "win-gloves",
    title: "Thermal gloves + beanie",
    category: "Winter Wear",
    url: "https://www.amazon.ca/s?k=winter+gloves+beanie",
    provider: "Amazon",
  },
  {
    id: "win-thermals",
    title: "Thermal base layers (top/bottom)",
    category: "Winter Wear",
    url: "https://www.amazon.ca/s?k=thermal+base+layer",
    provider: "Amazon",
  },

  // --- Clothing & Footwear (all-season) ---
  {
    id: "cloth-rain",
    title: "Rain jacket / windbreaker",
    category: "Clothing Basics",
    url: "https://www.amazon.ca/s?k=rain+jacket",
    provider: "Amazon",
  },
  {
    id: "cloth-formal",
    title: "Formal outfit (interviews / events)",
    category: "Clothing Basics",
    url: "https://www.amazon.ca/s?k=mens+formal+shirt+or+women+formal+dress",
    provider: "Amazon",
  },
  {
    id: "foot-sneakers",
    title: "Comfort sneakers (walking/commute)",
    category: "Footwear",
    url: "https://www.amazon.ca/s?k=comfort+sneakers",
    provider: "Amazon",
  },

  // --- Bedding & Bath ---
  {
    id: "bed-starter",
    title: "Bedding starter set (duvet, pillow, sheets)",
    category: "Bedding",
    url: "https://www.amazon.ca/s?k=bedding+starter+set",
    provider: "Amazon",
  },
  {
    id: "bath-towels",
    title: "Bath towels set",
    category: "Bedding & Bath",
    url: "https://www.amazon.ca/s?k=bath+towels+set",
    provider: "Amazon",
  },

  // --- Kitchen setup ---
  {
    id: "kit-cookware",
    title: "Cookware starter set (pots, pans, utensils)",
    category: "Kitchen Setup",
    url: "https://www.amazon.ca/s?k=cookware+set+starter",
    provider: "Amazon",
  },
  {
    id: "kit-rice",
    title: "Rice cooker (multi-size options)",
    category: "Kitchen Setup",
    url: "https://www.amazon.ca/s?k=rice+cooker",
    provider: "Amazon",
  },
  {
    id: "kit-kettle",
    title: "Electric kettle",
    category: "Kitchen Setup",
    url: "https://www.amazon.ca/s?k=electric+kettle",
    provider: "Amazon",
  },
  {
    id: "kit-pressure",
    title: "Pressure cooker (Indian style)",
    category: "Kitchen Setup",
    url: "https://www.amazon.ca/s?k=pressure+cooker+3+litre",
    provider: "Amazon",
  },
  {
    id: "kit-spices",
    title: "Indian spice kit (masala box)",
    category: "Kitchen Setup",
    url: "https://www.amazon.ca/s?k=indian+spice+box+masala+dabba",
    provider: "Amazon",
  },

  // --- Toiletries & misc ---
  {
    id: "toil-starter",
    title: "Toiletries starter (soap, shampoo, toothbrush, etc.)",
    category: "Essentials & Toiletries",
    url: "https://www.amazon.ca/s?k=toiletries+kit",
    provider: "Amazon",
  },
  {
    id: "misc-umbrella",
    title: "Compact umbrella",
    category: "Accessories",
    url: "https://www.amazon.ca/s?k=compact+umbrella",
    provider: "Amazon",
  },
];

export default function ShopPage() {
  const [city, setCity] = useState<string>("");
  const [category, setCategory] = useState<string>("");
  const [q, setQ] = useState<string>("");
  const [savingId, setSavingId] = useState<string | null>(null);

  const categories = useMemo(
    () => Array.from(new Set(ITEMS.map(i => i.category))).sort(),
    []
  );

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    return ITEMS.filter(i => {
      const cityOk = city ? i.city === (city as "Ottawa" | "Toronto") : true;
      const catOk = category ? i.category === category : true;
      const qOk = query
        ? i.title.toLowerCase().includes(query) ||
          (i.provider ?? "").toLowerCase().includes(query)
        : true;
      return cityOk && catOk && qOk;
    });
  }, [city, category, q]);

  async function handleSave(item: ShopItem) {
    setSavingId(item.id);
    const { data: userData } = await supabase.auth.getUser();
    const user = userData.user;
    if (!user) {
      setSavingId(null);
      alert("Please sign in first. You’ll be redirected to Sign in.");
      window.location.href = "/signup";
      return;
    }
    // For now we store as "custom" type (DB type whitelist). We can add a new "shop" type later.
    const title = `[Shop] ${item.category} — ${item.title}`;
    const { error } = await supabase.from("checklist_items").insert([{
      user_id: user.id,
      type: "custom",
      ref_table: "external_shop",
      ref_id: null,
      title,
      status: "todo",
      due_date: null,
    }]);
    setSavingId(null);
    if (error) {
      console.error("save shop error:", error);
      alert("Could not save. Please try again.");
      return;
    }
    const go = confirm("Saved to your checklist. Open checklist now?");
    if (go) await sleep(250);
    window.location.href = "/checklist";

    posthog.capture("saved_to_checklist", { type: "shop", ref_table: "external_shop", ref_id: item.id });
  }

  return (
    <section>
      <h1 className="text-2xl font-semibold tracking-tight">Shop essentials</h1>
      <p className="text-zinc-600 mt-1">
        Winter and all-season essentials, plus Indian/Nigerian groceries and major chains. These are external links — verify prices and availability.
      </p>

      <div className="mt-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-sm mb-1">City (for local groceries)</label>
          <select className="border rounded px-3 py-2" value={city} onChange={e => setCity(e.target.value)}>
            <option value="">All</option>
            <option value="Ottawa">Ottawa</option>
            <option value="Toronto">Toronto</option>
          </select>
        </div>

        <div>
          <label className="block text-sm mb-1">Category</label>
          <select className="border rounded px-3 py-2" value={category} onChange={e => setCategory(e.target.value)}>
            <option value="">All</option>
            {categories.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div className="flex-1 min-w-[220px]">
          <label className="block text-sm mb-1">Search</label>
          <input
            className="w-full border rounded px-3 py-2"
            placeholder="Try: parka, boots, Indian spices, Nigerian..."
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>

        <button className="border rounded px-3 py-2" onClick={() => { setCity(""); setCategory(""); setQ(""); }}>
          Clear
        </button>
      </div>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2">
        {filtered.map(item => (
          <li key={item.id} className="border rounded p-4 flex flex-col justify-between">
            <div>
              <div className="text-sm text-zinc-500">
                {item.category}{item.city ? ` • ${item.city}` : ""}{item.provider ? ` • ${item.provider}` : ""}
              </div>
              <div className="font-medium mt-1">{item.title}</div>
              <a className="text-blue-600 underline mt-2 inline-block" href={item.url} target="_blank" rel="noopener noreferrer">
                Open link
              </a>
              {item.notes ? <div className="text-sm text-zinc-600 mt-1">{item.notes}</div> : null}
            </div>
            <div className="mt-3">
              <Button size="sm" onClick={() => handleSave(item)} disabled={savingId === item.id}>
                {savingId === item.id ? "Saving…" : "Add to checklist"}
              </Button>
            </div>
          </li>
        ))}
        {filtered.length === 0 && (
          <li className="text-zinc-500">No results — adjust filters or search.</li>
        )}
      </ul>

      <p className="mt-6 text-xs text-zinc-500">
        Tip: For local groceries, use the map results then favorite the nearest reliable stores.
      </p>
    </section>
  );
}
