const fs = require('fs');
let code = fs.readFileSync('src/store.ts', 'utf8');

const badBlock = `      newGuest = {
        id: "g-chat", name: "Walk-in guest (chatbot)", emails: [], phones: [], country: "Unknown",
        status: "active", lastActivityTs: Date.now(), lastSource: "web", lifetimeSpend: 0,
        tags: ["chatbot"], notes: "Created by the embedded concierge widget.", consentMarketing: false,
        aliases: [], verifiedId: false,
      } as any;
      //
        id: "g-chat", name: "Walk-in guest (chatbot)", emails: [], phones: [], country: "Unknown",
        status: "active", lastActivityTs: Date.now(), lastSource: "web", lifetimeSpend: 0,
        tags: ["chatbot"], notes: "Created by the embedded concierge widget.", consentMarketing: false,
        aliases: [], verifiedId: false,
      };`;

const correctBlock = `      newGuest = {
        id: "g-chat", name: "Walk-in guest (chatbot)", emails: [], phones: [], country: "Unknown",
        status: "active", lastActivityTs: Date.now(), lastSource: "web", lifetimeSpend: 0,
        tags: ["chatbot"], notes: "Created by the embedded concierge widget.", consentMarketing: false,
        aliases: [], verifiedId: false,
      } as any;`;

code = code.replace(badBlock, correctBlock);
fs.writeFileSync('src/store.ts', code);
