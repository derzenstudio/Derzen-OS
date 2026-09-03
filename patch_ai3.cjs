const fs = require('fs');
let code = fs.readFileSync('src/lib/aiGateway.ts', 'utf8');

// Replace ignore block
code = code.replace(/async function _ignore\([\s\S]*?return text;\n\}/m, '');

// Fix fetchModels
const fetchModelsRegex = /export async function fetchModels[\s\S]*?finally {\n    window\.clearTimeout\(to\);\n  }\n\}/m;
const newFetchModels = `export async function fetchModels(id: AiProviderId, apiKey: string): Promise<string[]> {
  const ctl = new AbortController();
  const to = window.setTimeout(() => ctl.abort(), 9000);
  try {
    if (id === "anthropic") {
      return ["claude-3-opus-20240229", "claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-sonnet-20240229", "claude-3-haiku-20240307"];
    }
    let res: Response;
    if (id === "gemini") {
      res = await fetch(\`\${PROVIDER_META.gemini.modelsUrl}?key=\${encodeURIComponent(apiKey)}&pageSize=200\`, { signal: ctl.signal });
    } else if (id === "openai" || id === "groq") {
      res = await fetch(PROVIDER_META[id].modelsUrl, {
        signal: ctl.signal,
        headers: { Authorization: \`Bearer \${apiKey}\` },
      });
    } else {
      throw new Error("Unknown provider");
    }
    window.clearTimeout(to);
    if (!res.ok) throw new Error(\`HTTP \${res.status}\`);
    const json = await res.json() as any;
    if (id === "gemini") {
      return (json.models ?? [])
        .filter((m: any) => (m.supportedGenerationMethods ?? []).includes("generateContent"))
        .map((m: any) => (m.name ?? "").replace(/^models\\//, ""))
        .filter(Boolean)
        .sort()
        .reverse(); // newest first
    }
    const ids = (json.data ?? []).map((m: any) => m.id ?? "").filter(Boolean);
    return ids.sort();
  } finally {
    window.clearTimeout(to);
  }
}`;
code = code.replace(fetchModelsRegex, newFetchModels);

fs.writeFileSync('src/lib/aiGateway.ts', code);
