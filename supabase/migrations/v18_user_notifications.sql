-- Migration: User Notifications Table
-- Store personal notifications for users (e.g., fee alerts, exam results)

CREATE TABLE IF NOT EXISTS user_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  url TEXT,
  type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  status TEXT DEFAULT 'unread', -- 'unread', 'read'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for faster filtering per user
CREATE INDEX IF NOT EXISTS idx_user_notifications_user_id ON user_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_notifications_status ON user_notifications(status);

-- RLS
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON user_notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications (mark as read)"
  ON user_notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON user_notifications FOR INSERT
  WITH CHECK (true);
