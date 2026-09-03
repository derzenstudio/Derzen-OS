const fs = require('fs');

function patch(file) {
  let code = fs.readFileSync(file, 'utf8');
  
  // replace the incorrect v3 imports
  code = code.replace(/import anime from "animejs\/lib\/anime.es.js";/g, '');
  code = code.replace(/import anime from "animejs";/g, '');
  
  // add the v4 import at the top
  if (file === 'src/components/ui.tsx') {
    code = code.replace(
      'import { cx } from "../lib/format";',
      'import { cx } from "../lib/format";\nimport { animate } from "animejs";'
    );
  } else if (file === 'src/components/animations.tsx') {
    code = code.replace(
      'import { cx } from "../lib/format";',
      'import { cx } from "../lib/format";\nimport { animate, stagger } from "animejs";'
    );
  }

  // replace anime({ ... }) with animate(el, { ... }) ?
  // Wait! Actually animate() signature is animate(targets, params)
  
  // Let's replace anime({ targets: el, ...params }) with animate(el, { ...params })
  // In `ui.tsx`:
  code = code.replace(/anime\(\{\s*targets:\s*overlayRef\.current,/g, 'animate(overlayRef.current, {');
  code = code.replace(/anime\(\{\s*targets:\s*contentRef\.current,/g, 'animate(contentRef.current, {');
  code = code.replace(/anime\(\{\s*targets:\s*ref\.current,/g, 'animate(ref.current, {');
  
  // In `animations.tsx`:
  code = code.replace(/anime\(\{\s*targets:\s*el,/g, 'animate(el, {');
  code = code.replace(/anime\(\{\s*targets:\s*chars,/g, 'animate(chars, {');
  code = code.replace(/anime\(\{\s*targets:\s*items,/g, 'animate(items, {');
  
  // replace anime.stagger with stagger
  code = code.replace(/anime\.stagger/g, 'stagger');
  
  fs.writeFileSync(file, code);
}

patch('src/components/ui.tsx');
patch('src/components/animations.tsx');
