const fs = require('fs');
let code = fs.readFileSync('src/modules/Calendar.tsx', 'utf8');

const regex = /\/\/ ── Bars for one row over the window ───────────────────────────────────────\ninterface Bar \{.*?\nexport function movementsOn\(/s;

const replacement = `// ── Bars for one row over the window ───────────────────────────────────────
interface Bar {
  left: number;
  width: number;
  color: string;
  label: string;
  sub?: string;
  kind: string;
  resId?: string;
  striped?: boolean;
  hatch?: boolean;
  isBlock: boolean;
  clipPath: string;
  textLeft: number;
  textRight: number;
  dayUse: boolean;
}

const idxOf = (key: string, windowStart: string) =>
  Math.round((+parseKey(key) - +parseKey(windowStart)) / 86_400_000);

function barsForRow(p: Property, windowStart: string, nights: number, reservations: Reservation[]): Bar[] {
  const windowEnd = dayKey(addDays(windowStart, nights));
  const out: Bar[] = [];
  
  for (const r of reservations) {
    if (r.propertyId !== p.id || r.kind !== "stay") continue;
    if (r.status === "cancelled" || r.status === "no_show") continue;
    if (!nightsInRange(r, windowStart, windowEnd)) continue;

    const dayUse = r.checkOut === r.checkIn;
    const pending = r.status === "pending" || r.status === "enquiry";
    
    let left, width, clipPath, textLeft, textRight;
    const rawLeft = idxOf(r.checkIn, windowStart) * COL_W;
    const rawRight = idxOf(r.checkOut, windowStart) * COL_W + COL_W;
    
    if (dayUse) {
      left = rawLeft + 4;
      width = COL_W - 8;
      clipPath = "none";
      textLeft = 0;
      textRight = 0;
    } else {
      left = rawLeft;
      width = rawRight - rawLeft;
      clipPath = \`polygon(0 0, calc(100% - \${COL_W}px) 0, 100% 100%, \${COL_W}px 100%)\`;
      textLeft = Math.max(0, -left);
      textRight = Math.max(0, (left + width) - (nights * COL_W));
    }

    out.push({
      resId: r.id,
      left, width, clipPath, textLeft, textRight, dayUse,
      color: channelDef(r.channel).color,
      label: \`\${propertyById(r.propertyId).code} · \${dayUse ? "day use" : r.status === "checked_in" ? "in house" : "arrives " + fmtShort(r.checkIn)}\`,
      sub: r.ref, kind: pending ? "pending" : "confirmed", striped: pending, isBlock: false,
    });
  }

  for (const b of BLOCKS) {
    if (b.propertyId !== p.id || !nightsInRange({ ...({} as Reservation), checkIn: b.checkIn, checkOut: b.checkOut }, windowStart, windowEnd)) continue;
    
    const dayUse = b.checkIn === b.checkOut;
    let left, width, clipPath, textLeft, textRight;
    const rawLeft = idxOf(b.checkIn, windowStart) * COL_W;
    const rawRight = idxOf(b.checkOut, windowStart) * COL_W + COL_W;

    if (dayUse) {
      left = rawLeft + 4;
      width = COL_W - 8;
      clipPath = "none";
      textLeft = 0;
      textRight = 0;
    } else {
      left = rawLeft;
      width = rawRight - rawLeft;
      clipPath = \`polygon(0 0, calc(100% - \${COL_W}px) 0, 100% 100%, \${COL_W}px 100%)\`;
      textLeft = Math.max(0, -left);
      textRight = Math.max(0, (left + width) - (nights * COL_W));
    }

    out.push({
      left, width, clipPath, textLeft, textRight, dayUse,
      color: b.type === "manual" ? "#000000" : b.type === "owner" ? "#8A978A" : "#C07F14",
      label: b.label, kind: b.type, hatch: b.type === "owner", striped: b.type === "hold", isBlock: true,
    });
  }
  
  return out.sort((a, b) => a.left - b.left || a.width - b.width);
}

export function movementsOn(`;

if (!regex.test(code)) {
  console.log('Regex did not match');
  process.exit(1);
}

fs.writeFileSync('src/modules/Calendar.tsx', code.replace(regex, replacement));
console.log('Patched correctly');
