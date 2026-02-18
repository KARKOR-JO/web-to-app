-- إنشاء نوع الدور
CREATE TYPE public.user_role AS ENUM ('user', 'admin');

-- إنشاء نوع القسم
CREATE TYPE public.department_type AS ENUM (
  'finance',
  'accounting',
  'sales',
  'hr',
  'maintenance',
  'safety',
  'warehouse',
  'cleaning'
);

-- جدول الملفات الشخصية
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text UNIQUE NOT NULL,
  role public.user_role NOT NULL DEFAULT 'user'::public.user_role,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- جدول الموظفين
CREATE TABLE public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  employee_number text UNIQUE NOT NULL,
  full_name text NOT NULL,
  department public.department_type NOT NULL,
  base_salary numeric(10, 2) NOT NULL CHECK (base_salary > 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- جدول العطل الرسمية
CREATE TABLE public.holidays (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  holiday_date date NOT NULL UNIQUE,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- جدول سجلات الوقت الإضافي
CREATE TABLE public.overtime_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  work_date date NOT NULL,
  overtime_hours numeric(4, 2) NOT NULL CHECK (overtime_hours > 0),
  is_holiday boolean NOT NULL DEFAULT false,
  notes text,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(employee_id, work_date)
);

-- فهارس لتحسين الأداء
CREATE INDEX idx_employees_user_id ON public.employees(user_id);
CREATE INDEX idx_employees_department ON public.employees(department);
CREATE INDEX idx_overtime_records_employee_id ON public.overtime_records(employee_id);
CREATE INDEX idx_overtime_records_work_date ON public.overtime_records(work_date);
CREATE INDEX idx_holidays_date ON public.holidays(holiday_date);

-- دالة لمزامنة المستخدمين الجدد
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  user_count int;
  extracted_username text;
BEGIN
  SELECT COUNT(*) INTO user_count FROM profiles;
  
  -- استخراج اسم المستخدم من البريد الإلكتروني
  extracted_username := split_part(NEW.email, '@', 1);
  
  INSERT INTO public.profiles (id, username, role)
  VALUES (
    NEW.id,
    extracted_username,
    CASE WHEN user_count = 0 THEN 'admin'::public.user_role ELSE 'user'::public.user_role END
  );
  RETURN NEW;
END;
$$;

-- مشغل لمزامنة المستخدمين
DROP TRIGGER IF EXISTS on_auth_user_confirmed ON auth.users;
CREATE TRIGGER on_auth_user_confirmed
  AFTER UPDATE ON auth.users
  FOR EACH ROW
  WHEN (OLD.confirmed_at IS NULL AND NEW.confirmed_at IS NOT NULL)
  EXECUTE FUNCTION handle_new_user();

-- دالة مساعدة للتحقق من صلاحيات الإدارة
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean LANGUAGE sql SECURITY DEFINER AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = uid AND p.role = 'admin'::user_role
  );
$$;

-- تفعيل RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overtime_records ENABLE ROW LEVEL SECURITY;

-- سياسات profiles
CREATE POLICY "Admins have full access to profiles" ON profiles
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id)
  WITH CHECK (role IS NOT DISTINCT FROM (SELECT role FROM profiles WHERE id = auth.uid()));

-- سياسات employees
CREATE POLICY "Admins have full access to employees" ON employees
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view all employees" ON employees
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can view their own employee record" ON employees
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- سياسات holidays
CREATE POLICY "Everyone can view holidays" ON holidays
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage holidays" ON holidays
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

-- سياسات overtime_records
CREATE POLICY "Admins have full access to overtime records" ON overtime_records
  FOR ALL TO authenticated USING (is_admin(auth.uid()));

CREATE POLICY "Users can view their own overtime records" ON overtime_records
  FOR SELECT TO authenticated USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can insert their own overtime records" ON overtime_records
  FOR INSERT TO authenticated WITH CHECK (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

CREATE POLICY "Users can update their own overtime records" ON overtime_records
  FOR UPDATE TO authenticated USING (
    employee_id IN (SELECT id FROM employees WHERE user_id = auth.uid())
  );

-- عرض عام للملفات الشخصية
CREATE VIEW public_profiles AS
  SELECT id, username, role FROM profiles;