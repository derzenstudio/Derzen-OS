import type { ReactNode } from "react";

// Every glyph is hand-set inline SVG, 24×24 stroke grid.
const P: Record<string, ReactNode> = {
  grid: <><rect x="3" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="3" width="7.5" height="7.5" rx="1.5" /><rect x="3" y="13.5" width="7.5" height="7.5" rx="1.5" /><rect x="13.5" y="13.5" width="7.5" height="7.5" rx="1.5" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  inbox: <><path d="M3 13l3.5-8h11L21 13v6a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 19.5z" /><path d="M3 13h5l1.5 2.5h5L16 13h5" /></>,
  sparkle: <><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z" /><path d="M18.5 15.5l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" /></>,
  ticket: <><path d="M3 8a2 2 0 0 0 2-2h14a2 2 0 0 0 2 2v3a2 2 0 0 0 0 2v3a2 2 0 0 0-2 2H5a2 2 0 0 0-2-2v-3a2 2 0 0 0 0-2z" /><path d="M14 6v2.2M14 11v2M14 15.8V18" strokeDasharray="0.1 3.4" /></>,
  wrench: <path d="M14.5 6.5a4 4 0 0 0-5.4 4.8L3.5 17a2 2 0 1 0 2.8 2.8l5.7-5.6a4 4 0 0 0 4.8-5.4L14 11.5l-2.5-.7-.7-2.5z" />,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c.5-3.4 2.7-5.2 5.5-5.2s5 1.8 5.5 5.2" /><path d="M15.5 5.2a3.2 3.2 0 0 1 0 5.9M17 14.9c2 .6 3.2 2.3 3.5 5.1" /></>,
  star: <path d="M12 3.5l2.6 5.3 5.9.9-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.9z" />,
  book: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" /><path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5" /><path d="M9 8h7M9 12h5" /></>,
  home: <><path d="M4 11l8-7 8 7" /><path d="M6 9.5V20h4.5v-5h3v5H18V9.5" /></>,
  plug: <><path d="M9 3v5M15 3v5" /><path d="M6 8h12v3a6 6 0 0 1-12 0z" /><path d="M12 17v4" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.8 2.5 4 5.5 4 9s-1.2 6.5-4 9c-2.8-2.5-4-5.5-4-9s1.2-6.5 4-9z" /></>,
  chart: <><path d="M4 4v16h16" /><path d="M8 16v-5M12 16V7M16 16v-3M20 16V5" /></>,
  gear: <><circle cx="12" cy="12" r="3" /><path d="M12 2.5l1.2 2.7 2.9-.7 1 2.8 2.9.6-.6 2.9 2 2.2-2 2.2.6 2.9-2.9.6-1 2.8-2.9-.7L12 21.5l-1.2-2.7-2.9.7-1-2.8-2.9-.6.6-2.9-2-2.2 2-2.2-.6-2.9 2.9-.6 1-2.8 2.9.7z" /></>,
  bolt: <path d="M13 2L4.5 13.5H11L9.5 22 19 10h-6.5z" />,
  refresh: <><path d="M20 11a8 8 0 0 0-14.9-3M4 13a8 8 0 0 0 14.9 3" /><path d="M20 4v4h-4M4 20v-4h4" /></>,
  chat: <path d="M21 12a8.5 8.5 0 0 1-12.4 7.5L3 21l1.6-5.4A8.5 8.5 0 1 1 21 12z" />,
  send: <><path d="M21 3L10.5 13.5" /><path d="M21 3l-7 18-3.5-7.5L3 10z" /></>,
  search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="M15.5 15.5L21 21" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  x: <path d="M6 6l12 12M18 6L6 18" />,
  check: <path d="M4.5 12.5l5 5L19.5 7" />,
  checkCircle: <><circle cx="12" cy="12" r="9" /><path d="M8 12.5l2.7 2.7L16.5 9" /></>,
  alertTri: <><path d="M12 3.5L2.5 20h19z" /><path d="M12 10v4.5M12 17.4v.2" /></>,
  alertCirc: <><circle cx="12" cy="12" r="9" /><path d="M12 7.5V13M12 16.4v.2" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.6v.2" /></>,
  download: <><path d="M12 3v11M7.5 10.5L12 15l4.5-4.5" /><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" /></>,
  upload: <><path d="M12 15V4M7.5 8.5L12 4l4.5 4.5" /><path d="M4 17v2.5A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5V17" /></>,
  filter: <path d="M3 5h18l-7 8v5.5L10 21v-8z" />,
  chevL: <path d="M14.5 5.5L8 12l6.5 6.5" />,
  chevR: <path d="M9.5 5.5L16 12l-6.5 6.5" />,
  chevD: <path d="M5.5 9.5L12 16l6.5-6.5" />,
  chevU: <path d="M5.5 14.5L12 8l6.5 6.5" />,
  grip: <><circle cx="9" cy="6" r="1.1" fill="currentColor" stroke="none" /><circle cx="15" cy="6" r="1.1" fill="currentColor" stroke="none" /><circle cx="9" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="15" cy="12" r="1.1" fill="currentColor" stroke="none" /><circle cx="9" cy="18" r="1.1" fill="currentColor" stroke="none" /><circle cx="15" cy="18" r="1.1" fill="currentColor" stroke="none" /></>,
  pin: <><path d="M12 21s7-6.1 7-11.5A7 7 0 0 0 5 9.5C5 14.9 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5.2l3.4 2" /></>,
  phone: <path d="M5 4h4l1.5 4.5-2.2 1.6a12 12 0 0 0 5.6 5.6l1.6-2.2L20 15v4a1.8 1.8 0 0 1-2 1.8A16.5 16.5 0 0 1 3.2 6 1.8 1.8 0 0 1 5 4z" />,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3.5 7l8.5 6 8.5-6" /></>,
  whatsapp: <><path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.4-1.1A8.5 8.5 0 1 0 12 3.5z" /><path d="M9 8.5c-.5 2.5 3.5 6.5 6.2 6.4l.8-1.6-2-1.2-.9.7c-.9-.5-1.6-1.2-2-2.1l.8-.8-1.3-2z" /></>,
  clip: <path d="M8.5 12.5l6-6a2.5 2.5 0 0 1 3.5 3.5l-7.5 7.5a4.5 4.5 0 0 1-6.4-6.4L12 3.7" />,
  pencil: <><path d="M4 20l.8-3.5L16.5 4.8a2 2 0 0 1 2.8 0l-.1-.1a2 2 0 0 1 0 2.8L7.5 19.2z" /><path d="M14.5 6.8l2.7 2.7" /></>,
  trash: <><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" /><path d="M6.5 7l1 13h9l1-13" /><path d="M10 11v5M14 11v5" /></>,
  copy: <><rect x="9" y="9" width="12" height="12" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
  external: <><path d="M14 4h6v6" /><path d="M20 4L11 13" /><path d="M19 14v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M4 4l16 16" /><path d="M9.9 5.9A9.4 9.4 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17.5 17.5 0 0 1-3 3.7M6.1 8.3A16.8 16.8 0 0 0 2.5 12S6 18.5 12 18.5a9.3 9.3 0 0 0 3.5-.7" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="1.8" /><path d="M4 18l5.5-5 3.5 3 3-2.5L21 17" /></>,
  palette: <><path d="M12 3a9 9 0 1 0 0 18c1.5 0 2-.8 2-1.8 0-.8-.5-1.2-.5-2 0-1 .8-1.7 2-1.7H17a4 4 0 0 0 4-4c0-4.5-4-8.5-9-8.5z" /><circle cx="7.5" cy="11" r="1" fill="currentColor" stroke="none" /><circle cx="10.5" cy="7" r="1" fill="currentColor" stroke="none" /><circle cx="15" cy="7.5" r="1" fill="currentColor" stroke="none" /></>,
  droplet: <path d="M12 3c3.5 4.2 6 7.4 6 10.5a6 6 0 0 1-12 0C6 10.4 8.5 7.2 12 3z" />,
  bag: <><path d="M6 8h12l1.2 12.5H4.8z" /><path d="M9 10V6.5a3 3 0 0 1 6 0V10" /></>,
  tag: <><path d="M3 11V4a1 1 0 0 1 1-1h7l10 10-8 8z" /><circle cx="8" cy="8" r="1.4" /></>,
  card: <><rect x="2.5" y="5" width="19" height="14" rx="2" /><path d="M2.5 9.5h19M6 14.5h4" /></>,
  shield: <><path d="M12 3l7.5 3v5.5c0 5-3.2 8-7.5 9.5-4.3-1.5-7.5-4.5-7.5-9.5V6z" /><path d="M8.8 12l2.2 2.2 4.2-4.4" /></>,
  bell: <><path d="M6 9.5a6 6 0 0 1 12 0c0 5 1.8 6 1.8 6H4.2S6 14.5 6 9.5z" /><path d="M10 19a2.2 2.2 0 0 0 4 0" /></>,
  arrowR: <path d="M4 12h16M13 5l7 7-7 7" />,
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  list: <><path d="M9 6h12M9 12h12M9 18h12" /><circle cx="4.5" cy="6" r="1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="4.5" cy="18" r="1" fill="currentColor" stroke="none" /></>,
  kanban: <><rect x="3" y="4" width="5.5" height="16" rx="1" /><rect x="9.5" y="4" width="5.5" height="10" rx="1" /><rect x="16" y="4" width="5" height="13" rx="1" /></>,
  layers: <><path d="M12 3l9 5-9 5-9-5z" /><path d="M3 13l9 5 9-5M3 17.5l9 5 9-5" strokeOpacity=".55" /></>,
  camera: <><path d="M4 8h3l1.5-2.5h7L17 8h3a1.5 1.5 0 0 1 1.5 1.5V19a1.5 1.5 0 0 1-1.5 1.5H4A1.5 1.5 0 0 1 2.5 19V9.5A1.5 1.5 0 0 1 4 8z" /><circle cx="12" cy="13.5" r="3.5" /></>,
  flag: <><path d="M5 21V4" /><path d="M5 4.5c4-2 7 2 11 0v9c-4 2-7-2-11 0" /></>,
  undo: <><path d="M8 5L3.5 9.5 8 14" /><path d="M3.5 9.5H15a5.5 5.5 0 0 1 0 11h-4" /></>,
  play: <path d="M7 4.5l12 7.5-12 7.5z" />,
  pause: <path d="M8 5v14M16 5v14" />,
  link: <><path d="M10 14a4.5 4.5 0 0 0 6.4.4l2.6-2.6a4.5 4.5 0 0 0-6.4-6.4l-1.4 1.4" /><path d="M14 10a4.5 4.5 0 0 0-6.4-.4L5 12.2a4.5 4.5 0 0 0 6.4 6.4l1.4-1.4" /></>,
  wifi: <><path d="M2.5 9a14 14 0 0 1 19 0M5.5 12.5a10 10 0 0 1 13 0M8.5 16a5.5 5.5 0 0 1 7 0" /><circle cx="12" cy="19.5" r="1" fill="currentColor" stroke="none" /></>,
  key: <><circle cx="8" cy="15.5" r="4.5" /><path d="M11.5 12.5L20 4M16.5 7.5l2.5 2.5M14 10l2 2" /></>,
  door: <><rect x="5" y="3" width="14" height="18" rx="1.5" /><circle cx="15" cy="12" r="1" fill="currentColor" stroke="none" /><path d="M5 21h14" /></>,
  doc: <><path d="M6 2.5h8L19 8v13.5H6z" /><path d="M13.5 3v5H19" /><path d="M9 12h6M9 15.5h6" /></>,
  folder: <path d="M3 6.5A1.5 1.5 0 0 1 4.5 5h5l2 2.5h8A1.5 1.5 0 0 1 21 9v9.5a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5z" />,
  receipt: <><path d="M5 3h14v18l-2.3-1.5L14.4 21l-2.4-1.5L9.6 21l-2.3-1.5L5 21z" /><path d="M9 8h6M9 12h6" /></>,
  bank: <><path d="M3 9l9-5.5L21 9" /><path d="M4.5 9v9M9.5 9v9M14.5 9v9M19.5 9v9M3 18h18M2.5 21h19" /></>,
  quote: <><path d="M5 5h6v6c0 3-1.5 5-5 6l-1-2c1.8-.8 2.5-1.8 2.5-4H5z" /><path d="M14 5h6v6c0 3-1.5 5-5 6l-1-2c1.8-.8 2.5-1.8 2.5-4h-2.5z" /></>,
  msg: <path d="M4 5h16v11H9l-5 4z" />,
  more: <><circle cx="12" cy="5.5" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /><circle cx="12" cy="18.5" r="1.2" fill="currentColor" stroke="none" /></>,
  heart: <path d="M12 20.5S3.5 15.5 3.5 9.3A4.6 4.6 0 0 1 12 6.7a4.6 4.6 0 0 1 8.5 2.6c0 6.2-8.5 11.2-8.5 11.2z" />,
  translate: <><path d="M3 5h10M8 3v2M4.5 5c.5 4.5 3.5 8 8 9.5M11 5c-1 5-4 8.5-8 10" /><path d="M13 21l4-9.5L21 21M14.2 18h5.6" /></>,
  code: <path d="M8 6l-6 6 6 6M16 6l6 6-6 6M13.5 4l-3 16" />,
  webhook: <><circle cx="6" cy="17" r="2.5" /><circle cx="18" cy="17" r="2.5" /><circle cx="12" cy="6" r="2.5" /><path d="M13.5 8l4 6.5M10.5 8l-4 6.5M8.5 17h7" /></>,
  puzzle: <path d="M9 4h6v3.5a2 2 0 1 0 3 1.7V13h-3.5a2 2 0 1 1-1.7 3H9v-3.5a2 2 0 1 0-3-1.7V7h3.5A2 2 0 1 1 9 4z" transform="translate(0,1.5)" />,
  sliders: <><path d="M5 4v6M5 14v6M12 4v2M12 10v10M19 4v10M19 18v2" /><circle cx="5" cy="12" r="2" /><circle cx="12" cy="8" r="2" /><circle cx="19" cy="16" r="2" /></>,
  target: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" /></>,
  trendUp: <><path d="M3 17l6-6 4 4 8-8" /><path d="M15 7h6v6" /></>,
  trendDown: <><path d="M3 7l6 6 4-4 8 8" /><path d="M15 17h6v-6" /></>,
  coins: <><ellipse cx="9" cy="7" rx="6" ry="3" /><path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7" /><path d="M3 12v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5M21 9.5V15c0 1.2-1.4 2.2-3.5 2.7" /></>,
  wallet: <><path d="M3 7a2 2 0 0 1 2-2h13v3" /><path d="M3 7v11a2 2 0 0 0 2 2h16V8H5a2 2 0 0 1-2-1z" /><circle cx="16.5" cy="14" r="1.2" fill="currentColor" stroke="none" /></>,
  userPlus: <><circle cx="10" cy="8" r="3.5" /><path d="M4 20c.6-3.6 3-5.5 6-5.5s5.4 1.9 6 5.5" /><path d="M18.5 6.5v5M16 9h5" /></>,
  archive: <><rect x="3" y="4" width="18" height="5" rx="1" /><path d="M5 9v10.5h14V9" /><path d="M10 13h4" /></>,
  map: <><path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2z" /><path d="M9 4v14M15 6v14" /></>,
  nav: <path d="M12 3l8 18-8-4-8 4z" />,
  bed: <><path d="M3 18V7" /><path d="M3 14h18v4M3 11h18v3" /><path d="M6.5 11V9.5A1.5 1.5 0 0 1 8 8h3v3" /><circle cx="17" cy="9" r="0" /></>,
  bath: <><path d="M4 12h16v2a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5z" /><path d="M6 12V5.5A1.5 1.5 0 0 1 7.5 4h1A1.5 1.5 0 0 1 10 5.5M7 21l-1 1.5M17 21l1 1.5" /></>,
  calc: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8.5 7h7" /><path d="M8.5 12h.2M12 12h.2M15.5 12h.2M8.5 15.5h.2M12 15.5h.2M15.5 15.5h.2M8.5 12v.2M8.5 15.5v.2" /></>,
  history: <><path d="M3.5 12a8.5 8.5 0 1 1 2.5 6M3.5 12H3M3.5 12l-1 3" transform="translate(1,0)" /><path d="M12 8v4.5l3 2" /></>,
  zap: <path d="M13 2L4.5 13.5H11L9.5 22 19 10h-6.5z" />,
  dot: <circle cx="12" cy="12" r="5" fill="currentColor" stroke="none" />,
  moon: <path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z" />,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19" /></>,
  terminal: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 9l3 3-3 3M12.5 15H17" /></>,
  satellite: <><circle cx="12" cy="12" r="3" /><path d="M12 5V3M12 21v-2M5 12H3M21 12h-2" /><path d="M12 8.5a3.5 3.5 0 0 1 3.5 3.5" strokeOpacity=".6" /></>,
  lifeBuoy: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" /><path d="M5.7 5.7l3.5 3.5M14.8 14.8l3.5 3.5M18.3 5.7l-3.5 3.5M9.2 14.8l-3.5 3.5" /></>,
  toggle: <><rect x="2.5" y="7" width="19" height="10" rx="5" /><circle cx="16.5" cy="12" r="3.2" /></>,
};

export type IconName = keyof typeof P;

export function Ic({
  name,
  size = 16,
  className,
  sw = 1.7,
}: {
  name: IconName;
  size?: number;
  className?: string;
  sw?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={sw}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {P[name]}
    </svg>
  );
}
