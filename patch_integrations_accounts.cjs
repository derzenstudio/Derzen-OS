const fs = require('fs');
let code = fs.readFileSync('src/modules/Integrations.tsx', 'utf8');

code = code.replace(
  'const { toast, connectedApps, setAppConnected } = useApp();',
  'const { toast, integrationAccounts, connectIntegrationAccount, removeIntegrationAccount } = useApp();'
);

code = code.replace(
  'const a = { ...originalA, status: connectedApps.includes(originalA.id) ? "connected" : originalA.status };',
  'const accounts = integrationAccounts[originalA.id] || [];\n              const isConnected = accounts.length > 0 || (originalA.id === "offline" && integrationAccounts[originalA.id]?.length > 0);\n              const a = { ...originalA, status: isConnected ? "connected" : originalA.status };'
);

code = code.replace(
  '{a.status !== "connected" && (',
  '{a.status !== "connected" && a.status === "waitlist" && (\n                  <Btn size="xs" className="mt-2" icon="clock" onClick={() => toast("info", "Added to waitlist", "We will email you when this is ready.")}>Join waitlist</Btn>\n                )}\n                {a.status === "available" && (\n                  <div className="mt-2 space-y-2">\n                    {accounts.map(acc => (\n                      <div key={acc.id} className="flex items-center justify-between bg-paper px-2 py-1.5 rounded text-[11px]">\n                        <span className="font-semibold text-ink">{acc.name}</span>\n                        <button onClick={() => removeIntegrationAccount(a.id, acc.id)} className="text-danger hover:underline">Remove</button>\n                      </div>\n                    ))}\n                    <Btn size="xs" icon={accounts.length > 0 ? "plus" : "plug"} onClick={() => setSelectedApp(a.id)}>\n                      {accounts.length > 0 ? "Connect another account" : "Connect"}\n                    </Btn>\n                  </div>\n                )}'
);

code = code.replace(
  'const { toast, setAppConnected } = useApp();',
  'const { toast, connectIntegrationAccount } = useApp();\n  const [accName, setAccName] = useState("");'
);

code = code.replace(
  'setAppConnected(appId);',
  'connectIntegrationAccount(appId, accName || "Default Account");'
);

code = code.replace(
  '{isOAuth ? (',
  '{isOAuth ? (\n        <div className="space-y-4">\n          <Field label="Account Nickname (e.g. My Airbnb, Business Stripe)">\n            <Input value={accName} onChange={e => setAccName(e.target.value)} placeholder="Main Account" />\n          </Field>'
);

code = code.replace(
  '<form onSubmit={handleConnect} className="space-y-4">',
  '<form onSubmit={handleConnect} className="space-y-4">\n          <Field label="Account Nickname">\n            <Input value={accName} onChange={e => setAccName(e.target.value)} placeholder="Main Account" />\n          </Field>'
);

fs.writeFileSync('src/modules/Integrations.tsx', code);
