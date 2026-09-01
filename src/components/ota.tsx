// OTA brand marks — simplified monograms in each network's real brand colour.
// Used wherever a channel is surfaced: marquee, inbox, matrix, wizard, threads.

export function ChannelMark({ id, size = 22 }: { id: string; size?: number }) {
  const s = { width: size, height: size };
  switch (id) {
    case "airbnb": // Bélo — #FF385C
      return (
        <svg viewBox="0 0 24 24" style={s} aria-label="Airbnb" role="img">
          <path
            d="M12 3.2c.9 0 1.7.5 2.1 1.4l4.6 9.9c.5 1 .7 1.9.7 2.7 0 2-1.6 3.6-3.7 3.6-1.5 0-2.8-.8-3.7-2.2-.9 1.4-2.2 2.2-3.7 2.2C6.2 20.8 4.6 19.2 4.6 17.2c0-.8.2-1.7.7-2.7l4.6-9.9c.4-.9 1.2-1.4 2.1-1.4Zm0 5.1-2.6 5.7c-.4.8-.6 1.5-.6 2 0 1 .8 1.8 1.7 1.8.8 0 1.5-.6 1.5-1.7 0-1.2 0-2.9 0-7.8Zm0 0v7.8c0 1.1.7 1.7 1.5 1.7.9 0 1.7-.8 1.7-1.8 0-.5-.2-1.2-.6-2L12 8.3Z"
            fill="#FF385C"
          />
        </svg>
      );
    case "booking": // B. — #003B95
      return (
        <svg viewBox="0 0 24 24" style={s} aria-label="Booking.com" role="img">
          <path d="M6 4h6.2c2.6 0 4.3 1.2 4.3 3.4 0 1.4-.8 2.5-2 2.9 1.6.4 2.6 1.6 2.6 3.2 0 2.5-1.9 3.9-4.7 3.9H6V4Zm3 2.6v2.8h2.7c1.1 0 1.8-.6 1.8-1.4 0-.9-.7-1.4-1.8-1.4H9Zm0 5.3v3h3.2c1.2 0 1.9-.6 1.9-1.5s-.7-1.5-1.9-1.5H9Z" fill="#003B95" />
          <circle cx="17.6" cy="16.2" r="1.6" fill="#003B95" />
        </svg>
      );
    case "vrbo": // chevrons — #245ABC + #FFC72C
      return (
        <svg viewBox="0 0 24 24" style={s} aria-label="Vrbo" role="img">
          <path d="M3 5l5.5 14L12 10.5 15.5 19 21 5h-3.4L15 11.8 12 4.5 9 11.8 6.4 5H3Z" fill="#245ABC" />
          <path d="M12 14.5l1.8 4.5h-3.6L12 14.5Z" fill="#FFC72C" />
        </svg>
      );
    case "expedia": // e in circle — #142038 / #FCD116
      return (
        <svg viewBox="0 0 24 24" style={s} aria-label="Expedia" role="img">
          <circle cx="12" cy="12" r="9.5" fill="#142038" />
          <path d="M16.8 12.6H9.4c.2 1.5 1.2 2.4 2.7 2.4 1 0 1.8-.4 2.4-1.1l1.9 1.3c-1 1.2-2.5 1.9-4.4 1.9-3 0-5-1.9-5-4.9s2-5 4.9-5c2.8 0 4.9 2 4.9 4.8v.6Zm-2.4-1.7c-.2-1.3-1.1-2.1-2.4-2.1-1.3 0-2.2.8-2.4 2.1h4.8Z" fill="#FCD116" />
        </svg>
      );
    case "agoda": // lowercase a — #68348F
      return (
        <svg viewBox="0 0 24 24" style={s} aria-label="Agoda" role="img">
          <path d="M12.3 5.5c3 0 5 2 5 5.1v7.9h-2.7v-1.5c-.7 1-1.9 1.7-3.4 1.7-2.3 0-4-1.5-4-3.7 0-2.4 1.9-3.7 5-3.7h2.4v-.6c0-1.6-1-2.6-2.5-2.6-1.3 0-2.3.6-2.8 1.6l-2.4-1.2c.9-1.8 2.9-3 5.4-3Zm-.9 7c-1.4 0-2.3.6-2.3 1.6s.8 1.6 2 1.6c1.6 0 2.9-1 2.9-2.7v-.5h-2.6Z" fill="#68348F" />
        </svg>
      );
    case "trip": // T with swoosh — #287DFA
      return (
        <svg viewBox="0 0 24 24" style={s} aria-label="Trip.com" role="img">
          <path d="M4 5h16v3.4h-6.3V20h-3.4V8.4H4V5Z" fill="#287DFA" />
          <path d="M4.5 17.5c3.5 1.6 8 1.9 11.5.6" stroke="#F5A623" strokeWidth="1.8" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "mmt": // mmt — #0F4C9C / #E42529
      return (
        <svg viewBox="0 0 24 24" style={s} aria-label="MakeMyTrip" role="img">
          <path d="M3 9.5h2.4l2.3 5.6 2.3-5.6h2.2v9h-2.2v-4.9l-1.7 4.1h-1.3l-1.7-4.1v4.9H3v-9Z" fill="#0F4C9C" />
          <path d="M14 9.5h2.2v1.2c.4-.9 1.2-1.4 2.3-1.4.6 0 1.1.1 1.5.4v2.4c-.5-.3-1.1-.4-1.7-.4-1.2 0-2.1.8-2.1 2.3v4.5H14v-9Z" fill="#E42529" />
        </svg>
      );
    case "traveloka": // bird t — #0194F3
      return (
        <svg viewBox="0 0 24 24" style={s} aria-label="Traveloka" role="img">
          <path d="M13.2 4c-3.6 1-6 3.6-6.6 7.2-.3 1.8 0 3.5.6 5-.6-.2-1.4-.7-2.2-1.6 1 3.3 3.5 5.4 6.9 5.4 4.3 0 7.4-3.4 7.4-8.2C19.3 7 16.8 4.4 13.2 4Zm-.5 3.3c.5 0 .9.4.9.9s-.4.9-.9.9-.9-.4-.9-.9.4-.9.9-.9Z" fill="#0194F3" />
          <path d="M7.5 11.5c1.8.4 3.9.4 5.9-.1" stroke="#fff" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "ical": // calendar glyph — ink
      return (
        <svg viewBox="0 0 24 24" style={s} aria-label="iCal feed" role="img" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="3.5" y="5" width="17" height="15.5" rx="1.5" />
          <path d="M3.5 9.5h17M8 3v4M16 3v4" strokeLinecap="round" />
          <circle cx="12" cy="14.5" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "direct": // derzen house — brand green
      return (
        <svg viewBox="0 0 24 24" style={s} aria-label="Direct booking" role="img">
          <path d="M12 3.5 3.5 10v10.5h6v-6h5v6h6V10L12 3.5Z" fill="#0E6B4E" />
          <path d="M9.5 14.5h5" stroke="#8FE3BF" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
      );
    case "whatsapp": // phone-in-bubble — #25D366
      return (
        <svg viewBox="0 0 24 24" style={s} aria-label="WhatsApp" role="img">
          <path d="M12 3a9 9 0 0 0-7.7 13.6L3 21l4.5-1.2A9 9 0 1 0 12 3Z" fill="#25D366" />
          <path d="M9 7.5c-.4 0-.9.2-1.1.8-.3.7-.2 2 .9 3.6 1.1 1.6 2.6 2.8 4.3 3.3.9.3 1.6.2 2.1-.2l.5-.6c.2-.3.1-.6-.2-.8l-1.3-.8c-.3-.2-.6-.1-.8.1l-.4.4c-.6-.2-1.9-1.2-2.3-2.2l.4-.4c.2-.2.3-.5.1-.8l-.8-1.3c-.2-.3-.5-.5-.8-.5l-.6-.1Z" fill="#fff" />
        </svg>
      );
    case "instagram": // camera glyph — gradient ring
      return (
        <svg viewBox="0 0 24 24" style={s} aria-label="Instagram" role="img" fill="none">
          <rect x="3.5" y="3.5" width="17" height="17" rx="5" stroke="#E1306C" strokeWidth="2" />
          <circle cx="12" cy="12" r="4" stroke="#E1306C" strokeWidth="2" />
          <circle cx="17" cy="7" r="1.3" fill="#E1306C" />
        </svg>
      );
    case "messenger": // speech-bolt — #0084FF
      return (
        <svg viewBox="0 0 24 24" style={s} aria-label="Messenger" role="img">
          <path d="M12 3C6.9 3 2.8 6.8 2.8 11.6c0 2.7 1.3 5 3.4 6.6v3.1l3.1-1.7c.9.2 1.8.4 2.7.4 5.1 0 9.2-3.8 9.2-8.6S17.1 3 12 3Z" fill="#0084FF" />
          <path d="M6.5 14.2l3.2-3.4 2.6 2 3.8-2-3.2 3.4-2.6-2-3.8 2Z" fill="#fff" />
        </svg>
      );
    case "email": // envelope — slate
      return (
        <svg viewBox="0 0 24 24" style={s} aria-label="Email" role="img" fill="none" stroke="#5C6357" strokeWidth="1.8">
          <rect x="3.5" y="5.5" width="17" height="13" rx="1.5" />
          <path d="M3.5 7l8.5 6 8.5-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" style={s} aria-label={id} role="img">
          <rect x="3" y="3" width="18" height="18" rx="2" fill="#5C6357" />
        </svg>
      );
  }
}
