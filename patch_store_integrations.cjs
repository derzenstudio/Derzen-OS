const fs = require('fs');
let code = fs.readFileSync('src/store.ts', 'utf8');

code = code.replace(
  'connectedApps: string[]; setAppConnected: (id: string) => void; devIntegrations: PlatformIntegration[];',
  'integrationAccounts: Record<string, { id: string; name: string; connectedAt: string }[]>;\n  connectIntegrationAccount: (appId: string, name: string) => void;\n  removeIntegrationAccount: (appId: string, accountId: string) => void;\n  devIntegrations: PlatformIntegration[];'
);

code = code.replace(
  'connectedApps: [], setAppConnected: (id) => set((st) => ({ connectedApps: [...st.connectedApps, id] })), checking: [],',
  `integrationAccounts: {},
  connectIntegrationAccount: (appId, name) => set((st) => {
    const accs = st.integrationAccounts[appId] || [];
    return { integrationAccounts: { ...st.integrationAccounts, [appId]: [...accs, { id: uid("acc"), name, connectedAt: new Date().toISOString() }] } };
  }),
  removeIntegrationAccount: (appId, accountId) => set((st) => {
    const accs = st.integrationAccounts[appId] || [];
    return { integrationAccounts: { ...st.integrationAccounts, [appId]: accs.filter(a => a.id !== accountId) } };
  }),
  checking: [],`
);

fs.writeFileSync('src/store.ts', code);
