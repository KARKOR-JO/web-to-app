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
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Calendar } from 'lucide-react';
import {
  getActiveEmployees,
  getAllOvertimeRecords,
  createOvertimeRecord,
  updateOvertimeRecord,
  deleteOvertimeRecord,
  isHoliday,
} from '@/db/api';
import { DEPARTMENTS, type Employee, type OvertimeRecord, type OvertimeEntryForm } from '@/types/index';
import { useAuth } from '@/contexts/AuthContext';

export default function OvertimeEntry() {
  const { user, profile } = useAuth();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [records, setRecords] = useState<OvertimeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<OvertimeRecord | null>(null);
  const [formData, setFormData] = useState<OvertimeEntryForm>({
    employee_id: '',
    work_date: new Date().toISOString().split('T')[0],
    overtime_hours: 0,
    is_holiday: false,
    notes: '',
  });

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [employeesData, recordsData] = await Promise.all([
        getActiveEmployees(),
        getAllOvertimeRecords(),
      ]);
      setEmployees(employeesData);
      setRecords(recordsData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const checkHoliday = async (date: string) => {
    try {
      const isHol = await isHoliday(date);
      setFormData((prev: OvertimeEntryForm) => ({ ...prev, is_holiday: isHol }));
      if (isHol) {
        toast.info('هذا اليوم عطلة رسمية');
      }
    } catch (error) {
      console.error('Error checking holiday:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.employee_id || !formData.work_date || formData.overtime_hours <= 0) {
      toast.error('يرجى ملء جميع الحقول المطلوبة');
      return;
    }

    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    try {
      if (editingRecord) {
        await updateOvertimeRecord(editingRecord.id, formData);
        toast.success('تم تحديث السجل بنجاح');
      } else {
        await createOvertimeRecord(formData, user.id);
        toast.success('تم إضافة السجل بنجاح');
      }
      setDialogOpen(false);
      resetForm();
      loadData();
    } catch (error) {
      console.error('Error saving record:', error);
      toast.error('فشل حفظ السجل');
    }
  };

  const handleEdit = (record: OvertimeRecord) => {
    setEditingRecord(record);
    setFormData({
      employee_id: record.employee_id,
      work_date: record.work_date,
      overtime_hours: record.overtime_hours,
      is_holiday: record.is_holiday,
      notes: record.notes || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذا السجل؟')) return;

    try {
      await deleteOvertimeRecord(id);
      toast.success('تم حذف السجل بنجاح');
      loadData();
    } catch (error) {
      console.error('Error deleting record:', error);
      toast.error('فشل حذف السجل');
    }
  };

  const resetForm = () => {
    setEditingRecord(null);
    setFormData({
      employee_id: '',
      work_date: new Date().toISOString().split('T')[0],
      overtime_hours: 0,
      is_holiday: false,
      notes: '',
    });
  };

  const calculateAmount = (baseSalary: number, hours: number, isHol: boolean) => {
    const hourlyRate = baseSalary / 30 / 8;
    const multiplier = isHol ? 1.5 : 1.25;
    return (hourlyRate * multiplier * hours).toFixed(2);
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
          <h1 className="text-3xl font-bold">تسجيل الوقت الإضافي</h1>
          <p className="text-muted-foreground mt-1">إضافة وإدارة سجلات الوقت الإضافي</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="ml-2 h-4 w-4" />
              إضافة سجل
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingRecord ? 'تعديل السجل' : 'إضافة سجل جديد'}</DialogTitle>
              <DialogDescription>
                {editingRecord ? 'قم بتعديل بيانات السجل' : 'أدخل بيانات الوقت الإضافي'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="employee_id">الموظف *</Label>
                <Select
                  value={formData.employee_id}
                  onValueChange={(value) => setFormData({ ...formData, employee_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر موظف" />
                  </SelectTrigger>
                  <SelectContent>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name} - {emp.employee_number}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="work_date">تاريخ العمل *</Label>
                <Input
                  id="work_date"
                  type="date"
                  value={formData.work_date}
                  onChange={(e) => {
                    setFormData({ ...formData, work_date: e.target.value });
                    checkHoliday(e.target.value);
                  }}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="overtime_hours">عدد الساعات *</Label>
                <Input
                  id="overtime_hours"
                  type="number"
                  step="0.25"
                  min="0"
                  value={formData.overtime_hours || ''}
                  onChange={(e) => setFormData({ ...formData, overtime_hours: Number.parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="flex items-center space-x-2 space-x-reverse">
                <Checkbox
                  id="is_holiday"
                  checked={formData.is_holiday}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_holiday: checked as boolean })}
                />
                <Label htmlFor="is_holiday" className="cursor-pointer">
                  عطلة رسمية (معامل 1.5 بدلاً من 1.25)
                </Label>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">ملاحظات</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="أدخل أي ملاحظات إضافية"
                  rows={3}
                />
              </div>
              {formData.employee_id && formData.overtime_hours > 0 && (
                <div className="p-3 bg-muted rounded-lg">
                  <p className="text-sm font-medium">المبلغ المتوقع:</p>
                  <p className="text-lg font-bold text-primary">
                    {calculateAmount(
                      employees.find((e) => e.id === formData.employee_id)?.base_salary || 0,
                      formData.overtime_hours,
                      formData.is_holiday
                    )}{' '}
                    ر.س
                  </p>
                </div>
              )}
              <div className="flex gap-2 justify-end">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  إلغاء
                </Button>
                <Button type="submit">
                  {editingRecord ? 'حفظ التعديلات' : 'إضافة'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>سجلات الوقت الإضافي ({records.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>التاريخ</TableHead>
                  <TableHead>الموظف</TableHead>
                  <TableHead>القسم</TableHead>
                  <TableHead>الساعات</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>المبلغ</TableHead>
                  <TableHead className="text-left">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground">
                      لا توجد سجلات
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => {
                    const employee = employees.find((e) => e.id === record.employee_id);
                    return (
                      <TableRow key={record.id}>
                        <TableCell>{new Date(record.work_date).toLocaleDateString('ar-SA')}</TableCell>
                        <TableCell className="font-medium">
                          {employee?.full_name || 'غير معروف'}
                        </TableCell>
                        <TableCell>
                          {employee ? DEPARTMENTS[employee.department] : '-'}
                        </TableCell>
                        <TableCell>{record.overtime_hours} ساعة</TableCell>
                        <TableCell>
                          <Badge variant={record.is_holiday ? 'default' : 'secondary'}>
                            {record.is_holiday ? 'عطلة رسمية' : 'يوم عادي'}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {employee
                            ? calculateAmount(employee.base_salary, record.overtime_hours, record.is_holiday)
                            : '0.00'}{' '}
                          ر.س
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2 justify-end">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(record)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(record.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
