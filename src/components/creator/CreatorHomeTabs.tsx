import { CREATOR_HOME_TABS, type CreatorHomeTab } from '@/lib/creator-home';
import { cn } from '@/lib/utils';

const CreatorHomeTabs = ({
  value,
  onChange,
}: {
  value: CreatorHomeTab;
  onChange: (tab: CreatorHomeTab) => void;
}) => (
  <div
    role="tablist"
    aria-label="Campaign views"
    className="inline-flex w-full md:w-auto shrink-0 p-1 rounded-full border border-[#dddddd] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.08),0_4px_12px_rgba(0,0,0,0.05)]"
  >
    {CREATOR_HOME_TABS.map((item) => {
      const selected = value === item.id;
      return (
        <button
          key={item.id}
          type="button"
          role="tab"
          id={`creator-home-tab-${item.id}`}
          aria-controls={`creator-home-panel-${item.id}`}
          aria-selected={selected}
          onClick={() => onChange(item.id)}
          className={cn(
            'flex-1 md:flex-none px-3.5 sm:px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition-colors duration-200 min-h-11',
            selected
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {item.label}
        </button>
      );
    })}
  </div>
);

export default CreatorHomeTabs;
