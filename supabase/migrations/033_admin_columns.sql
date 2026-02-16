-- Admin access for analytics dashboard
-- is_admin: grants access to /admin routes
-- admin_role: 'viewer', 'editor', 'super_admin'

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS admin_role TEXT;

CREATE INDEX IF NOT EXISTS idx_user_profiles_is_admin ON user_profiles(is_admin) WHERE is_admin = true;
