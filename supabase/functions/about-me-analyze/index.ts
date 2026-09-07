// Edge function: analyzes the "About Me" answers and returns a JSON
// with a summary + suggested folders/tags/tasks.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM = `You are a thoughtful life-coach AI. The user has answered a "About Me" questionnaire (answers + free text).
Your job:
1. Produce a short, warm, non-judgemental analysis (in Persian unless user wrote in English).
2. Identify 3-5 main life themes the user cares about.
3. Identify 2-4 strengths and 1-3 risks/blockers.
4. Suggest 3-6 folder names that fit their goals.
5. Suggest 3-8 tags that match their interests, focus areas, or contexts.
6. Suggest 5-10 concrete starter tasks (each with optional folder name and priority none/low/medium/high).
Respond ONLY by calling the propose_about_me_plan tool.`;

const TOOL = {
  type: "function",
  function: {
    name: "propose_about_me_plan",
    parameters: {
      type: "object",
      properties: {
        analysis: {
          type: "object",
          properties: {
            summary: { type: "string" },
            themes: { type: "array", items: { type: "string" } },
            strengths: { type: "array", items: { type: "string" } },
            risks: { type: "array", items: { type: "string" } },
          },
          required: ["summary", "themes", "strengths", "risks"],
          additionalProperties: false,
        },
        suggestions: {
          type: "object",
          properties: {
            folders: { type: "array", items: { type: "string" } },
            tags: { type: "array", items: { type: "string" } },
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  folder: { type: "string" },
                  priority: { type: "string", enum: ["none", "low", "medium", "high"] },
                },
                required: ["title"],
                additionalProperties: false,
              },
            },
          },
          required: ["folders", "tags", "tasks"],
          additionalProperties: false,
        },
      },
      required: ["analysis", "suggestions"],
      additionalProperties: false,
    },
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { answers, freeText, language } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    let system = SYSTEM;
    if (language === "fa") system += "\n\nIMPORTANT: respond entirely in Persian.";
    else if (language === "en") system += "\n\nIMPORTANT: respond entirely in English.";

    const userPayload = {
      answers: answers || {},
      free_text: freeText || "",
    };

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: JSON.stringify(userPayload) },
        ],
        tools: [TOOL],
        tool_choice: { type: "function", function: { name: "propose_about_me_plan" } },
      }),
    });

    if (resp.status === 429) {
      return new Response(JSON.stringify({ error: "محدودیت سرعت — کمی صبر کنید." }), {
        status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (resp.status === 402) {
      return new Response(JSON.stringify({ error: "اعتبار AI تمام شده." }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!resp.ok) {
      const t = await resp.text();
      console.error("about-me-analyze error", resp.status, t);
      return new Response(JSON.stringify({ error: "خطای AI" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) {
      return new Response(JSON.stringify({ error: "پاسخ نامعتبر" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(tc.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
