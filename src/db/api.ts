import { supabase } from './supabase';
import type {
  Employee,
  EmployeeForm,
  Holiday,
  OvertimeRecord,
  OvertimeEntryForm,
  Profile,
  MonthlyOvertimeReport,
  DepartmentSummary,
  EmployeeWithProfile,
  OvertimeRecordWithEmployee,
} from '@/types/index';

// ==================== Profiles ====================
export async function getAllProfiles(): Promise<Profile[]> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function updateProfileRole(userId: string, role: 'user' | 'admin'): Promise<void> {
  const { error } = await supabase
    .from('profiles')
    .update({ role, updated_at: new Date().toISOString() })
    .eq('id', userId);

  if (error) throw error;
}

// ==================== Employees ====================
export async function getAllEmployees(): Promise<EmployeeWithProfile[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*, profiles(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getActiveEmployees(): Promise<Employee[]> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('is_active', true)
    .order('full_name');

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getEmployeeById(id: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function getEmployeeByUserId(userId: string): Promise<Employee | null> {
  const { data, error } = await supabase
    .from('employees')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function createEmployee(employee: EmployeeForm): Promise<Employee> {
  const { data, error } = await supabase
    .from('employees')
    .insert({
      ...employee,
      user_id: employee.user_id || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateEmployee(id: string, employee: Partial<EmployeeForm>): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .update({
      ...employee,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteEmployee(id: string): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

export async function toggleEmployeeStatus(id: string, isActive: boolean): Promise<void> {
  const { error } = await supabase
    .from('employees')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) throw error;
}

// ==================== Holidays ====================
export async function getAllHolidays(): Promise<Holiday[]> {
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .order('holiday_date', { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getHolidaysByDateRange(startDate: string, endDate: string): Promise<Holiday[]> {
  const { data, error } = await supabase
    .from('holidays')
    .select('*')
    .gte('holiday_date', startDate)
    .lte('holiday_date', endDate)
    .order('holiday_date');

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function isHoliday(date: string): Promise<boolean> {
  const { data, error } = await supabase
    .from('holidays')
    .select('id')
    .eq('holiday_date', date)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

export async function createHoliday(holidayDate: string, description?: string): Promise<Holiday> {
  const { data, error } = await supabase
    .from('holidays')
    .insert({
      holiday_date: holidayDate,
      description: description || null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteHoliday(id: string): Promise<void> {
  const { error } = await supabase
    .from('holidays')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ==================== Overtime Records ====================
export async function getAllOvertimeRecords(): Promise<OvertimeRecordWithEmployee[]> {
  const { data, error } = await supabase
    .from('overtime_records')
    .select('*, employees(*)')
    .order('work_date', { ascending: false })
    .limit(100);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getOvertimeRecordsByEmployee(
  employeeId: string,
  limit = 50
): Promise<OvertimeRecord[]> {
  const { data, error } = await supabase
    .from('overtime_records')
    .select('*')
    .eq('employee_id', employeeId)
    .order('work_date', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function getOvertimeRecordsByDateRange(
  startDate: string,
  endDate: string
): Promise<OvertimeRecordWithEmployee[]> {
  const { data, error } = await supabase
    .from('overtime_records')
    .select('*, employees(*)')
    .gte('work_date', startDate)
    .lte('work_date', endDate)
    .order('work_date', { ascending: false });

  if (error) throw error;
  return Array.isArray(data) ? data : [];
}

export async function createOvertimeRecord(
  record: OvertimeEntryForm,
  createdBy: string
): Promise<OvertimeRecord> {
  const { data, error } = await supabase
    .from('overtime_records')
    .insert({
      ...record,
      notes: record.notes || null,
      created_by: createdBy,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateOvertimeRecord(
  id: string,
  record: Partial<OvertimeEntryForm>
): Promise<void> {
  const { error } = await supabase
    .from('overtime_records')
    .update({
      ...record,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id);

  if (error) throw error;
}

export async function deleteOvertimeRecord(id: string): Promise<void> {
  const { error } = await supabase
    .from('overtime_records')
    .delete()
    .eq('id', id);

  if (error) throw error;
}

// ==================== Reports ====================
export async function getMonthlyOvertimeReport(
  year: number,
  month: number
): Promise<MonthlyOvertimeReport[]> {
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
  const endDate = new Date(year, month, 0).toISOString().split('T')[0];

  const { data: records, error } = await supabase
    .from('overtime_records')
    .select('*, employees(*)')
    .gte('work_date', startDate)
    .lte('work_date', endDate);

  if (error) throw error;

  // تجميع البيانات حسب الموظف
  const employeeMap = new Map<string, MonthlyOvertimeReport>();

  for (const record of records || []) {
    const employee = record.employees;
    if (!employee) continue;

    const key = employee.id;
    if (!employeeMap.has(key)) {
      employeeMap.set(key, {
        employee_id: employee.id,
        employee_number: employee.employee_number,
        full_name: employee.full_name,
        department: employee.department,
        base_salary: employee.base_salary,
        total_hours: 0,
        regular_hours: 0,
        holiday_hours: 0,
        regular_amount: 0,
        holiday_amount: 0,
        total_amount: 0,
      });
    }

    const report = employeeMap.get(key)!;
    const hours = Number(record.overtime_hours);
    const hourlyRate = employee.base_salary / 30 / 8;

    if (record.is_holiday) {
      report.holiday_hours += hours;
      report.holiday_amount += hours * hourlyRate * 1.5;
    } else {
      report.regular_hours += hours;
      report.regular_amount += hours * hourlyRate * 1.25;
    }

    report.total_hours += hours;
    report.total_amount = report.regular_amount + report.holiday_amount;
  }

  return Array.from(employeeMap.values());
}

export async function getDepartmentSummary(
  year: number,
  month: number
): Promise<DepartmentSummary[]> {
  const report = await getMonthlyOvertimeReport(year, month);

  const deptMap = new Map<string, DepartmentSummary>();

  for (const item of report) {
    if (!deptMap.has(item.department)) {
      deptMap.set(item.department, {
        department: item.department,
        employee_count: 0,
        total_hours: 0,
        total_amount: 0,
      });
    }

    const summary = deptMap.get(item.department)!;
    summary.employee_count += 1;
    summary.total_hours += item.total_hours;
    summary.total_amount += item.total_amount;
  }

  return Array.from(deptMap.values());
}

// ==================== Dashboard Stats ====================
export async function getDashboardStats() {
  const [employeesResult, recordsResult] = await Promise.all([
    supabase.from('employees').select('id', { count: 'exact', head: true }),
    supabase.from('overtime_records').select('id', { count: 'exact', head: true }),
  ]);

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();
  const monthlyReport = await getMonthlyOvertimeReport(currentYear, currentMonth);

  const totalAmount = monthlyReport.reduce((sum, item) => sum + item.total_amount, 0);
  const totalHours = monthlyReport.reduce((sum, item) => sum + item.total_hours, 0);

  return {
    totalEmployees: employeesResult.count || 0,
    totalRecords: recordsResult.count || 0,
    monthlyAmount: totalAmount,
    monthlyHours: totalHours,
  };
}
