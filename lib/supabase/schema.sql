-- =============================================================================
-- Loyalty card SaaS — Supabase PostgreSQL schema
-- =============================================================================
-- Run this script in the Supabase SQL editor (or via psql) on a fresh project.
-- Requires: auth schema (Supabase default). Uses gen_random_uuid() (built-in).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Extensions (gen_random_uuid is available without extension in PG 13+;
-- Supabase projects include pgcrypto if needed for older compatibility.)
-- -----------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =============================================================================
-- Helper: resolve the current user's tenant (business) for RLS policies.
-- SECURITY DEFINER reads public.users without being blocked by RLS on users.
-- =============================================================================
CREATE OR REPLACE FUNCTION public.get_user_business_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.business_id
  FROM public.users u
  WHERE u.id = auth.uid();
$$;

COMMENT ON FUNCTION public.get_user_business_id() IS
  'Returns the business_id for the authenticated user (auth.uid()) from public.users.';

REVOKE ALL ON FUNCTION public.get_user_business_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_user_business_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_business_id() TO service_role;

-- =============================================================================
-- Core tables
-- =============================================================================

-- -----------------------------------------------------------------------------
-- businesses: tenant root (brand, plan, billing-facing identity).
-- -----------------------------------------------------------------------------
CREATE TABLE public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  plan text NOT NULL DEFAULT 'basic' CHECK (plan IN ('basic', 'pro', 'enterprise')),
  branding jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.businesses IS 'Top-level tenant; branches, cards, and staff belong here.';

-- -----------------------------------------------------------------------------
-- branches: physical or logical locations under a business.
-- -----------------------------------------------------------------------------
CREATE TABLE public.branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  lat float8,
  lng float8,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.branches IS 'Locations where purchases/redemptions can be attributed.';

-- -----------------------------------------------------------------------------
-- users: app profiles linked to Supabase Auth; staff of a business.
-- -----------------------------------------------------------------------------
CREATE TABLE public.users (
  id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  email text NOT NULL,
  name text NOT NULL,
  role text NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'operator')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users IS 'Staff members; id matches auth.users for RLS-friendly lookups.';

-- -----------------------------------------------------------------------------
-- cards: loyalty/event pass templates (design, rules, wallet identifiers).
-- -----------------------------------------------------------------------------
CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL DEFAULT 'loyalty' CHECK (type IN ('loyalty', 'event')),
  target_purchases int NOT NULL DEFAULT 5,
  reward_description text NOT NULL DEFAULT '',
  design jsonb NOT NULL DEFAULT '{}'::jsonb,
  wallet_class_ids jsonb NOT NULL DEFAULT '{}'::jsonb,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.cards IS 'Card program definitions (stamps, rewards, wallet class mapping).';

-- -----------------------------------------------------------------------------
-- customers: end users enrolled by a business (no auth.users link required).
-- -----------------------------------------------------------------------------
CREATE TABLE public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.customers IS 'Customers scoped per business.';

