-- Add traffic_allocation and target_metric to experiments
-- traffic_allocation: JSONB e.g. {"control": 50, "test": 50} (percent per variant)
-- target_metric: TEXT e.g. page_view, funnel_completion, conversion

ALTER TABLE experiments ADD COLUMN IF NOT EXISTS traffic_allocation JSONB DEFAULT '{}';
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS target_metric TEXT;
ALTER TABLE experiments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

COMMENT ON COLUMN experiments.traffic_allocation IS 'Percent per variant, e.g. {"control": 50, "test": 50}';
COMMENT ON COLUMN experiments.target_metric IS 'Primary metric: page_view, funnel_completion, conversion, etc.';
