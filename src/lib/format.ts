export function formatIDR(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function formatDateTime(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function daysSince(date: string | Date): number {
  const diff = Date.now() - new Date(date).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

export function stageColor(stage: string): string {
  const map: Record<string, string> = {
    lead: 'bg-stage-lead',
    qualified: 'bg-stage-qualified',
    proposal: 'bg-stage-proposal',
    negotiation: 'bg-stage-negotiation',
    won: 'bg-stage-won',
    lost: 'bg-stage-lost',
  };
  return map[stage] || 'bg-muted';
}

export function stageBorderColor(stage: string): string {
  const map: Record<string, string> = {
    lead: 'border-l-stage-lead',
    qualified: 'border-l-stage-qualified',
    proposal: 'border-l-stage-proposal',
    negotiation: 'border-l-stage-negotiation',
    won: 'border-l-stage-won',
    lost: 'border-l-stage-lost',
  };
  return map[stage] || 'border-l-muted';
}
