-- ============================================================
-- Kshare — Seed Data (Development / Demo)
-- ============================================================
-- Run with: supabase db reset (applies migrations + seed)
-- Note: auth.users are created via Supabase Auth, so profiles
-- must be inserted manually for seed data.
-- ============================================================

-- ── Fixed UUIDs for reproducibility ──────────────────────────

-- Clients
-- client1: 00000000-0000-0000-0000-000000000001
-- client2: 00000000-0000-0000-0000-000000000002
-- client3: 00000000-0000-0000-0000-000000000003

-- Commerce owners
-- shop1_owner: 00000000-0000-0000-0000-000000000011
-- shop2_owner: 00000000-0000-0000-0000-000000000012
-- shop3_owner: 00000000-0000-0000-0000-000000000013
-- shop4_owner: 00000000-0000-0000-0000-000000000014

-- Association owner
-- asso1_owner: 00000000-0000-0000-0000-000000000021

-- Admin
-- admin1: 00000000-0000-0000-0000-000000000099

-- ── 1. Profiles ──────────────────────────────────────────────

INSERT INTO public.profiles (id, email, full_name, phone, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'sarah.cohen@demo.kshare.fr',   'Sarah Cohen',      '0612345001', 'client'),
  ('00000000-0000-0000-0000-000000000002', 'david.levy@demo.kshare.fr',    'David Levy',        '0612345002', 'client'),
  ('00000000-0000-0000-0000-000000000003', 'rachel.benami@demo.kshare.fr', 'Rachel Ben Ami',    '0612345003', 'client'),
  ('00000000-0000-0000-0000-000000000011', 'boucherie@demo.kshare.fr',     'Moshe Abitbol',     '0612345011', 'commerce'),
  ('00000000-0000-0000-0000-000000000012', 'fromagerie@demo.kshare.fr',    'Yael Peretz',       '0612345012', 'commerce'),
  ('00000000-0000-0000-0000-000000000013', 'traiteur@demo.kshare.fr',      'Nathan Azoulay',    '0612345013', 'commerce'),
  ('00000000-0000-0000-0000-000000000014', 'boulangerie@demo.kshare.fr',   'Miriam Toledano',   '0612345014', 'commerce'),
  ('00000000-0000-0000-0000-000000000021', 'asso@demo.kshare.fr',          'Shimon Dahan',      '0612345021', 'association'),
  ('00000000-0000-0000-0000-000000000099', 'admin@kshare.fr',              'Admin Kshare',      '0600000000', 'admin')
ON CONFLICT (id) DO NOTHING;

-- ── 2. Commerces ─────────────────────────────────────────────

