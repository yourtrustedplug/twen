export const CREATOR_HOME_TABS = [
  { id: 'pick', label: 'Pick campaigns' },
  { id: 'mine', label: 'My campaigns' },
] as const;

export type CreatorHomeTab = (typeof CREATOR_HOME_TABS)[number]['id'];

export const isCreatorHomeTab = (value: string | null): value is CreatorHomeTab =>
  CREATOR_HOME_TABS.some((tab) => tab.id === value);

export const creatorHomePath = (tab: CreatorHomeTab) =>
  tab === 'mine' ? '/creator?tab=mine' : '/creator';

export const CAMPAIGN_SORTS = [
  { id: 'newest', label: 'Newest' },
  { id: 'payout', label: 'Highest payout' },
  { id: 'fast', label: 'Quickest payout' },
  { id: 'budget', label: 'Most left' },
] as const;

export type CampaignSortId = (typeof CAMPAIGN_SORTS)[number]['id'];

export const isCampaignSort = (value: string | null): value is CampaignSortId =>
  CAMPAIGN_SORTS.some((sort) => sort.id === value);

type SortableCampaign = {
  created_at: string;
  deadline: string | null;
  rate_per_1k: number;
  funded_amount: number;
  spent_amount: number;
};

const remaining = (campaign: SortableCampaign) =>
  Number(campaign.funded_amount) - Number(campaign.spent_amount);

export const sortCampaigns = <T extends SortableCampaign>(rows: T[], sort: CampaignSortId): T[] => {
  const copy = [...rows];
  copy.sort((a, b) => {
    switch (sort) {
      case 'payout': {
        const byRate = Number(b.rate_per_1k) - Number(a.rate_per_1k);
        return byRate || b.created_at.localeCompare(a.created_at);
      }
      case 'fast': {
        const byDeadline = (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999');
        return byDeadline || b.created_at.localeCompare(a.created_at);
      }
      case 'budget': {
        const byLeft = remaining(b) - remaining(a);
        return byLeft || b.created_at.localeCompare(a.created_at);
      }
      default:
        return b.created_at.localeCompare(a.created_at);
    }
  });
  return copy;
};
