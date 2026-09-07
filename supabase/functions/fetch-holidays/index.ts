import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Iran public + religious holidays (Gregorian dates) - curated fallback because Nager.Date covers Iran poorly
const IR_FALLBACK: Record<number, Array<{ date: string; name: string; localName: string; type: string }>> = {
  2024: [
    { date: "2024-03-20", name: "Nowruz", localName: "نوروز", type: "national" },
    { date: "2024-03-21", name: "Nowruz", localName: "نوروز", type: "national" },
    { date: "2024-03-22", name: "Nowruz", localName: "نوروز", type: "national" },
    { date: "2024-03-23", name: "Nowruz", localName: "نوروز", type: "national" },
    { date: "2024-04-01", name: "Islamic Republic Day", localName: "روز جمهوری اسلامی", type: "national" },
    { date: "2024-04-02", name: "Sizdah Bedar", localName: "سیزده بدر", type: "national" },
    { date: "2024-06-04", name: "Death of Khomeini", localName: "رحلت امام خمینی", type: "national" },
    { date: "2024-06-05", name: "Revolt of Khordad 15", localName: "قیام ۱۵ خرداد", type: "national" },
    { date: "2024-12-21", name: "Yalda Night", localName: "شب یلدا", type: "cultural" },
    { date: "2024-02-11", name: "Islamic Revolution", localName: "پیروزی انقلاب اسلامی", type: "national" },
    { date: "2024-03-19", name: "Oil Nationalization", localName: "ملی‌شدن صنعت نفت", type: "national" },
  ],
  2025: [
    { date: "2025-03-20", name: "Nowruz", localName: "نوروز", type: "national" },
    { date: "2025-03-21", name: "Nowruz", localName: "نوروز", type: "national" },
    { date: "2025-03-22", name: "Nowruz", localName: "نوروز", type: "national" },
    { date: "2025-03-23", name: "Nowruz", localName: "نوروز", type: "national" },
    { date: "2025-04-01", name: "Islamic Republic Day", localName: "روز جمهوری اسلامی", type: "national" },
    { date: "2025-04-02", name: "Sizdah Bedar", localName: "سیزده بدر", type: "national" },
    { date: "2025-06-04", name: "Death of Khomeini", localName: "رحلت امام خمینی", type: "national" },
    { date: "2025-06-05", name: "Revolt of Khordad 15", localName: "قیام ۱۵ خرداد", type: "national" },
    { date: "2025-12-21", name: "Yalda Night", localName: "شب یلدا", type: "cultural" },
    { date: "2025-02-10", name: "Islamic Revolution", localName: "پیروزی انقلاب اسلامی", type: "national" },
    { date: "2025-03-19", name: "Oil Nationalization", localName: "ملی‌شدن صنعت نفت", type: "national" },
  ],
  2026: [
    { date: "2026-03-21", name: "Nowruz", localName: "نوروز", type: "national" },
    { date: "2026-03-22", name: "Nowruz", localName: "نوروز", type: "national" },
    { date: "2026-03-23", name: "Nowruz", localName: "نوروز", type: "national" },
    { date: "2026-03-24", name: "Nowruz", localName: "نوروز", type: "national" },
    { date: "2026-04-01", name: "Islamic Republic Day", localName: "روز جمهوری اسلامی", type: "national" },
    { date: "2026-04-02", name: "Sizdah Bedar", localName: "سیزده بدر", type: "national" },
    { date: "2026-06-04", name: "Death of Khomeini", localName: "رحلت امام خمینی", type: "national" },
    { date: "2026-06-05", name: "Revolt of Khordad 15", localName: "قیام ۱۵ خرداد", type: "national" },
    { date: "2026-12-21", name: "Yalda Night", localName: "شب یلدا", type: "cultural" },
    { date: "2026-02-11", name: "Islamic Revolution", localName: "پیروزی انقلاب اسلامی", type: "national" },
    { date: "2026-03-19", name: "Oil Nationalization", localName: "ملی‌شدن صنعت نفت", type: "national" },
  ],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { year, country } = await req.json();
    if (!year || !country) {
      return new Response(JSON.stringify({ error: "year and country required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    let rows: Array<{ date: string; country_code: string; name: string; local_name: string; type: string }> = [];

    if (country === "IR" && IR_FALLBACK[year]) {
      rows = IR_FALLBACK[year].map(h => ({
        date: h.date, country_code: "IR",
        name: h.name, local_name: h.localName, type: h.type,
      }));
    } else {
      // Try Nager.Date for other countries (works well for AU)
      try {
        const r = await fetch(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`);
        if (r.ok) {
          const data = await r.json();
          rows = (data || []).map((h: any) => ({
            date: h.date,
            country_code: country,
            name: h.name,
            local_name: h.localName,
            type: h.types?.[0]?.toLowerCase() || "national",
          }));
        }
      } catch (e) {
        console.error("Nager fetch failed", e);
      }
    }

    if (rows.length > 0) {
      const { error } = await admin.from("holidays").upsert(rows, {
        onConflict: "date,country_code,name", ignoreDuplicates: true,
      });
      if (error) console.error("upsert error", error);
    }

    return new Response(JSON.stringify({ inserted: rows.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("fetch-holidays error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
