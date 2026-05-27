-- instrument_type for category-first listing (guitar, drums, piano, accessories)
-- Idempotent when 000-marketplace-base-schema.sql already created the column

ALTER TABLE used_instrument_ads
  ADD COLUMN IF NOT EXISTS instrument_type TEXT;

CREATE INDEX IF NOT EXISTS idx_used_instrument_ads_instrument_type
  ON used_instrument_ads (instrument_type);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'used_instrument_ads_instrument_type_check'
  ) THEN
    ALTER TABLE used_instrument_ads
      ADD CONSTRAINT used_instrument_ads_instrument_type_check
      CHECK (
        instrument_type IS NULL
        OR instrument_type IN ('guitar', 'drums', 'piano', 'accessories')
      );
  END IF;
END $$;
