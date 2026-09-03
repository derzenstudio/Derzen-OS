const fs = require('fs');
let code = fs.readFileSync('src/modules/DevPlatform.tsx', 'utf8');

const uiCode = `
export function AiModelSelector() {
  const { toast } = useApp();
  const aiModels = usePlatformStore(s => s.aiModels);
  const setAiModels = usePlatformStore(s => s.setAiModels);
  
  const [loading, setLoading] = useState(false);
  const [available, setAvailable] = useState<Record<string, { id: string, name: string }[]>>({});
  
  const fetchModels = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase().auth.getSession();
      const res = await fetch(\`\${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-models\`, {
        headers: { Authorization: \`Bearer \${session?.access_token}\` }
      });
      if (res.ok) setAvailable(await res.json());
      else toast("warn", "Failed to fetch models", "Make sure ai-models function is deployed");
    } catch {
      toast("warn", "Failed to fetch models", "Network error");
    }
    setLoading(false);
  };
  
  useEffect(() => { fetchModels(); }, []);
  
  const updateModel = (provider: string, model: string) => {
    setAiModels({ ...aiModels, [provider]: model });
    toast("ok", "Model updated", \`\${provider} is now using \${model}\`);
  };

  return (
    <Panel title="Live Provider Models" note="Dynamic models synced from AI platforms" right={<Btn size="xs" variant="ghost" icon="refresh" onClick={fetchModels}>Sync</Btn>}>
      {loading ? <div className="text-gray-500 text-xs">Loading available models...</div> : 
       Object.entries(available).map(([provider, models]) => (
        <div key={provider} className="mb-3 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-widest text-gray-900 dark:text-white/80">{provider}</span>
          <Select 
            value={aiModels[provider] || ""} 
            onChange={(e) => updateModel(provider, e.target.value)} 
            className="w-[240px] bg-gray-100 dark:bg-[#171714] text-gray-900 dark:text-white border-gray-300 dark:border-white/15 !h-7 !text-[11px]"
          >
            <option value="">(Default edge config)</option>
            {models.map(m => <option key={m.id} value={m.id}>{m.name}</option>)}
          </Select>
        </div>
      ))}
    </Panel>
  );
}
`;

code = code.replace(
  `// ── Section G · AI platform ────────────────────────────────────────────────`,
  `${uiCode}\n// ── Section G · AI platform ────────────────────────────────────────────────`
);

code = code.replace(
  `<Panel title="Prompt & model registry"`,
  `<AiModelSelector />\n        <Panel title="Prompt & model registry"`
);

fs.writeFileSync('src/modules/DevPlatform.tsx', code);
