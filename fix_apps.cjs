const fs = require('fs');
let code = fs.readFileSync('src/modules/Integrations.tsx', 'utf8');

code = code.replace(
  'const { toast } = useApp();',
  'const { toast, connectedApps, setAppConnected } = useApp();'
);

code = code.replace(
  '{g.items.map((a) => (',
  `{g.items.map((originalA) => {
              const a = { ...originalA, status: connectedApps.includes(originalA.id) ? "connected" : originalA.status };
              return (`
);

code = code.replace(
  /<\/Btn>\s*<\/div>\s*\)\)}\s*<\/div>\s*<\/div>\s*\)\)}/g,
  `</Btn>
                )}
              </div>
            )})}
          </div>
        </div>
      ))}`
);

code = code.replace(
  'const handleConnect = (e: React.FormEvent) => {',
  `const handleConnect = (e: React.FormEvent) => {
    const { setAppConnected } = useApp.getState();
    setAppConnected(appId);`
);

fs.writeFileSync('src/modules/Integrations.tsx', code);
