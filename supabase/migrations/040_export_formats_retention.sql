-- Export formats and 7-day retention
-- Add columns for multi-format exports
ALTER TABLE data_exports
ADD COLUMN IF NOT EXISTS export_formats TEXT[] DEFAULT ARRAY['json'],
ADD COLUMN IF NOT EXISTS csv_file_name TEXT,
ADD COLUMN IF NOT EXISTS pdf_file_name TEXT;

-- Update default expiry to 7 days for new exports (retention policy)
ALTER TABLE data_exports
ALTER COLUMN expires_at SET DEFAULT (NOW() + INTERVAL '7 days');

COMMENT ON COLUMN data_exports.export_formats IS 'Generated formats: json, csv, pdf';
COMMENT ON COLUMN data_exports.csv_file_name IS 'CSV filename when generated';
COMMENT ON COLUMN data_exports.pdf_file_name IS 'PDF filename when generated';
