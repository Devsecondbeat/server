-- Reference makes for marketplace create-ad flow (idempotent)

INSERT INTO instrument_makes (name) VALUES
  ('Fender'),
  ('Gibson'),
  ('Yamaha'),
  ('Ibanez'),
  ('Epiphone'),
  ('Taylor'),
  ('Martin'),
  ('Pearl'),
  ('Roland'),
  ('Korg'),
  ('Steinway'),
  ('Casio'),
  ('Shure'),
  ('Other')
ON CONFLICT (name) DO NOTHING;
