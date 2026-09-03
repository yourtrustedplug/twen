export const formatMoney = (amount: number | string, currency = 'USD') => {
  const value = typeof amount === 'string' ? Number(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
};

export const formatViews = (views: number | string) => {
  const value = typeof views === 'string' ? Number(views) : views;
  if (!Number.isFinite(value)) return '0';
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 10_000) return `${Math.round(value / 1000)}K`;
  if (value >= 1_000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
};

export const formatDate = (date: string | Date | null | undefined) => {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export const formatRate = (rate: number | string) => {
  const value = typeof rate === 'string' ? Number(rate) : rate;
  return `${formatMoney(Number.isFinite(value) ? value : 0)} / 1,000 views`;
};
