// Shared labels for the client record, kept in one place so the list, the
// detail page, and the dashboard describe a client the same way.

export const CLIENT_STATUS_LABELS: Record<string, string> = {
  active: 'Aktif',
  prospect: 'Prospek',
  inactive: 'Tidak Aktif',
  churned: 'Churned',
};

export const LEAD_SOURCES = [
  'referral', 'partner', 'outreach', 'event', 'inbound', 'other',
] as const;

export const LEAD_SOURCE_LABELS: Record<string, string> = {
  referral: 'Referral',
  partner: 'Lewat perantara',
  outreach: 'Outreach sendiri',
  event: 'Event / seminar',
  inbound: 'Menghubungi sendiri',
  other: 'Lainnya',
};

// Prompt shown under the free-text field, tailored per source.
export const LEAD_SOURCE_DETAIL_HINT: Record<string, string> = {
  referral: 'Siapa yang merekomendasikan?',
  partner: 'Nama perantara, mis. Fanfare',
  outreach: 'Lewat mana, mis. LinkedIn, email, telepon',
  event: 'Nama acara',
  inbound: 'Dari mana mereka tahu, mis. website, Instagram',
  other: 'Jelaskan singkat',
};
