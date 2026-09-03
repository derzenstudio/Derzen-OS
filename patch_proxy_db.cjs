const fs = require('fs');
let code = fs.readFileSync('supabase/functions/ai-proxy/index.ts', 'utf8');

const insertDbCall = `
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );
  
  let dynamicModels: Record<string, string> = {};
  try {
    const { data } = await admin.from("platform_state").select("state").eq("id", 1).maybeSingle();
    if (data?.state?.aiModels) {
       dynamicModels = data.state.aiModels;
    }
  } catch {}
`;

code = code.replace(
  `let body: { system?: string; user?: string; maxTokens?: number; provider?: string; model?: string };`,
  `let body: { system?: string; user?: string; maxTokens?: number; provider?: string; model?: string };\n${insertDbCall}`
);

code = code.replace(
  `const model = body.provider === id && body.model ? body.model : defaultModel;`,
  `const model = body.provider === id && body.model ? body.model : (dynamicModels[id] || defaultModel);`
);

fs.writeFileSync('supabase/functions/ai-proxy/index.ts', code);
