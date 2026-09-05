// AI house voice
// One definition of how every AI reply in this product is allowed to read.
// The concierge sandbox, the embedded guest chatbot, inbox drafts and review
// replies each carried their own system prompt, so the same product spoke in
// four registers, and some of those registers answered in markdown that a
// guest reads as literal asterisks.
//
// Two halves, and both are needed. houseStyle() goes into the system prompt,
// so a model that follows instructions never produces the wrong shape.
// plainText() runs over the completion, because a free model that ignores the
// instruction must not be able to leak formatting into a guest-facing message
// anyway.

/** Where the reply will be read. Chat is a message bubble. Email is a message
 * with a greeting and a sign-off. */
export type Register = "chat" | "email";

const COMMON = [
  "Write plain text only.",
  "No emoji. No asterisks. No underscores for emphasis. No markdown of any kind.",
  "No bullet points, no numbered lists, no headings and no tables.",
  "When several things need saying, say them as sentences in a paragraph.",
  "Never use an em dash or an en dash. A comma, a full stop or the word and will do.",
  "British spelling.",
  "Never invent a fact, a price, a date or an availability. When the material below does not cover the question, say plainly that you cannot confirm it.",
].join(" ");

const CHAT =
  "You are replying in a chat window, so write the way a helpful person types: one to three short sentences, warm but not effusive, no subject line and no sign-off.";

const EMAIL =
  "You are writing an email, so open with a short greeting, keep it to one or two short paragraphs, and close with a single line sign-off. No subject line unless you are asked for one.";

/** The style rules, exactly as they are pasted into a system prompt. */
export const houseStyle = (register: Register): string =>
  register === "email" ? COMMON + " " + EMAIL : COMMON + " " + CHAT;

/**
 * Compose a system prompt from what the model is, what it may use, and how it
 * must read. An empty grounding block is dropped rather than sent, so a prompt
 * never claims to carry sources that are not there.
 */
export function systemPrompt(
  role: string,
  register: Register,
  grounding: Record<string, string> = {},
): string {
  const blocks = Object.entries(grounding)
    .filter(([, v]) => typeof v === "string" && v.trim().length > 0)
    .map(([k, v]) => k + ":\n" + v.trim());
  return [role.trim(), ...blocks, houseStyle(register)].join("\n\n");
}

// Emoji, dingbats, symbols and the variation selectors that follow them,
// written as explicit ranges rather than a Unicode property escape so the
// bundle still parses on older mobile Safari.
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{200D}]/gu;
const FENCE = /```[a-z]*\n?/gi;
const HEADING = /^[ \t]*#{1,6}[ \t]*/gm;
const QUOTE = /^[ \t]*>[ \t]?/gm;
const BULLET = /^[ \t]*(?:[-*+]|\d{1,2}[.)])[ \t]+/gm;
const EMPHASIS = /(\*{1,3}|_{2,3})(\S[\s\S]*?\S|\S)\1/g;
const DASH = /[ \t]*[\u2014\u2013][ \t]*/g;

/**
 * Strip everything the house style bans out of a completion. This is not
 * cosmetic. A guest reading a WhatsApp message sees the asterisks around bold
 * text, and a bulleted list inside a chat bubble reads as a machine talking.
 */
export function plainText(input: string): string {
  const out = String(input ?? "")
    .replace(EMOJI, "")
    .replace(FENCE, "")
    .replace(HEADING, "")
    .replace(QUOTE, "")
    .replace(BULLET, "")
    .replace(EMPHASIS, "$2")
    .replace(/[*_`]+/g, "")
    .replace(DASH, ", ")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n");
  return out.split("\n").map((line) => line.trim()).join("\n").trim();
}

/** True when a completion still carries banned formatting. The knowledge-base
 * test uses this so a style regression is reported rather than quietly
 * cleaned up. */
export const hasFormatting = (s: string): boolean => s !== plainText(s);
