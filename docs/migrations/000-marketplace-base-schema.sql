-- Marketplace base schema for Second Beat used-instruments API
-- user_id is UUID to align with Supabase Auth JWT subject (req.user.sub)

CREATE TABLE IF NOT EXISTS instrument_makes (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

CREATE TABLE IF NOT EXISTS used_instrument_ads (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  make_id INTEGER NOT NULL REFERENCES instrument_makes (id),
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  price NUMERIC(12, 2) NOT NULL CHECK (price > 0),
  condition TEXT NOT NULL,
  instrument_type TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_used_instrument_ads_user_id
  ON used_instrument_ads (user_id);

CREATE INDEX IF NOT EXISTS idx_used_instrument_ads_make_id
  ON used_instrument_ads (make_id);

CREATE INDEX IF NOT EXISTS idx_used_instrument_ads_instrument_type
  ON used_instrument_ads (instrument_type);

CREATE TABLE IF NOT EXISTS ad_images (
  ad_id INTEGER NOT NULL REFERENCES used_instrument_ads (id) ON DELETE CASCADE,
  cloudflare_image_id TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (ad_id, cloudflare_image_id)
);

CREATE INDEX IF NOT EXISTS idx_ad_images_ad_id
  ON ad_images (ad_id);
