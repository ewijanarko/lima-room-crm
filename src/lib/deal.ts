// Shared labels and pipeline rules for deals, so the Deals page, the timeline,
// and the dashboard all describe a deal the same way.

export const EVENT_TYPES = [
  'lead_created', 'meeting', 'discussion', 'proposal_sent',
  'negotiation', 'document', 'note', 'won', 'lost',
] as const;

export const EVENT_LABELS: Record<string, string> = {
  lead_created: 'Lead Dibuat',
  meeting: 'Pertemuan',
  discussion: 'Diskusi',
  proposal_sent: 'Proposal Dikirim',
  negotiation: 'Negosiasi',
  document: 'Dokumen',
  note: 'Catatan',
  won: 'Deal Menang',
  lost: 'Deal Kalah',
};

// Order used when summarising which stage an open deal currently sits in.
export const STAGE_ORDER = [
  'lead_created', 'meeting', 'discussion', 'proposal_sent',
  'negotiation', 'document', 'note',
] as const;

export const LOST_REASONS = [
  'price', 'competitor', 'timing', 'no_budget', 'no_decision', 'other',
] as const;

export const LOST_REASON_LABELS: Record<string, string> = {
  price: 'Harga',
  competitor: 'Kalah dari kompetitor',
  timing: 'Timing tidak tepat',
  no_budget: 'Tidak ada budget',
  no_decision: 'Tidak ada keputusan',
  other: 'Lainnya',
};

// A deal with no new timeline entry for this many days needs following up.
export const STALE_AFTER_DAYS = 14;
