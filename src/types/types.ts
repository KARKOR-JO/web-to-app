// أنواع قاعدة البيانات
export type UserRole = 'user' | 'admin';

export type DepartmentType = 
  | 'finance'
  | 'accounting'
  | 'sales'
  | 'hr'
  | 'maintenance'
  | 'safety'
  | 'warehouse'
  | 'cleaning';

export interface Profile {
  id: string;
  username: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface Employee {
  id: string;
  user_id: string | null;
  employee_number: string;
  full_name: string;
  department: DepartmentType;
  base_salary: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Holiday {
  id: string;
  holiday_date: string;
  description: string | null;
  created_at: string;
}

export interface OvertimeRecord {
  id: string;
  employee_id: string;
  work_date: string;
  overtime_hours: number;
  is_holiday: boolean;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// أنواع موسعة مع علاقات
export interface EmployeeWithProfile extends Employee {
  profiles?: Profile;
}

export interface OvertimeRecordWithEmployee extends OvertimeRecord {
  employees?: Employee;
}

// أنواع للتقارير
export interface MonthlyOvertimeReport {
  employee_id: string;
  employee_number: string;
  full_name: string;
  department: DepartmentType;
  base_salary: number;
  total_hours: number;
  regular_hours: number;
  holiday_hours: number;
  regular_amount: number;
  holiday_amount: number;
  total_amount: number;
}

export interface DepartmentSummary {
  department: DepartmentType;
  employee_count: number;
  total_hours: number;
  total_amount: number;
}

// أنواع للنماذج
export interface OvertimeEntryForm {
  employee_id: string;
  work_date: string;
  overtime_hours: number;
  is_holiday: boolean;
  notes?: string;
}

export interface EmployeeForm {
  employee_number: string;
  full_name: string;
  department: DepartmentType;
  base_salary: number;
  user_id?: string;
}

// ثوابت الأقسام
export const DEPARTMENTS: Record<DepartmentType, string> = {
  finance: 'قسم المالية',
  accounting: 'قسم المحاسبة',
  sales: 'قسم المندوبين',
  hr: 'قسم الموارد البشرية',
  maintenance: 'قسم الصيانة',
  safety: 'قسم السلامة العامة',
  warehouse: 'قسم المستودعات',
  cleaning: 'قسم النظافة',
};

// دوال مساعدة لحساب الوقت الإضافي
export function calculateOvertimeRate(baseSalary: number, isHoliday: boolean): number {
  const hourlyRate = baseSalary / 30 / 8;
  const multiplier = isHoliday ? 1.5 : 1.25;
  return hourlyRate * multiplier;
}

export function calculateOvertimeAmount(
  baseSalary: number,
  hours: number,
  isHoliday: boolean
): number {
  const rate = calculateOvertimeRate(baseSalary, isHoliday);
  return rate * hours;
}
