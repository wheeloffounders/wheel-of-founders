-- Supabase Data API explicit grant baseline.
-- Context:
-- - New Supabase projects (and later all projects) require explicit GRANTs for new public tables.
-- - This migration preserves current behavior by setting explicit grants/default privileges.
--
-- Note:
-- - RLS remains the primary data access control.
-- - These grants make objects API-addressable; policies still decide row access.

-- Ensure API roles can resolve objects in public schema.
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

-- Keep existing objects accessible via Data API roles (RLS/policies still apply).
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL PRIVILEGES ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

-- Future-proof new objects created by the postgres owner role in public schema.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL PRIVILEGES ON TABLES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL PRIVILEGES ON SEQUENCES TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL PRIVILEGES ON ROUTINES TO anon, authenticated, service_role;
