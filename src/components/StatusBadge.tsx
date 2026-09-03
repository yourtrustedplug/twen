export const StatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    draft: 'bg-[#fafafa] text-muted-foreground border-[#e9e9e9]',
    open: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    closed: 'bg-amber-50 text-amber-700 border-amber-100',
    refunded: 'bg-[#fafafa] text-muted-foreground border-[#e9e9e9]',
    submitted: 'bg-blue-50 text-blue-700 border-blue-100',
    approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    rejected: 'bg-rose-50 text-rose-700 border-rose-100',
    pending: 'bg-blue-50 text-blue-700 border-blue-100',
    completed: 'bg-emerald-50 text-emerald-700 border-emerald-100',
    failed: 'bg-rose-50 text-rose-700 border-rose-100',
  };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full border text-xs font-semibold capitalize ${
        styles[status] ?? 'bg-[#fafafa] text-muted-foreground border-[#e9e9e9]'
      }`}
    >
      {status.replace('_', ' ')}
    </span>
  );
};