-- -----------------------------------------------------------------------------
-- customer_cards: issued pass instance (progress, wallet object, optional branch).
-- -----------------------------------------------------------------------------
CREATE TABLE public.customer_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id uuid NOT NULL REFERENCES public.customers (id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.cards (id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches (id) ON DELETE SET NULL,
  purchases int NOT NULL DEFAULT 0,
  gift_available boolean NOT NULL DEFAULT false,
  wallet_object_id text,
  wallet_save_link text,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.customer_cards IS 'Links a customer to a card template; tracks stamps and wallet refs.';

-- -----------------------------------------------------------------------------
-- purchases: stamp/purchase events against an issued card.
-- -----------------------------------------------------------------------------
CREATE TABLE public.purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_card_id uuid NOT NULL REFERENCES public.customer_cards (id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches (id) ON DELETE SET NULL,
  registered_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.purchases IS 'Purchase/stamp ledger rows; tenant derived via customer_cards → cards.';

-- -----------------------------------------------------------------------------
-- redemptions: reward redemption events.
-- -----------------------------------------------------------------------------
CREATE TABLE public.redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_card_id uuid NOT NULL REFERENCES public.customer_cards (id) ON DELETE CASCADE,
  branch_id uuid REFERENCES public.branches (id) ON DELETE SET NULL,
  registered_by uuid REFERENCES public.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.redemptions IS 'Reward redemptions; tenant derived via customer_cards → cards.';

-- -----------------------------------------------------------------------------
-- notifications: outbound campaigns (push/email/sms) per business.
-- -----------------------------------------------------------------------------
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  title text NOT NULL,
  body text NOT NULL,
  type text NOT NULL DEFAULT 'push' CHECK (type IN ('push', 'email', 'sms')),
  targeting jsonb,
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.notifications IS 'Notification records and optional targeting payload.';

-- -----------------------------------------------------------------------------
-- subscriptions: Stripe (or similar) subscription mirror per business.
-- -----------------------------------------------------------------------------
CREATE TABLE public.subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES public.businesses (id) ON DELETE CASCADE,
  stripe_subscription_id text,
  plan text NOT NULL DEFAULT 'basic',
  status text NOT NULL DEFAULT 'active',
  current_period_end timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.subscriptions IS 'Billing subscription state per tenant.';

-- =============================================================================
-- Indexes: accelerate tenant-scoped queries (business_id).
-- =============================================================================
CREATE INDEX idx_branches_business_id ON public.branches (business_id);
CREATE INDEX idx_users_business_id ON public.users (business_id);
CREATE INDEX idx_cards_business_id ON public.cards (business_id);
CREATE INDEX idx_customers_business_id ON public.customers (business_id);
CREATE INDEX idx_notifications_business_id ON public.notifications (business_id);
CREATE INDEX idx_subscriptions_business_id ON public.subscriptions (business_id);

-- customer_cards: no business_id column; index FKs used in joins / RLS subqueries.
CREATE INDEX idx_customer_cards_customer_id ON public.customer_cards (customer_id);
CREATE INDEX idx_customer_cards_card_id ON public.customer_cards (card_id);
CREATE INDEX idx_customer_cards_branch_id ON public.customer_cards (branch_id);

CREATE INDEX idx_purchases_customer_card_id ON public.purchases (customer_card_id);
CREATE INDEX idx_purchases_branch_id ON public.purchases (branch_id);
CREATE INDEX idx_purchases_registered_by ON public.purchases (registered_by);

CREATE INDEX idx_redemptions_customer_card_id ON public.redemptions (customer_card_id);
CREATE INDEX idx_redemptions_branch_id ON public.redemptions (branch_id);
CREATE INDEX idx_redemptions_registered_by ON public.redemptions (registered_by);

-- =============================================================================
-- Row Level Security: enable on every table, then tenant-scoped policies.
-- Authenticated staff see and manage only rows for their business_id.
-- =============================================================================

ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- businesses: no business_id column — scope by id = current user's tenant.
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own business data"
  ON public.businesses
  FOR SELECT
  TO authenticated
  USING (id = public.get_user_business_id());

CREATE POLICY "Users can insert own business data"
  ON public.businesses
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own business data"
  ON public.businesses
  FOR UPDATE
  TO authenticated
  USING (id = public.get_user_business_id())
  WITH CHECK (id = public.get_user_business_id());

CREATE POLICY "Users can delete own business data"
  ON public.businesses
  FOR DELETE
  TO authenticated
  USING (id = public.get_user_business_id());

-- -----------------------------------------------------------------------------
-- branches
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own business data"
  ON public.branches
  FOR SELECT
  TO authenticated
  USING (business_id = public.get_user_business_id());

CREATE POLICY "Users can insert own business data"
  ON public.branches
  FOR INSERT
  TO authenticated
  WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "Users can update own business data"
  ON public.branches
  FOR UPDATE
  TO authenticated
  USING (business_id = public.get_user_business_id())
  WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "Users can delete own business data"
  ON public.branches
  FOR DELETE
  TO authenticated
  USING (business_id = public.get_user_business_id());

-- -----------------------------------------------------------------------------
-- users: allow self-row OR same-business colleagues (per spec).
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own business data"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    OR business_id = public.get_user_business_id()
  );

CREATE POLICY "Users can insert own business data"
  ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    id = auth.uid()
    OR business_id = public.get_user_business_id()
  );

CREATE POLICY "Users can update own business data"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    OR business_id = public.get_user_business_id()
  )
  WITH CHECK (
    id = auth.uid()
    OR business_id = public.get_user_business_id()
  );

