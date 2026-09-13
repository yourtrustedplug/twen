import type { Conversation, Message } from '@/types/unignored';
import { splitName } from '@/lib/name';
import { payoutRailsSummary } from '@/lib/payout-methods';

export const TWEN_KIND = 'twen';
export const TWEN_SENDER = 'twen';
export const SYNTHETIC_TWEN_ID = 'twen';

export type WelcomePerson = {
  first_name?: string | null;
  full_name?: string | null;
  company_name?: string | null;
};

/** First name for "Hi Ada." — first_name, else first word of full_name, else company. */
export const greetingName = (person?: WelcomePerson | null) => {
  const first = person?.first_name?.trim();
  if (first) return first;
  const fromFull = splitName(person?.full_name).first;
  if (fromFull) return fromFull;
  return person?.company_name?.trim() || '';
};

const hiLine = (name: string) => (name ? `Hi ${name}.\n\n` : 'Hi.\n\n');

const CREATOR_WELCOME_REST =
  "Welcome to Twen.\n\nPick a campaign, post the brief on TikTok or Instagram, and we pay you for verified views — sent to mobile money.\n\nFinish your profile first — first and last name, city and country, connect TikTok or Instagram, and upload your passport or national ID. You can't submit until that's done. The checklist is on your profile.";

const CREATOR_PAYOUTS =
  `How payouts work\n\n1. You post. We verify the views on the platform.\n2. Earnings accrue while the campaign is open.\n3. When the campaign closes, funds sit for 7 days (Creator Pro skips the wait).\n4. After that, we pay out immediately to ${payoutRailsSummary()} — as soon as a payout number is on file.\n\nAdd your payout number on Earnings when you're ready.`;

const BRAND_WELCOME_REST =
  "Welcome to Twen.\n\nFund a campaign, brief creators across Africa, and pay only for verified views. Unused budget can come back when the campaign closes.\n\nFinish your brand profile first — company, your name, location, logo, color, website, and a social. You can't create a campaign until that's done. The checklist is on your profile.";

const BRAND_MONEY =
  'How money moves\n\n1. You fund a campaign. That money sits in escrow.\n2. Creators post. We verify the views and pay them from escrow.\n3. After the 7-day hold (Creator Pro skips it), we pay creators immediately to mobile money.\n\nTwen Plus lets you message and hire specific people. Free brands run open bounty campaigns.';

export const CREATOR_READY = "You're set. Your profile is complete — go pick a campaign and post.";
export const BRAND_READY = "You're set. Your profile is complete — create a campaign when you're ready.";

export const isTwenConversation = (c: Pick<Conversation, 'id' | 'kind'> | null | undefined) =>
  Boolean(c && (c.kind === TWEN_KIND || c.id === SYNTHETIC_TWEN_ID));

/** Map `?c=twen` onto a real row, or pick the first chat on desktop. */
export const resolveSelectedChat = (
  rows: Conversation[],
  selected: string | null,
  desktop: boolean,
): string | null => {
  const realTwen = rows.find((c) => isTwenConversation(c) && c.id !== SYNTHETIC_TWEN_ID);
  if (selected === SYNTHETIC_TWEN_ID && realTwen) return realTwen.id;
  if (selected && rows.some((c) => c.id === selected)) return selected;
  return desktop ? rows[0]?.id ?? null : null;
};

export const twenWelcomeBodies = (role: string | null | undefined, person?: WelcomePerson | null) => {
  const hi = hiLine(greetingName(person));
  return role === 'brand' ? [hi + BRAND_WELCOME_REST, BRAND_MONEY] : [hi + CREATOR_WELCOME_REST, CREATOR_PAYOUTS];
};

export const twenReadyBody = (role: string | null | undefined) =>
  role === 'brand' ? BRAND_READY : CREATOR_READY;

export const pinTwenFirst = (rows: Conversation[]) =>
  [...rows].sort((a, b) => {
    const aTwen = isTwenConversation(a) ? 0 : 1;
    const bTwen = isTwenConversation(b) ? 0 : 1;
    if (aTwen !== bTwen) return aTwen - bTwen;
    return +new Date(b.last_message_at) - +new Date(a.last_message_at);
  });

export const syntheticTwenConversation = (userId: string, now = new Date()): Conversation => ({
  id: SYNTHETIC_TWEN_ID,
  brand_id: userId,
  creator_id: userId,
  brand_name: 'Twen',
  creator_name: 'Twen',
  campaign_id: null,
  created_at: now.toISOString(),
  last_message_at: now.toISOString(),
  kind: TWEN_KIND,
  twen_stage: 'welcome',
});

export const syntheticTwenMessages = (
  userId: string,
  role: string | null | undefined,
  onboardingComplete: boolean,
  person?: WelcomePerson | null,
  now = new Date(),
): Message[] => {
  const stamp = now.toISOString();
  const bodies = [
    ...twenWelcomeBodies(role, person),
    ...(onboardingComplete ? [twenReadyBody(role)] : []),
  ];
  return bodies.map((body, i) => ({
    id: `${SYNTHETIC_TWEN_ID}-${i + 1}`,
    conversation_id: SYNTHETIC_TWEN_ID,
    sender_id: TWEN_SENDER,
    body,
    created_at: stamp,
    from_twen: true,
  }));
};

export const isTwenMessage = (m: Pick<Message, 'from_twen' | 'sender_id'>) =>
  Boolean(m.from_twen) || m.sender_id === TWEN_SENDER;
