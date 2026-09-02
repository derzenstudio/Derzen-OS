const icons = require('simple-icons');
const brands = ['Airbnb', 'Booking.com', 'Expedia', 'Vrbo', 'Agoda', 'Trip.com', 'MakeMyTrip', 'Traveloka', 'WhatsApp', 'Instagram', 'Messenger'];

const out = {};
for (const b of brands) {
  const key = b.replace(/[\.\- ]/g, '').toLowerCase();
  for (const name in icons) {
    if (icons[name].title.toLowerCase() === b.toLowerCase() || name.toLowerCase() === key || name.toLowerCase() === b.toLowerCase()) {
      out[key] = { path: icons[name].path, hex: icons[name].hex };
      break;
    }
  }
}
console.log(JSON.stringify(out, null, 2));
