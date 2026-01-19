-- Supabase Seed Data
-- Demo users and sample data for Venture CRM

-- ============================================
-- SEED TAGS
-- ============================================
INSERT INTO tags (id, name, color, category) VALUES
  (gen_random_uuid(), 'Weekly', 'weekly', 'frequency'),
  (gen_random_uuid(), 'Monthly', 'monthly', 'frequency'),
  (gen_random_uuid(), 'Product', 'product', 'type'),
  (gen_random_uuid(), 'Business', 'business', 'type'),
  (gen_random_uuid(), 'Personal', 'personal', 'type'),
  (gen_random_uuid(), 'Badge', 'badge', 'custom')
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED USERS (for demo purposes)
-- Note: In production, users should be created via Supabase Auth
-- ============================================
INSERT INTO users (id, name, email, avatar, role, department) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Brian F.', 'brian@venture.com', '/avatars/brian.jpg', 'admin', 'Engineering'),
  ('22222222-2222-2222-2222-222222222222', 'Cameron Williamson', 'cameron@venture.com', '/avatars/cameron.jpg', 'member', 'Design'),
  ('33333333-3333-3333-3333-333333333333', 'Albert Flores', 'albert@venture.com', '/avatars/albert.jpg', 'member', 'Product'),
  ('44444444-4444-4444-4444-444444444444', 'Brooklyn Simmons', 'brooklyn@venture.com', '/avatars/brooklyn.jpg', 'member', 'Sales'),
  ('55555555-5555-5555-5555-555555555555', 'Annette Black', 'annette@venture.com', '/avatars/annette.jpg', 'member', 'Marketing')
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- SEED EMPLOYEES (matching users)
-- ============================================
INSERT INTO employees (id, first_name, last_name, email, avatar, role, status, category, employee_id, department, is_active, password_created, country, created_at, updated_at, is_deleted) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Brian', 'F.', 'brian@venture.com', '/avatars/brian.jpg', 'admin', 'active', 'Employee', 'US219410', 'Engineering', true, true, 'United States', NOW(), NOW(), false),
  ('22222222-2222-2222-2222-222222222222', 'Cameron', 'Williamson', 'cameron@venture.com', '/avatars/cameron.jpg', 'member', 'active', 'Employee', 'US219411', 'Design', true, true, 'United States', NOW(), NOW(), false),
  ('33333333-3333-3333-3333-333333333333', 'Albert', 'Flores', 'albert@venture.com', '/avatars/albert.jpg', 'member', 'active', 'Employee', 'US219412', 'Product', true, true, 'United States', NOW(), NOW(), false),
  ('44444444-4444-4444-4444-444444444444', 'Brooklyn', 'Simmons', 'brooklyn@venture.com', '/avatars/brooklyn.jpg', 'member', 'active', 'Employee', 'US219413', 'Sales', true, true, 'United States', NOW(), NOW(), false),
  ('55555555-5555-5555-5555-555555555555', 'Annette', 'Black', 'annette@venture.com', '/avatars/annette.jpg', 'member', 'active', 'Employee', 'US219414', 'Marketing', true, true, 'United States', NOW(), NOW(), false)
ON CONFLICT (email) DO NOTHING;

