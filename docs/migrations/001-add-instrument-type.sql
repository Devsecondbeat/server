-- Add instrument_type for category-first listing (Approach B)
-- Values: guitar, drums, piano, accessories

ALTER TABLE used_instrument_ads
  ADD COLUMN IF NOT EXISTS instrument_type TEXT;

-- Optional: constrain values (run after backfill)
-- ALTER TABLE used_instrument_ads
--   ADD CONSTRAINT used_instrument_ads_instrument_type_check
--   CHECK (instrument_type IN ('guitar', 'drums', 'piano', 'accessories'));

CREATE INDEX IF NOT EXISTS idx_used_instrument_ads_instrument_type
  ON used_instrument_ads (instrument_type);