CREATE POLICY "Users can delete own business data"
  ON public.users
  FOR DELETE
  TO authenticated
  USING (
    id = auth.uid()
    OR business_id = public.get_user_business_id()
  );

-- -----------------------------------------------------------------------------
-- cards
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own business data"
  ON public.cards
  FOR SELECT
  TO authenticated
  USING (business_id = public.get_user_business_id());

CREATE POLICY "Users can insert own business data"
  ON public.cards
  FOR INSERT
  TO authenticated
  WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "Users can update own business data"
  ON public.cards
  FOR UPDATE
  TO authenticated
  USING (business_id = public.get_user_business_id())
  WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "Users can delete own business data"
  ON public.cards
  FOR DELETE
  TO authenticated
  USING (business_id = public.get_user_business_id());

-- -----------------------------------------------------------------------------
-- customers
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own business data"
  ON public.customers
  FOR SELECT
  TO authenticated
  USING (business_id = public.get_user_business_id());

CREATE POLICY "Users can insert own business data"
  ON public.customers
  FOR INSERT
  TO authenticated
  WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "Users can update own business data"
  ON public.customers
  FOR UPDATE
  TO authenticated
  USING (business_id = public.get_user_business_id())
  WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "Users can delete own business data"
  ON public.customers
  FOR DELETE
  TO authenticated
  USING (business_id = public.get_user_business_id());

-- -----------------------------------------------------------------------------
-- customer_cards: tenant via cards.business_id (and must match customer tenant).
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own business data"
  ON public.customer_cards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cards c
      INNER JOIN public.customers cu ON cu.id = customer_cards.customer_id
      WHERE c.id = customer_cards.card_id
        AND c.business_id = public.get_user_business_id()
        AND cu.business_id = c.business_id
    )
  );

CREATE POLICY "Users can insert own business data"
  ON public.customer_cards
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.cards c
      INNER JOIN public.customers cu ON cu.id = customer_id
      WHERE c.id = card_id
        AND c.business_id = public.get_user_business_id()
        AND cu.business_id = c.business_id
    )
    AND (
      branch_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.branches b
        WHERE b.id = branch_id AND b.business_id = public.get_user_business_id()
      )
    )
  );

CREATE POLICY "Users can update own business data"
  ON public.customer_cards
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cards c
      INNER JOIN public.customers cu ON cu.id = customer_cards.customer_id
      WHERE c.id = customer_cards.card_id
        AND c.business_id = public.get_user_business_id()
        AND cu.business_id = c.business_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.cards c
      INNER JOIN public.customers cu ON cu.id = customer_id
      WHERE c.id = card_id
        AND c.business_id = public.get_user_business_id()
        AND cu.business_id = c.business_id
    )
    AND (
      branch_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.branches b
        WHERE b.id = branch_id AND b.business_id = public.get_user_business_id()
      )
    )
  );

CREATE POLICY "Users can delete own business data"
  ON public.customer_cards
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.cards c
      INNER JOIN public.customers cu ON cu.id = customer_cards.customer_id
      WHERE c.id = customer_cards.card_id
        AND c.business_id = public.get_user_business_id()
        AND cu.business_id = c.business_id
    )
  );

-- -----------------------------------------------------------------------------
-- purchases: tenant via customer_cards → cards.business_id; FK rows same tenant.
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own business data"
  ON public.purchases
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.customer_cards cc
      INNER JOIN public.cards c ON c.id = cc.card_id
      WHERE cc.id = purchases.customer_card_id
        AND c.business_id = public.get_user_business_id()
    )
  );

CREATE POLICY "Users can insert own business data"
  ON public.purchases
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.customer_cards cc
      INNER JOIN public.cards c ON c.id = cc.card_id
      WHERE cc.id = customer_card_id
        AND c.business_id = public.get_user_business_id()
    )
    AND (
      branch_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.branches b
        WHERE b.id = branch_id AND b.business_id = public.get_user_business_id()
      )
    )
    AND (
      registered_by IS NULL
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = registered_by AND u.business_id = public.get_user_business_id()
      )
    )
  );

