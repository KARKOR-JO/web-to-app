import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, UserCheck, UserX } from 'lucide-react';
import {
  getAllEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  toggleEmployeeStatus,
  getAllProfiles,
} from '@/db/api';
import { DEPARTMENTS, type Employee, type EmployeeForm, type DepartmentType, type Profile } from '@/types/index';
import { useAuth } from '@/contexts/AuthContext';

export default function Employees() {
  const { profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [formData, setFormData] = useState<EmployeeForm>({
    employee_number: '',
    full_name: '',
    department: 'finance',
    base_salary: 0,
    user_id: '',
  });

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [employeesData, profilesData] = await Promise.all([
        getAllEmployees(),
        isAdmin ? getAllProfiles() : Promise.resolve([]),
      ]);
      setEmployees(employeesData);
      setProfiles(profilesData);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('فشل تحميل بيانات الموظفين');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employee_number || !formData.full_name || formData.base_salary <= 0) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, formData);
        toast.success('تم تحديث بيانات الموظف بنجاح');
      } else {
        await createEmployee(formData);
        toast.success('تم إضافة الموظف بنجاح');
      }
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving employee:', error);
      toast.error('فشل حفظ بيانات الموظف');
    }
  };

  const handleEdit = (employee: Employee) => {
    setEditingEmployee(employee);
    setFormData({
      employee_number: employee.employee_number,
      full_name: employee.full_name,
      department: employee.department,
      base_salary: employee.base_salary,
      user_id: employee.user_id || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا الموظف؟')) return;

    try {
      await deleteEmployee(id);
      toast.success('تم حذف الموظف بنجاح');
      loadData();
    } catch (error) {
      console.error('Error deleting employee:', error);
      toast.error('فشل حذف الموظف');
    }
  };

  const handleToggleStatus = async (id: string, currentStatus: boolean) => {
    try {
      await toggleEmployeeStatus(id, !currentStatus);
      toast.success('تم تحديث حالة الموظف بنجاح');
      loadData();
    } catch (error) {
      console.error('Error toggling status:', error);
      toast.error('فشل تحديث حالة الموظف');
    }
  };

  const resetForm = () => {
    setEditingEmployee(null);
    setFormData({
      employee_number: '',
      full_name: '',
      department: 'finance',
      base_salary: 0,
      user_id: '',
    });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 bg-muted" />
        <Skeleton className="h-64 w-full bg-muted" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إدارة الموظفين</h1>
          <p className="text-muted-foreground mt-1">عرض وإدارة بيانات الموظفين</p>
        </div>
        {isAdmin && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="ml-2 h-4 w-4" />
                إضافة موظف
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{editingEmployee ? 'تعديل بيانات الموظف' : 'إضافة موظف جديد'}</DialogTitle>
                <DialogDescription>
                  {editingEmployee ? 'قم بتعديل بيانات الموظف' : 'أدخل بيانات الموظف الجديد'}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="employee_number">رقم الموظف *</Label>
                  <Input
                    id="employee_number"
                    value={formData.employee_number}
                    onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                    placeholder="مثال: EMP001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="full_name">الاسم الكامل *</Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="أدخل الاسم الكامل"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">القسم *</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value) => setFormData({ ...formData, department: value as DepartmentType })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(DEPARTMENTS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="base_salary">الراتب الأساسي *</Label>
                  <Input
                    id="base_salary"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.base_salary || ''}
                    onChange={(e) => setFormData({ ...formData, base_salary: Number.parseFloat(e.target.value) || 0 })}
                    placeholder="0.00"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="user_id">ربط بحساب مستخدم (اختياري)</Label>
                  <Select
                    value={formData.user_id || 'none'}
                    onValueChange={(value) => setFormData({ ...formData, user_id: value === 'none' ? '' : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="اختر حساب مستخدم" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">بدون ربط</SelectItem>
                      {profiles.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.username} ({p.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    إلغاء
                  </Button>
                  <Button type="submit">
                    {editingEmployee ? 'حفظ التعديلات' : 'إضافة'}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>قائمة الموظفين ({employees.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>رقم الموظف</TableHead>
                  <TableHead>الاسم</TableHead>
                  <TableHead>القسم</TableHead>
                  <TableHead>الراتب الأساسي</TableHead>
                  <TableHead>الحالة</TableHead>
                  {isAdmin && <TableHead className="text-left">الإجراءات</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 6 : 5} className="text-center text-muted-foreground">
                      لا توجد بيانات موظفين
                    </TableCell>
                  </TableRow>
                ) : (
                  employees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.employee_number}</TableCell>
                      <TableCell>{employee.full_name}</TableCell>
                      <TableCell>{DEPARTMENTS[employee.department]}</TableCell>
                      <TableCell>{employee.base_salary.toFixed(2)} ر.س</TableCell>
                      <TableCell>
                        <Badge variant={employee.is_active ? 'default' : 'secondary'}>
                          {employee.is_active ? 'نشط' : 'غير نشط'}
                        </Badge>
                      </TableCell>
                      {isAdmin && (
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleToggleStatus(employee.id, employee.is_active)}
                              title={employee.is_active ? 'تعطيل' : 'تفعيل'}
                            >
                              {employee.is_active ? (
                                <UserX className="h-4 w-4" />
                              ) : (
                                <UserCheck className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(employee)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(employee.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
