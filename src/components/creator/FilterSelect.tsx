import { useMemo, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

export type FilterOption = { value: string; label: string; leading?: ReactNode };

export const optionsMatching = (options: FilterOption[], query: string) => {
  const q = query.trim().toLowerCase();
  if (!q) return options;
  return options.filter(
    (option) =>
      option.label.toLowerCase().includes(q) || option.value.toLowerCase().includes(q),
  );
};

const FilterSelect = ({
  id,
  value,
  onChange,
  options,
  ariaLabel,
  inactiveValue = 'all',
  placeholder,
  fullWidth = false,
  showLeadingOnTrigger = true,
  searchable = false,
  searchPlaceholder = 'Filter',
  variant = 'chip',
  triggerClassName,
}: {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  ariaLabel: string;
  inactiveValue?: string;
  placeholder?: string;
  fullWidth?: boolean;
  showLeadingOnTrigger?: boolean;
  searchable?: boolean;
  searchPlaceholder?: string;
  variant?: 'chip' | 'field';
  triggerClassName?: string;
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const selected = options.find((option) => option.value === value);
  const active = Boolean(value) && value !== inactiveValue;
  const label = selected?.label ?? placeholder ?? '';
  const visible = useMemo(() => optionsMatching(options, query), [options, query]);
  const field = variant === 'field';

  return (
    <DropdownMenu
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <DropdownMenuTrigger asChild>
        <button
          id={id}
          type="button"
          aria-label={`${ariaLabel}: ${label}`}
          className={cn(
            'inline-flex items-center gap-2 outline-none',
            'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            '[&[data-state=open]>svg]:rotate-180',
            field
              ? 'h-11 w-full justify-between rounded-md border border-input bg-background px-3 text-base md:text-sm'
              : cn(
                  'h-11 rounded-full border px-4 text-sm transition-shadow hover:shadow-md',
                  fullWidth && 'w-full justify-between',
                  active
                    ? 'border-transparent bg-primary text-primary-foreground'
                    : 'border-[#dddddd] bg-white',
                ),
            triggerClassName,
          )}
        >
          <span className="flex min-w-0 items-center gap-2">
            {showLeadingOnTrigger ? selected?.leading : null}
            <span
              className={cn(
                'truncate',
                field || fullWidth ? 'max-w-none' : 'max-w-[10rem]',
                field && !selected && 'text-muted-foreground',
              )}
            >
              {label}
            </span>
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50 transition-transform" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={8}
        className={cn(
          'rounded-2xl p-2 shadow-lg',
          field || fullWidth
            ? 'w-[var(--radix-dropdown-menu-trigger-width)] min-w-[12rem]'
            : 'w-52',
        )}
      >
        {searchable ? (
          <div className="px-1 pb-2" onKeyDown={(event) => event.stopPropagation()}>
            <label className="flex h-9 items-center gap-2 rounded-xl border border-[#dddddd] bg-white px-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                autoFocus
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </label>
          </div>
        ) : null}
        <div className="max-h-80 overflow-y-auto">
          {visible.length === 0 ? (
            <p className="px-3 py-2.5 text-sm text-muted-foreground">No matches</p>
          ) : (
            visible.map((option) => {
              const isSelected = option.value === value;
              return (
                <DropdownMenuItem
                  key={option.value || '__empty'}
                  className="cursor-pointer gap-2 rounded-xl px-3 py-2.5"
                  onSelect={() => onChange(option.value)}
                >
                  <Check className={cn('h-4 w-4 shrink-0', isSelected ? 'opacity-100' : 'opacity-0')} />
                  {option.leading}
                  <span className={cn(isSelected && 'font-semibold')}>{option.label}</span>
                </DropdownMenuItem>
              );
            })
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default FilterSelect;
