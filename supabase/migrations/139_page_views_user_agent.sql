-- Capture client User-Agent on page_views for admin device mix + coach layer.

ALTER TABLE public.page_views
  ADD COLUMN IF NOT EXISTS user_agent TEXT;

CREATE INDEX IF NOT EXISTS idx_page_views_user_entered_desc
  ON public.page_views (user_id, entered_at DESC NULLS LAST);

-- Latest row per user (for pulse batch device lookup; service_role only).
CREATE OR REPLACE FUNCTION public.admin_latest_page_view_ua_per_user(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, user_agent text, metadata jsonb)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT ON (pv.user_id)
    pv.user_id,
    pv.user_agent,
    COALESCE(pv.metadata, '{}'::jsonb) AS metadata
  FROM public.page_views pv
  WHERE pv.user_id IS NOT NULL
    AND pv.user_id = ANY(p_user_ids)
  ORDER BY pv.user_id, pv.entered_at DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.admin_latest_page_view_ua_per_user(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_latest_page_view_ua_per_user(uuid[]) TO service_role;
