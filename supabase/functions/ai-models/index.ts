import { createClient } from "jsr:@supabase/supabase-js@2";

const ALLOWED_ORIGINS = [
  "https://app.alvianpermana.art",
  "https://dev.alvianpermana.art",
];

const cors = (origin: string | null) => ({
  "Access-Control-Allow-Origin": origin && ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  Vary: "Origin",
});

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = { ...cors(origin), "Content-Type": "application/json" };
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(origin) });

  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!jwt) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers });

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  const user = userData?.user;
  if (userErr || !user) return new Response(JSON.stringify({ error: "unauthenticated" }), { status: 401, headers });

  const models: Record<string, any[]> = { anthropic: [], groq: [], openrouter: [], gemini: [] };

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (anthropicKey && !anthropicKey.startsWith("PLACEHOLDER")) {
    try {
      const res = await fetch("https://api.anthropic.com/v1/models", {
        headers: { "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" }
      });
      if (res.ok) models.anthropic = (await res.json()).data.map((m: any) => ({ id: m.id, name: m.display_name || m.id }));
    } catch {}
  }

  const groqKey = Deno.env.get("GROQ_API_KEY");
  if (groqKey && !groqKey.startsWith("PLACEHOLDER")) {
    try {
      const res = await fetch("https://api.groq.com/openai/v1/models", { headers: { Authorization: `Bearer ${groqKey}` } });
      if (res.ok) models.groq = (await res.json()).data.map((m: any) => ({ id: m.id, name: m.id }));
    } catch {}
  }

  try {
    const res = await fetch("https://openrouter.ai/api/v1/models");
    if (res.ok) models.openrouter = (await res.json()).data.map((m: any) => ({ id: m.id, name: m.name }));
  } catch {}

  const geminiKey = Deno.env.get("GEMINI_API_KEY");
  if (geminiKey && !geminiKey.startsWith("PLACEHOLDER")) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${geminiKey}`);
      if (res.ok) models.gemini = (await res.json()).models.map((m: any) => ({ id: m.name.replace('models/', ''), name: m.displayName || m.name }));
    } catch {}
  }

  return new Response(JSON.stringify(models), { headers });
});
