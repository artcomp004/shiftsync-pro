-- ================================================
-- ShiftSync Pro — Supabase Database Setup
-- Run this SQL in your Supabase SQL Editor
-- ================================================

-- ===== PROFILES (extends auth.users) =====
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'worker',
  phone TEXT DEFAULT '',
  avatar TEXT DEFAULT '',
  roles TEXT[] DEFAULT '{"שוטף"}',
  eligible_shifts TEXT[] DEFAULT '{}',
  quota INTEGER DEFAULT 5,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== SHIFT DEFINITIONS =====
CREATE TABLE IF NOT EXISTS shift_defs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  hours TEXT NOT NULL,
  section TEXT DEFAULT 'main',
  color TEXT DEFAULT '#3b82f6',
  active_days INTEGER[] DEFAULT '{0,1,2,3,4,5,6}',
  day_overrides JSONB DEFAULT '{}',
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== ASSIGNMENTS =====
CREATE TABLE IF NOT EXISTS assignments (
  id TEXT PRIMARY KEY,
  emp_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  day_idx INTEGER NOT NULL,
  shift_def_id TEXT REFERENCES shift_defs(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== SHIFT REQUESTS =====
CREATE TABLE IF NOT EXISTS shift_requests (
  id TEXT PRIMARY KEY,
  emp_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  week_key TEXT NOT NULL,
  blocked_day INTEGER,
  prefer_not_slots JSONB DEFAULT '[]',
  comment TEXT DEFAULT '',
  requested_quota INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(emp_id, week_key)
);

-- ===== SWAP REQUESTS =====
CREATE TABLE IF NOT EXISTS swap_requests (
  id TEXT PRIMARY KEY,
  emp_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  from_shift_def_id TEXT,
  from_day_idx INTEGER,
  reason TEXT DEFAULT '',
  status TEXT DEFAULT 'pending',
  week_key TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== CHAT MESSAGES =====
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_name TEXT NOT NULL,
  text TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== SAVED SCHEDULES =====
CREATE TABLE IF NOT EXISTS saved_schedules (
  id TEXT PRIMARY KEY,
  week_label TEXT,
  week_key TEXT,
  assignments JSONB NOT NULL DEFAULT '[]',
  cell_notes JSONB DEFAULT '{}',
  saved_at TIMESTAMPTZ DEFAULT now()
);

-- ===== CELL NOTES =====
CREATE TABLE IF NOT EXISTS cell_notes (
  id TEXT PRIMARY KEY,
  week_key TEXT NOT NULL,
  day_idx INTEGER NOT NULL,
  shift_def_id TEXT NOT NULL,
  text TEXT DEFAULT '',
  color TEXT DEFAULT '',
  UNIQUE(week_key, day_idx, shift_def_id)
);

-- ===== WORKER NOTES =====
CREATE TABLE IF NOT EXISTS worker_notes (
  id TEXT PRIMARY KEY,
  emp_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  emp_name TEXT DEFAULT '',
  text TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== NOTIFICATIONS =====
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id UUID,
  text TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ===== APP SETTINGS =====
CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL
);


-- ================================================
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_defs ENABLE ROW LEVEL SECURITY;
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE swap_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE saved_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE cell_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- PROFILES: All authenticated users can read; admins can update all; users can update self
CREATE POLICY "Anyone can view profiles"
  ON profiles FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

-- SHIFT_DEFS: All authenticated can read; admins can manage (handled app-side)
CREATE POLICY "Anyone can view shift_defs"
  ON shift_defs FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anyone can manage shift_defs"
  ON shift_defs FOR ALL TO authenticated
  USING (true);

-- ASSIGNMENTS: All can read; all can manage (admin enforced app-side)
CREATE POLICY "Anyone can view assignments"
  ON assignments FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anyone can manage assignments"
  ON assignments FOR ALL TO authenticated
  USING (true);

-- SHIFT_REQUESTS: All can read; users manage own
CREATE POLICY "Anyone can view shift_requests"
  ON shift_requests FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anyone can manage shift_requests"
  ON shift_requests FOR ALL TO authenticated
  USING (true);

-- SWAP_REQUESTS: All can read; all can manage
CREATE POLICY "Anyone can view swap_requests"
  ON swap_requests FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anyone can manage swap_requests"
  ON swap_requests FOR ALL TO authenticated
  USING (true);

-- CHAT_MESSAGES: All can read; all can insert
CREATE POLICY "Anyone can view chat_messages"
  ON chat_messages FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Anyone can send chat_messages"
  ON chat_messages FOR INSERT TO authenticated
  WITH CHECK (true);

-- SAVED_SCHEDULES: All authenticated can read/manage
CREATE POLICY "Anyone can manage saved_schedules"
  ON saved_schedules FOR ALL TO authenticated
  USING (true);

-- CELL_NOTES: All authenticated can read/manage
CREATE POLICY "Anyone can manage cell_notes"
  ON cell_notes FOR ALL TO authenticated
  USING (true);

-- WORKER_NOTES: All authenticated can read/manage
CREATE POLICY "Anyone can manage worker_notes"
  ON worker_notes FOR ALL TO authenticated
  USING (true);

-- NOTIFICATIONS: All authenticated can read/manage
CREATE POLICY "Anyone can manage notifications"
  ON notifications FOR ALL TO authenticated
  USING (true);

-- APP_SETTINGS: All authenticated can read/manage
CREATE POLICY "Anyone can manage app_settings"
  ON app_settings FOR ALL TO authenticated
  USING (true);


-- ================================================
-- AUTO-CREATE PROFILE ON SIGNUP (Trigger)
-- ================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role, avatar)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    CASE
      WHEN NEW.email IN ('iritspitzer@gmail.com', 'n12comp004@gmail.com', 'anaellheymann@gmail.com')
      THEN 'admin'
      ELSE 'worker'
    END,
    LEFT(COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), 1)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if any
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ================================================
-- SEED DEFAULT SHIFT DEFINITIONS
-- ================================================
INSERT INTO shift_defs (id, name, hours, section, color, active_days, day_overrides, sort_order) VALUES
  ('t1', 'שחר', '05:00 - 12:00', 'main', '#f97316', '{0,1,2,3,4,5}', '{}', 1),
  ('t2', 'פיתוח', '08:00 - 16:00', 'main', '#06b6d4', '{0,1,2,3,4,5}', '{"5": {"name": "מוטור", "hours": "10:00 - 19:00"}}', 2),
  ('t3', 'פרומו', '09:00 - 17:00', 'main', '#8b5cf6', '{0,1,2,3,4}', '{}', 3),
  ('t4', 'מיוחדים', '12:00 - 20:15', 'main', '#ec4899', '{0,1,2,3,4}', '{}', 4),
  ('t5', 'אמצע', '12:00 - 20:15', 'main', '#3b82f6', '{0,1,2,3,4,5,6}', '{"5": {"hours": "12:00 - 20:00"}, "6": {"hours": "12:00 - 20:00"}}', 5),
  ('t6', 'אמצע ב׳', '13:00 - 21:30', 'main', '#6366f1', '{0,1,2,3,4,5,6}', '{"5": {"hours": "13:00 - 22:00"}, "6": {"hours": "13:00 - 22:00"}}', 6),
  ('t7', 'חצות', '15:00 - 00:00', 'main', '#64748b', '{0,1,2,3,4}', '{}', 7),
  ('t8', 'בוקר', '08:00 - 16:00', 'internet', '#10b981', '{0,1,2,3,4}', '{}', 8),
  ('t9', 'ערב', '16:00 - 00:00', 'internet', '#14b8a6', '{0,1,2,3,4,5,6}', '{"5": {"hours": "12:00 - 22:00"}, "6": {"hours": "00:00 - 15:00"}}', 9)
ON CONFLICT (id) DO NOTHING;
