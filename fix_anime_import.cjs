const fs = require('fs');

function patch(file) {
  let code = fs.readFileSync(file, 'utf8');
  code = code.replace(/import anime from "animejs";/g, 'import anime from "animejs/lib/anime.es.js";');
  fs.writeFileSync(file, code);
}

patch('src/components/ui.tsx');
patch('src/components/animations.tsx');
