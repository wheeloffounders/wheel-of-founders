-- Add name and company_name fields to user_profiles
-- Name is required for personalization, company is optional

ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS preferred_name TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS company_name TEXT;
