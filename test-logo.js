const fs = require('fs');
fs.writeFileSync('test.svg', `<svg width="100" height="100" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <mask id="derzen-logo-mask">
    <rect width="24" height="24" fill="white" />
    <circle cx="12" cy="13" r="3.6" fill="black" />
    <path d="M10.2 14.5 Q 10.2 16.5 10 18 L 10 22.5 L 14 22.5 L 14 18 Q 13.8 16.5 13.8 14.5 Z" fill="black" />
  </mask>
  <path d="M12 1 L23.5 22.5 L0.5 22.5 Z" fill="black" mask="url(#derzen-logo-mask)" />
</svg>`);