INSERT INTO public.commerces (id, profile_id, name, email, phone, address, city, postal_code, commerce_type, hashgakha, description, commission_rate, status, basket_types, location, validated_at) VALUES
  (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000011',
    'Boucherie Moche',
    'boucherie@demo.kshare.fr',
    '0145678901',
    '12 Rue Richer',
    'Paris',
    '75009',
    'Boucherie',
    'Beth Din de Paris',
    'Boucherie casher familiale depuis 1985. Viandes de qualite, volailles et charcuterie.',
    18,
    'validated',
    ARRAY['bassari']::basket_type[],
    ST_SetSRID(ST_MakePoint(2.3456, 48.8765), 4326)::geography,
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000012',
    'Fromagerie Gan Eden',
    'fromagerie@demo.kshare.fr',
    '0145678902',
    '28 Rue des Rosiers',
    'Paris',
    '75004',
    'Fromagerie',
    'OK Kosher',
    'Fromagerie artisanale casher. Fromages frais, affines et specialites israeliennes.',
    18,
    'validated',
    ARRAY['halavi']::basket_type[],
    ST_SetSRID(ST_MakePoint(2.3570, 48.8570), 4326)::geography,
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000013',
    'Traiteur Shalom',
    'traiteur@demo.kshare.fr',
    '0145678903',
    '5 Rue Cadet',
    'Paris',
    '75009',
    'Traiteur',
    'Beth Din de Paris',
    'Traiteur casher pour toutes les occasions. Plats cuisines, salades, desserts.',
    12,
    'validated',
    ARRAY['bassari', 'halavi', 'parve']::basket_type[],
    ST_SetSRID(ST_MakePoint(2.3430, 48.8740), 4326)::geography,
    now()
  ),
  (
    '10000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000014',
    'Boulangerie Manna',
    'boulangerie@demo.kshare.fr',
    '0145678904',
    '15 Rue Pavee',
    'Paris',
    '75004',
    'Boulangerie',
    'Rabbanut Israel',
    'Boulangerie-patisserie casher. Pains, viennoiseries, gateaux pour Shabbat et fetes.',
    18,
    'validated',
    ARRAY['parve', 'halavi']::basket_type[],
    ST_SetSRID(ST_MakePoint(2.3580, 48.8555), 4326)::geography,
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- ── 3. Association ───────────────────────────────────────────

INSERT INTO public.associations (id, profile_id, name, address, city, contact, zone_region, status, validated_at) VALUES
  (
    '20000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000021',
    'Association Tsedaka Paris',
    '42 Rue de Turbigo',
    'Paris',
    'Shimon Dahan - 0612345021',
    'Ile-de-France',
    'validated',
    now()
  )
ON CONFLICT (id) DO NOTHING;

-- ── 4. Baskets (Today) ──────────────────────────────────────

INSERT INTO public.baskets (id, commerce_id, type, day, description, original_price, sold_price, quantity_total, quantity_sold, pickup_start, pickup_end, is_donation, status, published_at) VALUES
  -- Boucherie: Panier Bassari
  (
    '30000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000001',
    'bassari', 'today',
    'Assortiment de viandes: poulet, boeuf hache, merguez. Environ 1.5kg.',
    22.00, 8.99, 5, 1,
    '16:00', '19:00',
    false, 'published', now()
  ),
  -- Fromagerie: Panier Halavi
  (
    '30000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000002',
    'halavi', 'today',
    'Selection de fromages: cream cheese, feta, gouda casher. 4-5 pieces.',
    28.00, 12.50, 4, 0,
    '14:00', '17:00',
    false, 'published', now()
  ),
  -- Traiteur: Panier Shabbat
  (
    '30000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000003',
    'shabbat', 'today',
    'Panier Shabbat complet: challot, houmous, salade, plat principal bassari.',
    45.00, 19.99, 8, 3,
    '12:00', '15:00',
    false, 'published', now()
  ),
  -- Boulangerie: Panier Parve
  (
    '30000000-0000-0000-0000-000000000004',
    '10000000-0000-0000-0000-000000000004',
    'parve', 'today',
    'Pains, viennoiseries et gateaux du jour. 6-8 pieces.',
    18.00, 6.99, 6, 2,
    '17:00', '19:30',
    false, 'published', now()
  ),
  -- Traiteur: Panier Don
  (
    '30000000-0000-0000-0000-000000000005',
    '10000000-0000-0000-0000-000000000003',
    'mix', 'today',
    'Panier solidaire: plats du jour et accompagnements. Pour 2-3 personnes.',
    30.00, 0.00, 3, 0,
    '13:00', '16:00',
    true, 'published', now()
  ),
  -- Tomorrow baskets
  (
    '30000000-0000-0000-0000-000000000006',
    '10000000-0000-0000-0000-000000000001',
    'bassari', 'tomorrow',
    'Panier BBQ: brochettes, steaks, saucisses. Ideal pour un repas en famille.',
    35.00, 14.99, 4, 0,
    '15:00', '18:00',
    false, 'published', now()
  ),
  (
    '30000000-0000-0000-0000-000000000007',
    '10000000-0000-0000-0000-000000000004',
    'halavi', 'tomorrow',
    'Panier patisserie: cheesecake, rugelach, bourekas fromage.',
    24.00, 9.99, 5, 0,
    '10:00', '13:00',
    false, 'published', now()
  )
ON CONFLICT (id) DO NOTHING;

-- ── 5. Orders ────────────────────────────────────────────────

INSERT INTO public.orders (id, basket_id, client_id, commerce_id, quantity, unit_price, total_amount, commission_amount, net_amount, status, is_donation, qr_code_token, pickup_date, pickup_start, pickup_end, created_at) VALUES
  -- Sarah achete un panier Shabbat (paid, en attente de retrait)
  (
    '40000000-0000-0000-0000-000000000001',
    '30000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000003',
    1, 19.99, 19.99, 3.60, 16.39,
    'paid', false,
    '847291',
    CURRENT_DATE, '12:00', '15:00',
    now() - interval '2 hours'
  ),
  -- David achete un panier Bassari (ready for pickup)
  (
    '40000000-0000-0000-0000-000000000002',
    '30000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000001',
    1, 8.99, 8.99, 1.62, 7.37,
    'ready_for_pickup', false,
    '523184',
    CURRENT_DATE, '16:00', '19:00',
    now() - interval '3 hours'
  ),
  -- Rachel achete un panier Parve (picked up hier)
  (
    '40000000-0000-0000-0000-000000000003',
    '30000000-0000-0000-0000-000000000004',
    '00000000-0000-0000-0000-000000000003',
    '10000000-0000-0000-0000-000000000004',
    2, 6.99, 13.98, 2.52, 11.46,
    'picked_up', false,
    '199472',
    CURRENT_DATE - 1, '17:00', '19:30',
    now() - interval '1 day'
  ),
  -- Sarah achete aussi un panier Halavi (paid)
  (
    '40000000-0000-0000-0000-000000000004',
    '30000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    '10000000-0000-0000-0000-000000000002',
    1, 12.50, 12.50, 2.25, 10.25,
    'paid', false,
    '631058',
    CURRENT_DATE, '14:00', '17:00',
    now() - interval '1 hour'
  ),
  -- David fait un don (Traiteur Shalom → Association Tsedaka)
  (
    '40000000-0000-0000-0000-000000000005',
    '30000000-0000-0000-0000-000000000005',
    '00000000-0000-0000-0000-000000000002',
    '10000000-0000-0000-0000-000000000003',
    1, 0.00, 0.00, 0.00, 0.00,
    'pending_association', true,
    NULL,
    CURRENT_DATE, '13:00', '16:00',
    now() - interval '30 minutes'
  )
ON CONFLICT (id) DO NOTHING;

-- Update association_id for the donation
UPDATE public.orders
SET association_id = '20000000-0000-0000-0000-000000000001'
WHERE id = '40000000-0000-0000-0000-000000000005';

-- ── 6. Favorites ─────────────────────────────────────────────

INSERT INTO public.favorites (profile_id, commerce_id) VALUES
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000004'),
  ('00000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001'),
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000002')
ON CONFLICT DO NOTHING;

-- ── 7. Ratings ───────────────────────────────────────────────

INSERT INTO public.ratings (profile_id, commerce_id, order_id, score, comment) VALUES
  ('00000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000004', '40000000-0000-0000-0000-000000000003', 5, 'Excellent panier, tres genereux ! Les viennoiseries etaient fraiches.'),
  ('00000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000003', '40000000-0000-0000-0000-000000000001', 4, 'Tres bon panier Shabbat, juste un peu petit pour le prix.')
ON CONFLICT DO NOTHING;

-- Update commerce ratings
UPDATE public.commerces SET average_rating = 5.00, total_ratings = 1 WHERE id = '10000000-0000-0000-0000-000000000004';
UPDATE public.commerces SET average_rating = 4.00, total_ratings = 1 WHERE id = '10000000-0000-0000-0000-000000000003';
