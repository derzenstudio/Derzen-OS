const icons = require('simple-icons');
const brands = ['vrbo', 'agoda', 'makemytrip', 'traveloka', 'trip'];
const out = {};
for (const b of brands) {
  for (const name in icons) {
    if (name.toLowerCase().includes(b)) {
      out[name] = { title: icons[name].title, hex: icons[name].hex, path: icons[name].path };
    }
  }
}
console.log(JSON.stringify(out, null, 2));
