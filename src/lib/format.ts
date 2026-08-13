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

export function daysBetween(start: string | Date, end: string | Date): number {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export function statusColor(status: string): string {
  const map: Record<string, string> = {
    open: 'bg-status-open',
    won: 'bg-status-won',
    lost: 'bg-status-lost',
  };
  return map[status] || 'bg-muted';
}

export function statusBorderColor(status: string): string {
  const map: Record<string, string> = {
    open: 'border-l-status-open',
    won: 'border-l-status-won',
    lost: 'border-l-status-lost',
  };
  return map[status] || 'border-l-muted';
}

export function dealStatusPillClass(status: string): string {
  const map: Record<string, string> = {
    open: 'bg-status-open/10 text-status-open',
    won: 'bg-status-won/10 text-status-won',
    lost: 'bg-status-lost/10 text-status-lost',
  };
  return map[status] || 'bg-muted text-muted-foreground';
}

export function clientStatusPillClass(status: string): string {
  const map: Record<string, string> = {
    active: 'bg-accent/10 text-accent',
    prospect: 'bg-primary/10 text-primary',
    inactive: 'bg-muted text-muted-foreground',
    churned: 'bg-destructive/10 text-destructive',
  };
  return map[status] || 'bg-muted text-muted-foreground';
}
