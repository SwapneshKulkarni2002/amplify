-- PostgreSQL target model for replacing the local demo adapter.
-- Money is stored in integer cents. Private payment details stay with the payment provider.

CREATE TYPE campaign_status AS ENUM (
  'draft', 'submitted_for_review', 'changes_requested', 'approved',
  'available_for_funding', 'funding_goal_reached', 'funding_period_ended',
  'distribution_preparation', 'promoting', 'completed', 'rejected',
  'cancelled', 'refund_pending', 'failed'
);

CREATE TYPE contribution_status AS ENUM (
  'pending', 'succeeded', 'failed', 'cancelled', 'refund_pending', 'refunded'
);

CREATE TABLE users (
  id UUID PRIMARY KEY,
  display_name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'reviewer', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE campaigns (
  id UUID PRIMARY KEY,
  creator_id UUID NOT NULL REFERENCES users(id),
  title VARCHAR(60) NOT NULL,
  category TEXT NOT NULL,
  summary VARCHAR(180) NOT NULL,
  status campaign_status NOT NULL DEFAULT 'draft',
  funding_goal_cents BIGINT NOT NULL CHECK (funding_goal_cents >= 10000),
  location TEXT NOT NULL,
  intended_audience TEXT NOT NULL,
  daily_budget_cents BIGINT NOT NULL DEFAULT 0 CHECK (daily_budget_cents >= 0),
  duration_days INTEGER NOT NULL CHECK (duration_days BETWEEN 1 AND 365),
  target_channels JSONB NOT NULL DEFAULT '[]',
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE campaign_story_blocks (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  heading TEXT NOT NULL,
  body TEXT NOT NULL,
  UNIQUE (campaign_id, position)
);

CREATE TABLE campaign_sources (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  title TEXT NOT NULL,
  publisher TEXT,
  url TEXT NOT NULL CHECK (url LIKE 'https://%' OR url LIKE 'http://%'),
  UNIQUE (campaign_id, position)
);

CREATE TABLE campaign_creatives (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('cover', 'advertisement', 'video')),
  asset_url TEXT NOT NULL,
  headline TEXT,
  description TEXT,
  call_to_action TEXT,
  moderation_status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE review_decisions (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  reviewer_id UUID NOT NULL REFERENCES users(id),
  decision TEXT NOT NULL CHECK (decision IN ('approved', 'changes_requested', 'rejected')),
  feedback TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE contributions (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  backer_id UUID REFERENCES users(id),
  amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
  fee_cents BIGINT NOT NULL CHECK (fee_cents >= 0),
  payment_reference TEXT,
  status contribution_status NOT NULL DEFAULT 'pending',
  public_backer_name BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE campaign_events (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  actor_id UUID REFERENCES users(id),
  event_type TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE distribution_reports (
  id UUID PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES campaigns(id),
  advertising_spend_cents BIGINT NOT NULL DEFAULT 0,
  impressions BIGINT,
  estimated_reach BIGINT,
  measured_reach BIGINT,
  clicks BIGINT,
  report_status TEXT NOT NULL DEFAULT 'draft' CHECK (report_status IN ('draft', 'final')),
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX campaigns_discovery_idx ON campaigns (status, category, created_at DESC);
CREATE INDEX contributions_campaign_idx ON contributions (campaign_id, status, created_at DESC);
CREATE INDEX events_campaign_idx ON campaign_events (campaign_id, created_at DESC);
