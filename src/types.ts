export type Category =
  | 'Environment'
  | 'Health'
  | 'Science'
  | 'Education'
  | 'Public Policy'
  | 'Economic Policy'
  | 'Community'
  | 'Arts & Culture'
  | 'Business'
  | 'Other';

export type CampaignStatus =
  | 'Funding open'
  | 'In review'
  | 'Changes requested'
  | 'Approved'
  | 'Funding goal reached'
  | 'Promoting'
  | 'Completed';

export type StoryBlock = { heading: string; text: string };
export type Source = { title: string; url: string; publisher: string };

export type Campaign = {
  id: string;
  title: string;
  creator: string;
  category: Category;
  summary: string;
  coverUrl: string;
  adImageUrl: string;
  raised: number;
  goal: number;
  daysLeft: number;
  status: CampaignStatus;
  story: StoryBlock[];
  sources: Source[];
  intendedAudience: string;
  location: string;
  channels: string[];
  dailyBudget: number;
  durationDays: number;
  adHeadline: string;
  adDescription: string;
  callToAction: string;
  reachAtGoal: number;
  isDemo: boolean;
};

export type CampaignDraft = {
  title: string;
  category: Category | '';
  creator: string;
  summary: string;
  coverUri: string;
  storyHeadline: string;
  introduction: string;
  storyBody: string;
  sources: Source[];
  audienceAction: string;
  adImageUri: string;
  adHeadline: string;
  adDescription: string;
  callToAction: string;
  location: string;
  intendedAudience: string;
  channels: string[];
  dailyBudget: string;
  durationDays: string;
  fundingGoal: string;
  rulesAccepted: boolean;
};

export type Contribution = {
  id: string;
  campaignId: string;
  amount: number;
  fee: number;
  createdAt: string;
  status: 'completed' | 'pending' | 'failed';
};

export type ActivityItem = {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  campaignId?: string;
  unread: boolean;
  kind: 'milestone' | 'review' | 'contribution' | 'update' | 'system';
};

export type AppSnapshot = {
  campaigns: Campaign[];
  draft: CampaignDraft;
  contributions: Contribution[];
  following: string[];
  activity: ActivityItem[];
};
