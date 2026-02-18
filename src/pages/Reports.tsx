import { useState } from 'react';
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { FileDown, Calendar } from 'lucide-react';
import { getMonthlyOvertimeReport, getDepartmentSummary } from '@/db/api';
import { DEPARTMENTS, type MonthlyOvertimeReport, type DepartmentSummary } from '@/types/index';

export default function Reports() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [report, setReport] = useState<MonthlyOvertimeReport[]>([]);
  const [departmentSummary, setDepartmentSummary] = useState<DepartmentSummary[]>([]);
  const [loading, setLoading] = useState(false);

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const months = [
    { value: 1, label: 'يناير' },
    { value: 2, label: 'فبراير' },
    { value: 3, label: 'مارس' },
    { value: 4, label: 'أبريل' },
    { value: 5, label: 'مايو' },
    { value: 6, label: 'يونيو' },
    { value: 7, label: 'يوليو' },
    { value: 8, label: 'أغسطس' },
    { value: 9, label: 'سبتمبر' },
    { value: 10, label: 'أكتوبر' },
    { value: 11, label: 'نوفمبر' },
    { value: 12, label: 'ديسمبر' },
  ];

  const loadReport = async () => {
    setLoading(true);
    try {
      const [reportData, summaryData] = await Promise.all([
        getMonthlyOvertimeReport(year, month),
        getDepartmentSummary(year, month),
      ]);
      setReport(reportData);
      setDepartmentSummary(summaryData);
      toast.success('تم تحميل التقرير بنجاح');
    } catch (error) {
      console.error('Error loading report:', error);
      toast.error('فشل تحميل التقرير');
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    if (report.length === 0) {
      toast.error('لا توجد بيانات للتصدير');
      return;
    }

    const headers = [
      'رقم الموظف',
      'الاسم',
      'القسم',
      'الراتب الأساسي',
      'ساعات عادية',
      'ساعات عطل',
      'إجمالي الساعات',
      'مبلغ عادي',
      'مبلغ عطل',
      'الإجمالي',
    ];

    const rows = report.map((item) => [
      item.employee_number,
      item.full_name,
      DEPARTMENTS[item.department],
      item.base_salary.toFixed(2),
      item.regular_hours.toFixed(2),
      item.holiday_hours.toFixed(2),
      item.total_hours.toFixed(2),
      item.regular_amount.toFixed(2),
      item.holiday_amount.toFixed(2),
      item.total_amount.toFixed(2),
    ]);

    const csvContent = [
      '\uFEFF' + headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `overtime_report_${year}_${month}.csv`;
    link.click();
    toast.success('تم تصدير التقرير بنجاح');
  };

  const totalAmount = report.reduce((sum, item) => sum + item.total_amount, 0);
  const totalHours = report.reduce((sum, item) => sum + item.total_hours, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">التقارير</h1>
        <p className="text-muted-foreground mt-1">عرض التقارير الشهرية للوقت الإضافي</p>
      </div>

      {/* فلاتر التقرير */}
      <Card>
        <CardHeader>
          <CardTitle>اختر الفترة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-2 flex-1 min-w-[150px]">
              <label className="text-sm font-medium">السنة</label>
              <Select value={year.toString()} onValueChange={(v) => setYear(Number.parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((y) => (
                    <SelectItem key={y} value={y.toString()}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 flex-1 min-w-[150px]">
              <label className="text-sm font-medium">الشهر</label>
              <Select value={month.toString()} onValueChange={(v) => setMonth(Number.parseInt(v))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {months.map((m) => (
                    <SelectItem key={m.value} value={m.value.toString()}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={loadReport} disabled={loading}>
              <Calendar className="ml-2 h-4 w-4" />
              {loading ? 'جاري التحميل...' : 'عرض التقرير'}
            </Button>
            {report.length > 0 && (
              <Button variant="outline" onClick={exportToCSV}>
                <FileDown className="ml-2 h-4 w-4" />
                تصدير CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ملخص الإحصائيات */}
      {report.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">عدد الموظفين</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{report.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">إجمالي الساعات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalHours.toFixed(2)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">إجمالي المستحقات</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalAmount.toFixed(2)} ر.س</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ملخص الأقسام */}
      {departmentSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>ملخص حسب القسم</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>القسم</TableHead>
                    <TableHead>عدد الموظفين</TableHead>
                    <TableHead>إجمالي الساعات</TableHead>
                    <TableHead>إجمالي المبلغ</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {departmentSummary.map((dept) => (
                    <TableRow key={dept.department}>
                      <TableCell className="font-medium">{DEPARTMENTS[dept.department]}</TableCell>
                      <TableCell>{dept.employee_count}</TableCell>
                      <TableCell>{dept.total_hours.toFixed(2)} ساعة</TableCell>
                      <TableCell className="font-medium">{dept.total_amount.toFixed(2)} ر.س</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* التقرير التفصيلي */}
      <Card>
        <CardHeader>
          <CardTitle>التقرير التفصيلي</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full bg-muted" />
              <Skeleton className="h-10 w-full bg-muted" />
              <Skeleton className="h-10 w-full bg-muted" />
            </div>
          ) : report.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>اختر الفترة وانقر على "عرض التقرير" لعرض البيانات</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>رقم الموظف</TableHead>
                    <TableHead>الاسم</TableHead>
                    <TableHead>القسم</TableHead>
                    <TableHead>الراتب</TableHead>
                    <TableHead>ساعات عادية</TableHead>
                    <TableHead>ساعات عطل</TableHead>
                    <TableHead>إجمالي الساعات</TableHead>
                    <TableHead>مبلغ عادي</TableHead>
                    <TableHead>مبلغ عطل</TableHead>
                    <TableHead>الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.map((item) => (
                    <TableRow key={item.employee_id}>
                      <TableCell className="font-medium">{item.employee_number}</TableCell>
                      <TableCell>{item.full_name}</TableCell>
                      <TableCell>{DEPARTMENTS[item.department]}</TableCell>
                      <TableCell>{item.base_salary.toFixed(2)}</TableCell>
                      <TableCell>{item.regular_hours.toFixed(2)}</TableCell>
                      <TableCell>{item.holiday_hours.toFixed(2)}</TableCell>
                      <TableCell className="font-medium">{item.total_hours.toFixed(2)}</TableCell>
                      <TableCell>{item.regular_amount.toFixed(2)}</TableCell>
                      <TableCell>{item.holiday_amount.toFixed(2)}</TableCell>
                      <TableCell className="font-bold text-primary">
                        {item.total_amount.toFixed(2)} ر.س
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
