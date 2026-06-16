-- Migration: Push Notifications Persistence
-- Create push_subscriptions table to survive container restarts

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  user_role TEXT NOT NULL,
  user_name TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  keys JSONB NOT NULL,
  subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_used_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster audience lookups
CREATE INDEX IF NOT EXISTS idx_push_user_id ON push_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_push_user_role ON push_subscriptions(user_role);

-- RLS
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow individuals to manage their own push subscriptions" 
  ON push_subscriptions 
  FOR ALL 
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Allow admins to view all push subscriptions"
  ON push_subscriptions
  FOR SELECT
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
