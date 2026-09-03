const fs = require('fs');
let code = fs.readFileSync('src/modules/Integrations.tsx', 'utf8');

code = code.replace(
`{a.status !== "connected" && a.status === "waitlist" && (
                  <Btn size="xs" className="mt-2" icon="clock" onClick={() => toast("info", "Added to waitlist", "We will email you when this is ready.")}>Join waitlist</Btn>
                )}
                {a.status === "available" && (
                  <div className="mt-2 space-y-2">
                    {accounts.map(acc => (
                      <div key={acc.id} className="flex items-center justify-between bg-paper px-2 py-1.5 rounded text-[11px]">
                        <span className="font-semibold text-ink">{acc.name}</span>
                        <button onClick={() => removeIntegrationAccount(a.id, acc.id)} className="text-danger hover:underline">Remove</button>
                      </div>
                    ))}
                    <Btn size="xs" icon={accounts.length > 0 ? "plus" : "plug"} onClick={() => setSelectedApp(a.id)}>
                      {accounts.length > 0 ? "Connect another account" : "Connect"}
                    </Btn>
                  </div>
                )}
                  <Btn size="xs" className="mt-2" icon={a.status === "available" ? "plug" : "clock"} onClick={() => a.status === "available" && a.id ? setSelectedApp(a.id) : toast("info", "Added to waitlist", "We will email you when this is ready.")}>
                    {a.status === "available" ? "Connect" : "Join waitlist"}
                  </Btn>
                )}`,
`{a.status === "waitlist" && (
                  <Btn size="xs" className="mt-2" icon="clock" onClick={() => toast("info", "Added to waitlist", "We will email you when this is ready.")}>Join waitlist</Btn>
                )}
                {a.status !== "waitlist" && (
                  <div className="mt-2 space-y-2">
                    {accounts.map(acc => (
                      <div key={acc.id} className="flex items-center justify-between bg-paper px-2 py-1.5 rounded text-[11px]">
                        <span className="font-semibold text-ink">{acc.name}</span>
                        <button onClick={() => removeIntegrationAccount(a.id, acc.id)} className="text-danger hover:underline">Remove</button>
                      </div>
                    ))}
                    <Btn size="xs" icon={accounts.length > 0 ? "plus" : "plug"} onClick={() => setSelectedApp(a.id)}>
                      {accounts.length > 0 ? "Connect another account" : "Connect"}
                    </Btn>
                  </div>
                )}`
);

fs.writeFileSync('src/modules/Integrations.tsx', code);
