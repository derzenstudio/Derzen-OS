const fs = require('fs');
let code = fs.readFileSync('src/modules/Public.tsx', 'utf8');

code = 'import { PaymentModal } from "../components/PaymentModal";\n' + code;

fs.writeFileSync('src/modules/Public.tsx', code);
