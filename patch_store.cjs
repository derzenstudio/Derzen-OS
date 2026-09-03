const fs = require('fs');
let code = fs.readFileSync('src/store.ts', 'utf8');

const pullCode = `
// Boot restore: layer the customer's saved workspace over the empty scaffold.
if (bootCustomer) {
  tenantPersisted = true;
  applyStoredSlice(bootCustomer.tenantId);
  // Pull latest from server in background
  import("./lib/tenantPersist").then((m) => {
    m.pullTenantState(bootCustomer!.tenantId).then((remote) => {
      if (remote) {
        try {
          const raw = localStorage.getItem("derzen.tenant." + bootCustomer!.tenantId + ".v1");
          const localTs = raw ? JSON.parse(raw).savedAt : 0;
          if (remote.savedAt > localTs) {
             useApp.setState(remote.slice as Partial<App>);
             syncModulesFromSlice(remote.slice as Record<string, unknown>);
          }
        } catch { /* ignore */ }
      }
    });
  });
}
`;

code = code.replace(
  `// Boot restore: layer the customer's saved workspace over the empty scaffold.
if (bootCustomer) {
  tenantPersisted = true;
  applyStoredSlice(bootCustomer.tenantId);
}`,
  pullCode
);

fs.writeFileSync('src/store.ts', code);
