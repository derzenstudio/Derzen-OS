const fs = require('fs');
let code = fs.readFileSync('src/lib/platformStore.ts', 'utf8');

code = code.replace(
  `export type DevPlatformStore = {`,
  `export type DevPlatformStore = {\n  aiModels: Record<string, string>;\n  setAiModels: (models: Record<string, string>) => void;`
);

code = code.replace(
  `flags: initial.flags || PLATFORM_FLAGS,`,
  `aiModels: initial.aiModels || {},\n  flags: initial.flags || PLATFORM_FLAGS,`
);

code = code.replace(
  `setFlags: (flags) => {
    set({ flags });
    savePlatformState({ flags, registry: get().registry, announcements: get().announcements });
  },`,
  `setAiModels: (aiModels) => {
    set({ aiModels });
    savePlatformState({ aiModels, flags: get().flags, registry: get().registry, announcements: get().announcements });
  },
  setFlags: (flags) => {
    set({ flags });
    savePlatformState({ aiModels: get().aiModels, flags, registry: get().registry, announcements: get().announcements });
  },`
);

code = code.replace(
  `savePlatformState({ flags: get().flags, registry, announcements: get().announcements });`,
  `savePlatformState({ aiModels: get().aiModels, flags: get().flags, registry, announcements: get().announcements });`
);

code = code.replace(
  `savePlatformState({ flags: get().flags, registry: get().registry, announcements });`,
  `savePlatformState({ aiModels: get().aiModels, flags: get().flags, registry: get().registry, announcements });`
);

code = code.replace(
  `flags: remote.state.flags || s.flags,`,
  `aiModels: remote.state.aiModels || s.aiModels,\n        flags: remote.state.flags || s.flags,`
);

fs.writeFileSync('src/lib/platformStore.ts', code);