-- ============================================
-- SEED SAMPLE TASKS
-- ============================================
INSERT INTO tasks (title, description, status, "order", due_date, labels, assignees, checklists, comment_count, is_deleted) VALUES
  ('Monthly Product Discussion', 'Monthly Product Discussion by Design and Marketing Teams with CEO to Plan our future products sales and reports', 'planned', 0, NOW() + INTERVAL '7 days', ARRAY['Internal', 'Marketing', 'Urgent'], ARRAY['11111111-1111-1111-1111-111111111111'::UUID, '22222222-2222-2222-2222-222222222222'::UUID], '[]'::JSONB, 19, false),
  ('Update New Social Media Posts', 'Update social media content across all platforms', 'planned', 1, NOW() + INTERVAL '5 days', ARRAY['Marketing', 'Event', 'Urgent'], ARRAY['11111111-1111-1111-1111-111111111111'::UUID], '[]'::JSONB, 1, false),
  ('Input Data for Monthly Sales Revenue', 'Compile and input all sales data for monthly reports', 'planned', 2, NOW() + INTERVAL '14 days', ARRAY['Internal', 'Document', 'Marketing'], ARRAY['22222222-2222-2222-2222-222222222222'::UUID], '[]'::JSONB, 0, false),
  ('Create Monthly Revenue Recap', 'Prepare comprehensive revenue analysis for all product lines', 'upcoming', 0, NOW() + INTERVAL '3 days', ARRAY['Report', 'Event', 'Urgent'], ARRAY['33333333-3333-3333-3333-333333333333'::UUID], '[]'::JSONB, 1, false),
  ('Uploading New Items to Marketplace', 'Upload and list new products on the marketplace platform', 'upcoming', 1, NOW() + INTERVAL '2 days', ARRAY['Report', 'Document', 'Marketing'], ARRAY['11111111-1111-1111-1111-111111111111'::UUID, '22222222-2222-2222-2222-222222222222'::UUID], '[]'::JSONB, 23, false),
  ('Completed Marketplace Upload', 'Completed marketplace uploads', 'completed', 0, NOW() - INTERVAL '2 days', ARRAY['Report', 'Document', 'Marketing'], ARRAY['11111111-1111-1111-1111-111111111111'::UUID], '[]'::JSONB, 1, false)
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED SAMPLE CALENDAR EVENTS
-- ============================================
INSERT INTO calendar_events (title, description, start_time, end_time, is_all_day, repeat, color, guests, source, is_deleted) VALUES
  ('Design Review', 'Review design mockups for new feature', NOW()::DATE + TIME '09:00', NOW()::DATE + TIME '10:00', false, 'none', 'pink', ARRAY['user-1', 'user-2'], 'local', false),
  ('Meeting', 'Weekly team meeting', NOW()::DATE + TIME '14:00', NOW()::DATE + TIME '15:00', false, 'weekly', 'yellow', ARRAY['user-1', 'user-2', 'user-3'], 'local', false),
  ('Design Review', 'Design review session', (NOW() + INTERVAL '1 day')::DATE + TIME '10:00', (NOW() + INTERVAL '1 day')::DATE + TIME '11:30', false, 'none', 'pink', ARRAY['user-1'], 'local', false),
  ('Discussion', 'Product discussion', (NOW() + INTERVAL '1 day')::DATE + TIME '11:30', (NOW() + INTERVAL '1 day')::DATE + TIME '12:30', false, 'none', 'green', ARRAY['user-2', 'user-3'], 'local', false),
  ('Market Research', 'Market research and analysis', (NOW() + INTERVAL '2 days')::DATE + TIME '08:00', (NOW() + INTERVAL '2 days')::DATE + TIME '11:30', false, 'none', 'green', '{}', 'local', false),
  ('New Deals', 'Review new deals', (NOW() + INTERVAL '3 days')::DATE + TIME '09:30', (NOW() + INTERVAL '3 days')::DATE + TIME '11:00', false, 'none', 'yellow', ARRAY['user-2'], 'local', false)
ON CONFLICT DO NOTHING;

-- ============================================
-- SEED SAMPLE NOTES
-- ============================================
INSERT INTO notes (title, content, tags, author_id, author_name, author_avatar, is_deleted) VALUES
  ('Product Team Meeting', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"This monthly progress agenda is following these items:"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Introduction to Newest Product Plan"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Monthly Revenue updates for each products"}]}]}]}]}'::JSONB, ARRAY['Weekly', 'Product'], '11111111-1111-1111-1111-111111111111', 'Brian F.', '/avatars/brian.jpg', false),
  ('Document Images', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Report Document of Weekly Meetings"}]}]}'::JSONB, ARRAY['Personal'], '22222222-2222-2222-2222-222222222222', 'Cameron Williamson', '/avatars/cameron.jpg', false),
  ('Revenue Progress', '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Quarterly revenue analysis and projections."}]}]}'::JSONB, ARRAY['Business'], '33333333-3333-3333-3333-333333333333', 'Albert Flores', '/avatars/albert.jpg', false)
ON CONFLICT DO NOTHING;