CREATE POLICY "Users can update own business data"
  ON public.purchases
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.customer_cards cc
      INNER JOIN public.cards c ON c.id = cc.card_id
      WHERE cc.id = purchases.customer_card_id
        AND c.business_id = public.get_user_business_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.customer_cards cc
      INNER JOIN public.cards c ON c.id = cc.card_id
      WHERE cc.id = customer_card_id
        AND c.business_id = public.get_user_business_id()
    )
    AND (
      branch_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.branches b
        WHERE b.id = branch_id AND b.business_id = public.get_user_business_id()
      )
    )
    AND (
      registered_by IS NULL
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = registered_by AND u.business_id = public.get_user_business_id()
      )
    )
  );

CREATE POLICY "Users can delete own business data"
  ON public.purchases
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.customer_cards cc
      INNER JOIN public.cards c ON c.id = cc.card_id
      WHERE cc.id = purchases.customer_card_id
        AND c.business_id = public.get_user_business_id()
    )
  );

-- -----------------------------------------------------------------------------
-- redemptions: same pattern as purchases.
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own business data"
  ON public.redemptions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.customer_cards cc
      INNER JOIN public.cards c ON c.id = cc.card_id
      WHERE cc.id = redemptions.customer_card_id
        AND c.business_id = public.get_user_business_id()
    )
  );

CREATE POLICY "Users can insert own business data"
  ON public.redemptions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.customer_cards cc
      INNER JOIN public.cards c ON c.id = cc.card_id
      WHERE cc.id = customer_card_id
        AND c.business_id = public.get_user_business_id()
    )
    AND (
      branch_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.branches b
        WHERE b.id = branch_id AND b.business_id = public.get_user_business_id()
      )
    )
    AND (
      registered_by IS NULL
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = registered_by AND u.business_id = public.get_user_business_id()
      )
    )
  );

CREATE POLICY "Users can update own business data"
  ON public.redemptions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.customer_cards cc
      INNER JOIN public.cards c ON c.id = cc.card_id
      WHERE cc.id = redemptions.customer_card_id
        AND c.business_id = public.get_user_business_id()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.customer_cards cc
      INNER JOIN public.cards c ON c.id = cc.card_id
      WHERE cc.id = customer_card_id
        AND c.business_id = public.get_user_business_id()
    )
    AND (
      branch_id IS NULL
      OR EXISTS (
        SELECT 1 FROM public.branches b
        WHERE b.id = branch_id AND b.business_id = public.get_user_business_id()
      )
    )
    AND (
      registered_by IS NULL
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = registered_by AND u.business_id = public.get_user_business_id()
      )
    )
  );

CREATE POLICY "Users can delete own business data"
  ON public.redemptions
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.customer_cards cc
      INNER JOIN public.cards c ON c.id = cc.card_id
      WHERE cc.id = redemptions.customer_card_id
        AND c.business_id = public.get_user_business_id()
    )
  );

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own business data"
  ON public.notifications
  FOR SELECT
  TO authenticated
  USING (business_id = public.get_user_business_id());

CREATE POLICY "Users can insert own business data"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "Users can update own business data"
  ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (business_id = public.get_user_business_id())
  WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "Users can delete own business data"
  ON public.notifications
  FOR DELETE
  TO authenticated
  USING (business_id = public.get_user_business_id());

-- -----------------------------------------------------------------------------
-- subscriptions
-- -----------------------------------------------------------------------------
CREATE POLICY "Users can view own business data"
  ON public.subscriptions
  FOR SELECT
  TO authenticated
  USING (business_id = public.get_user_business_id());

CREATE POLICY "Users can insert own business data"
  ON public.subscriptions
  FOR INSERT
  TO authenticated
  WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "Users can update own business data"
  ON public.subscriptions
  FOR UPDATE
  TO authenticated
  USING (business_id = public.get_user_business_id())
  WITH CHECK (business_id = public.get_user_business_id());

CREATE POLICY "Users can delete own business data"
  ON public.subscriptions
  FOR DELETE
  TO authenticated
  USING (business_id = public.get_user_business_id());

-- =============================================================================
-- Grants: PostgREST uses the `authenticated` role; RLS still enforces tenancy.
-- service_role bypasses RLS and is intended for trusted server-side code.
-- =============================================================================
GRANT USAGE ON SCHEMA public TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.businesses,
  public.branches,
  public.users,
  public.cards,
  public.customers,
  public.customer_cards,
  public.purchases,
  public.redemptions,
  public.notifications,
  public.subscriptions
TO authenticated;
