const fs = require('fs');
let code = fs.readFileSync('src/modules/Calendar.tsx', 'utf8');

const regex = /\{\/\* Reservation bars \*\/}.*?<\/div>\s*<\/div>/s;

const replacement = `{/* Reservation bars */}
                      {!bulkMode && bars.map((b, i) => {
                        const res = b.resId ? reservations.find((x) => x.id === b.resId) : undefined;
                        return (
                          <button
                            key={i} onClick={() => b.resId && navigate(\`/reservations/\${b.resId}\`)}
                            onMouseEnter={(e) => {
                              if (!res) return;
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              const flip = rect.bottom + 230 > window.innerHeight;
                              setHover({
                                x: Math.min(rect.left, window.innerWidth - 300),
                                y: flip ? rect.top - 8 : rect.bottom + 6,
                                flip,
                                node: <ReservationHoverCard r={res} onOpen={() => { setHover(null); navigate(\`/reservations/\${res.id}\`); }} />,
                              });
                            }}
                            onMouseLeave={() => setHover(null)}
                            className={cx("absolute bottom-0 top-0 overflow-hidden text-left transition-all hover:z-10 hover:brightness-110", b.striped && "pat-stripes", b.hatch && "pat-hatch")}
                            style={{
                              left: b.left,
                              width: b.width,
                              background: b.color,
                              clipPath: b.clipPath,
                              opacity: 0.95
                            }}
                            aria-label={\`\${b.label}\${b.sub ? \`, \${b.sub}\` : ""}\`}
                          >
                            <div
                              className="absolute inset-y-0 flex flex-col justify-center overflow-hidden whitespace-nowrap text-white drop-shadow-sm"
                              style={{
                                left: b.textLeft,
                                right: b.textRight,
                                paddingLeft: b.dayUse ? 4 : (b.textLeft === 0 ? 34 : 8),
                                paddingRight: b.dayUse ? 4 : (b.textRight === 0 ? 34 : 8),
                              }}
                            >
                              <span className="text-[10.5px] font-bold leading-tight truncate">{b.label}</span>
                              {b.sub && <span className="text-[9px] opacity-90 truncate">{b.sub}</span>}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>`;

if (!regex.test(code)) {
  console.log('Regex did not match');
  process.exit(1);
}

fs.writeFileSync('src/modules/Calendar.tsx', code.replace(regex, replacement));
console.log('Patched correctly');
