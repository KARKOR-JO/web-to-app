import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Download, AlertCircle } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  getActiveEmployees,
  createOvertimeRecord,
} from '@/db/api';
import { type Employee } from '@/types/index';
import { useAuth } from '@/contexts/AuthContext';

interface ImportRow {
  employee_id: string;
  work_date: string;
  end_time: string;
  overtime_hours: number;
  is_holiday: boolean;
  status?: 'pending' | 'success' | 'error';
  error?: string;
}

export default function OvertimeEntry() {
  const { user } = useAuth();
  const [importData, setImportData] = useState<ImportRow[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [baseSalary, setBaseSalary] = useState<string>('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const employeesData = await getActiveEmployees();
      setEmployees(employeesData);
    } catch (error) {
      console.error('Error loading employees:', error);
      toast.error('فشل تحميل قائمة الموظفين');
    } finally {
      setLoading(false);
    }
  };

  const calculateOvertimeHours = (endTime: string, isHoliday: boolean = false): number => {
    try {
      // في حالة العطلة الرسمية: جميع الساعات من 8:00 صباحاً تعتبر وقت إضافي
      // في الأيام العادية: الساعات بعد 4:30 مساءً فقط
      const startHour = isHoliday ? 8 : 16;
      const startMinute = isHoliday ? 0 : 30;
      const startInMinutes = startHour * 60 + startMinute;

      let endHour = 0;
      let endMinute = 0;

      // دعم صيغة النقطة العشرية (مثال: 4.30 = 4:30 مساءً)
      if (endTime.includes('.')) {
        const parts = endTime.split('.');
        const hour = Number.parseInt(parts[0]);
        const minute = Number.parseInt(parts[1] || '0');
        
        if (Number.isNaN(hour) || Number.isNaN(minute)) return 0;
        
        // إذا كانت الساعة أقل من 12، نفترض أنها مساءً (PM)
        endHour = hour < 12 ? hour + 12 : hour;
        endMinute = minute;
      } 
      // دعم صيغة النقطتين (مثال: 18:30)
      else if (endTime.includes(':')) {
        const timeParts = endTime.split(':');
        if (timeParts.length < 2) return 0;

        endHour = Number.parseInt(timeParts[0]);
        endMinute = Number.parseInt(timeParts[1]);
        
        if (Number.isNaN(endHour) || Number.isNaN(endMinute)) return 0;
      }
      // صيغة رقم فقط (مثال: 1830 = 18:30)
      else {
        const timeStr = endTime.replace(/\s/g, '');
        if (timeStr.length === 3 || timeStr.length === 4) {
          endHour = Number.parseInt(timeStr.slice(0, -2));
          endMinute = Number.parseInt(timeStr.slice(-2));
        } else {
          return 0;
        }
      }

      const endInMinutes = endHour * 60 + endMinute;

      // حساب الفرق بالدقائق
      const overtimeMinutes = Math.max(0, endInMinutes - startInMinutes);

      // تحويل إلى ساعات (مع رقمين عشريين)
      return Math.round((overtimeMinutes / 60) * 100) / 100;
    } catch (error) {
      console.error('Error calculating overtime:', error);
      return 0;
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0]);
    }
  };

  const handleFile = async (file: File) => {
    const validTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];

    if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
      toast.error('نوع الملف غير مدعوم. يرجى استخدام ملفات Excel أو CSV');
      return;
    }

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, string | number>>(worksheet);

      // معالجة البيانات - التركيز على ساعات الانتهاء فقط
      const processedData: ImportRow[] = jsonData
        .map((row) => {
          // ساعة الانتهاء (العمود الوحيد المطلوب)
          const endTime = String(
            row['ساعة الانتهاء'] || row['وقت الخروج'] || row['end_time'] || row['End Time'] || 
            row['checkout_time'] || row['Checkout Time'] || row['الوقت'] || row['Time'] || 
            row['ساعة الخروج'] || row['وقت'] || Object.values(row)[0] || ''
          ).trim();

          // حساب ساعات الوقت الإضافي من وقت الانتهاء
          const overtimeHours = calculateOvertimeHours(endTime);

          return {
            employee_id: '', // سيتم تحديده يدوياً من قبل المستخدم
            work_date: selectedDate,
            end_time: endTime,
            overtime_hours: overtimeHours,
            is_holiday: false,
            status: 'pending' as const,
          };
        })
        // تصفية السجلات: إزالة الساعات الصفرية
        .filter((record) => record.overtime_hours > 0);

      setImportData(processedData);
      
      if (processedData.length === 0) {
        toast.error('لا توجد ساعات وقت إضافي في الملف (جميع الساعات قبل 4:30 مساءً)');
      } else {
        toast.success(`تم قراءة ${processedData.length} سجل من الملف (تم تجاهل الساعات الصفرية)`);
      }
    } catch (error) {
      console.error('Error reading file:', error);
      toast.error('فشل قراءة الملف. تأكد من صيغة الملف');
    }
  };

  const validateAndImport = async () => {
    if (!user) {
      toast.error('يجب تسجيل الدخول أولاً');
      return;
    }

    if (importData.length === 0) {
      toast.error('لا توجد بيانات للاستيراد');
      return;
    }

    setImporting(true);
    const updatedData = [...importData];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < updatedData.length; i++) {
      const row = updatedData[i];

      try {
        // التحقق من البيانات
        if (!row.employee_id) {
          throw new Error('يجب اختيار الموظف');
        }

        if (!row.work_date) {
          throw new Error('تاريخ العمل مطلوب');
        }

        if (!row.overtime_hours || row.overtime_hours <= 0) {
          throw new Error('عدد الساعات يجب أن يكون أكبر من صفر');
        }

        // إضافة السجل (استخدام القيمة اليدوية للعطلة)
        await createOvertimeRecord(
          {
            employee_id: row.employee_id,
            work_date: row.work_date,
            overtime_hours: row.overtime_hours,
            is_holiday: row.is_holiday,
          },
          user.id
        );

        updatedData[i].status = 'success';
        successCount++;
      } catch (error) {
        updatedData[i].status = 'error';
        updatedData[i].error = error instanceof Error ? error.message : 'خطأ غير معروف';
        errorCount++;
      }

      setImportData([...updatedData]);
    }

    setImporting(false);
    
    if (successCount > 0) {
      toast.success(`تم استيراد ${successCount} سجل بنجاح`);
    }
    
    if (errorCount > 0) {
      toast.error(`فشل استيراد ${errorCount} سجل`);
    }
  };

  const downloadTemplate = () => {
    const template = [
      { 'ساعة الانتهاء': '6.30' },
      { 'ساعة الانتهاء': '7.00' },
      { 'ساعة الانتهاء': '5.15' },
      { 'ساعة الانتهاء': '8.00' },
      { 'ساعة الانتهاء': '4.30' },
      { 'ساعة الانتهاء': '6.45' },
      { 'ساعة الانتهاء': '7.30' },
      { 'ساعة الانتهاء': '5.00' },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Overtime Template');
    XLSX.writeFile(wb, 'overtime_template.xlsx');
    toast.success('تم تحميل ملف النموذج');
  };

  const clearData = () => {
    setImportData([]);
  };

  const calculateOvertimePayment = (overtimeHours: number, isHoliday: boolean): number => {
    if (!baseSalary || Number.isNaN(Number(baseSalary)) || Number(baseSalary) <= 0) {
      return 0;
    }

    const salary = Number(baseSalary);
    // حساب قيمة الساعة الأساسية: الراتب ÷ 30 يوم ÷ 8 ساعات
    const hourlyRate = salary / 30 / 8;
    
    // تطبيق المعامل المناسب
    const multiplier = isHoliday ? 1.5 : 1.25;
    
    // حساب المبلغ المستحق
    const payment = hourlyRate * multiplier * overtimeHours;
    
    return Math.round(payment * 100) / 100; // تقريب لرقمين عشريين
  };

  const getTotalPayment = (): number => {
    return importData.reduce((total, row) => {
      return total + calculateOvertimePayment(row.overtime_hours, row.is_holiday);
    }, 0);
  };

  const toggleHoliday = (index: number) => {
    const updatedData = [...importData];
    const newHolidayStatus = !updatedData[index].is_holiday;
    updatedData[index].is_holiday = newHolidayStatus;
    
    // إعادة حساب ساعات الوقت الإضافي بناءً على الحالة الجديدة
    // في العطلة الرسمية: جميع الساعات من 8:00 صباحاً تعتبر وقت إضافي
    // في اليوم العادي: الساعات بعد 4:30 مساءً فقط
    updatedData[index].overtime_hours = calculateOvertimeHours(
      updatedData[index].end_time,
      newHolidayStatus
    );
    
    setImportData(updatedData);
    
    if (newHolidayStatus) {
      toast.info('تم تحديد اليوم كعطلة رسمية - جميع الساعات من 8:00 صباحاً تحتسب كوقت إضافي');
    }
  };

  const updateEmployee = (index: number, employeeId: string) => {
    const updatedData = [...importData];
    updatedData[index].employee_id = employeeId;
    
    // إذا كان هذا هو السجل الأول، قم بتطبيق نفس الموظف على جميع السجلات المتبقية
    if (index === 0) {
      for (let i = 1; i < updatedData.length; i++) {
        if (updatedData[i].status === 'pending') {
          updatedData[i].employee_id = employeeId;
        }
      }
      toast.success('تم تطبيق الموظف على جميع السجلات');
    }
    
    setImportData(updatedData);
  };

  const pendingCount = importData.filter((r) => r.status === 'pending').length;
  const successCount = importData.filter((r) => r.status === 'success').length;
  const errorCount = importData.filter((r) => r.status === 'error').length;

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
          <p className="text-muted-foreground mt-1">استيراد سجلات الوقت الإضافي من ملفات Excel أو CSV</p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="ml-2 h-4 w-4" />
          تحميل ملف نموذجي
        </Button>
      </div>

      {/* إدخال الراتب الأساسي - خانة فعالة */}
      <Card className="border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-xl">
            <span className="text-2xl">💰</span>
            إدخال الراتب الأساسي
          </CardTitle>
          <CardDescription className="text-base">
            أدخل الراتب الأساسي الشهري بالدينار الأردني لحساب مستحقات الوقت الإضافي تلقائياً
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-3">
              <Label htmlFor="base-salary" className="text-lg font-bold">
                الراتب الأساسي الشهري (دينار أردني) *
              </Label>
              <Input
                id="base-salary"
                type="number"
                placeholder="مثال: 1000"
                value={baseSalary}
                onChange={(e) => setBaseSalary(e.target.value)}
                min="0"
                step="0.01"
                className="text-xl font-bold h-14 text-center border-2"
              />
            </div>
            
            {baseSalary && Number(baseSalary) > 0 ? (
              <div className="bg-background rounded-lg p-4 space-y-2 border-2 border-green-500/30">
                <h4 className="font-bold text-green-600 mb-3">تفاصيل الحساب:</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="font-medium">قيمة الساعة الأساسية:</span>
                    <span className="font-bold text-lg">
                      {(Number(baseSalary) / 30 / 8).toFixed(3)} د.أ
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="font-medium">قيمة ساعة الوقت الإضافي (يوم عادي × 1.25):</span>
                    <span className="font-bold text-lg text-blue-600">
                      {((Number(baseSalary) / 30 / 8) * 1.25).toFixed(3)} د.أ
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="font-medium">قيمة ساعة الوقت الإضافي (عطلة رسمية × 1.5):</span>
                    <span className="font-bold text-lg text-green-600">
                      {((Number(baseSalary) / 30 / 8) * 1.5).toFixed(3)} د.أ
                    </span>
                  </div>
                </div>
                <div className="mt-3 p-3 bg-green-50 dark:bg-green-950 rounded border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium">
                    ✓ الراتب جاهز للحساب - سيتم احتساب المستحقات تلقائياً عند استيراد البيانات
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-yellow-50 dark:bg-yellow-950 rounded-lg p-4 border-2 border-yellow-300 dark:border-yellow-800">
                <p className="text-yellow-800 dark:text-yellow-200 font-medium">
                  ⚠️ يرجى إدخال الراتب الأساسي لتفعيل حساب المستحقات المالية
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* اختيار التاريخ */}
      <Card>
        <CardHeader>
          <CardTitle>تحديد تاريخ العمل</CardTitle>
          <CardDescription>اختر التاريخ الذي تنطبق عليه جميع ساعات الخروج المستوردة</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-2">
            <Label htmlFor="work-date" className="text-base font-medium">
              تاريخ العمل
            </Label>
            <Input
              id="work-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="max-w-xs"
            />
          </div>
        </CardContent>
      </Card>

      {/* منطقة رفع الملف */}
      <Card>
        <CardHeader>
          <CardTitle>رفع الملف</CardTitle>
          <CardDescription>اسحب وأفلت ملف Excel أو CSV، أو انقر للاختيار</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-12 text-center transition-colors ${
              dragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-accent/50'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              type="file"
              id="file-upload"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileInput}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="flex flex-col items-center gap-4">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <p className="text-lg font-medium">اسحب الملف هنا أو انقر للاختيار</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    الصيغ المدعومة: Excel (.xlsx, .xls) أو CSV (.csv)
                  </p>
                </div>
                <Button type="button" variant="outline">
                  <FileSpreadsheet className="ml-2 h-4 w-4" />
                  اختيار ملف
                </Button>
              </div>
            </label>
          </div>
        </CardContent>
      </Card>

      {/* تعليمات */}
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>تعليمات الاستيراد وحساب المستحقات</AlertTitle>
        <AlertDescription>
          <ul className="list-disc list-inside space-y-1 mt-2 text-sm">
            <li><strong>الملف يحتاج عمود واحد فقط:</strong> ساعة الانتهاء (وقت الخروج)</li>
            <li><strong>صيغة الساعة:</strong> استخدم النقطة العشرية (مثال: 4.30 = 4:30 مساءً، 6.00 = 6:00 مساءً، 7.15 = 7:15 مساءً)</li>
            <li>ضع كل ساعة خروج في صف منفصل في ملف Excel</li>
            <li><strong>الراتب الأساسي:</strong> أدخل الراتب الأساسي بالدينار الأردني لحساب المستحقات المالية</li>
            <li><strong>معادلة الحساب:</strong> (الراتب ÷ 30 يوم ÷ 8 ساعات) × المعامل × عدد الساعات</li>
            <li>التاريخ: يتم تحديده مرة واحدة ويطبق على جميع السجلات</li>
            <li><strong>اختيار الموظف:</strong> عند اختيار موظف للسجل الأول، سيتم تطبيقه تلقائياً على جميع السجلات</li>
            <li><strong>حساب الوقت الإضافي:</strong></li>
            <li className="mr-4">• يوم عادي: أي ساعة بعد 4:30 مساءً = وقت إضافي</li>
            <li className="mr-4">• عطلة رسمية: جميع الساعات من 8:00 صباحاً = وقت إضافي</li>
            <li><strong>تجاهل الساعات الصفرية:</strong> السجلات التي لا تحتوي على وقت إضافي يتم تجاهلها تلقائياً</li>
            <li>تحديد العطل: اضغط على الزر لتحديد أي يوم كعطلة رسمية (سيتم إعادة حساب الساعات تلقائياً)</li>
            <li><strong>المعاملات:</strong> يوم عادي (1.25×) | عطلة رسمية (1.5×)</li>
            <li>حمّل الملف النموذجي لرؤية الصيغة الصحيحة</li>
          </ul>
        </AlertDescription>
      </Alert>

      {/* معاينة البيانات */}
      {importData.length > 0 && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>معاينة البيانات ({importData.length} سجل)</CardTitle>
                <CardDescription>
                  {pendingCount > 0 && `${pendingCount} في الانتظار`}
                  {successCount > 0 && ` • ${successCount} نجح`}
                  {errorCount > 0 && ` • ${errorCount} فشل`}
                  {baseSalary && Number(baseSalary) > 0 && (
                    <span className="font-medium text-primary">
                      {' • '}الإجمالي: {getTotalPayment().toFixed(2)} دينار أردني
                    </span>
                  )}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearData} disabled={importing}>
                  مسح البيانات
                </Button>
                <Button onClick={validateAndImport} disabled={importing || pendingCount === 0}>
                  {importing ? 'جاري الاستيراد...' : 'استيراد البيانات'}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>الحالة</TableHead>
                      <TableHead>اختر الموظف</TableHead>
                      <TableHead>ساعة الخروج</TableHead>
                      <TableHead>ساعات الوقت الإضافي</TableHead>
                      <TableHead>نوع اليوم</TableHead>
                      <TableHead>المبلغ المستحق (دينار)</TableHead>
                      <TableHead>الخطأ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importData.map((row, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          {row.status === 'pending' && (
                            <Badge variant="secondary">في الانتظار</Badge>
                          )}
                          {row.status === 'success' && (
                            <Badge variant="default" className="bg-green-500">
                              <CheckCircle className="ml-1 h-3 w-3" />
                              نجح
                            </Badge>
                          )}
                          {row.status === 'error' && (
                            <Badge variant="destructive">
                              <XCircle className="ml-1 h-3 w-3" />
                              فشل
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.status === 'pending' ? (
                            <Select
                              value={row.employee_id}
                              onValueChange={(value) => updateEmployee(index, value)}
                            >
                              <SelectTrigger className="w-48">
                                <SelectValue placeholder="اختر موظف" />
                              </SelectTrigger>
                              <SelectContent>
                                {employees.map((emp) => (
                                  <SelectItem key={emp.id} value={emp.id}>
                                    {emp.full_name} ({emp.employee_number})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <span className="font-medium">
                              {employees.find((e) => e.id === row.employee_id)?.full_name || '-'}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="font-bold text-primary text-lg">{row.end_time}</TableCell>
                        <TableCell>
                          {row.overtime_hours > 0 ? (
                            <span className="font-bold text-lg">{row.overtime_hours} ساعة</span>
                          ) : (
                            <span className="text-muted-foreground">لا يوجد</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {row.status === 'pending' ? (
                            <Button
                              variant={row.is_holiday ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => toggleHoliday(index)}
                            >
                              {row.is_holiday ? 'عطلة رسمية (1.5×)' : 'يوم عادي (1.25×)'}
                            </Button>
                          ) : (
                            <Badge variant={row.is_holiday ? 'default' : 'secondary'}>
                              {row.is_holiday ? 'عطلة رسمية' : 'يوم عادي'}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {baseSalary && Number(baseSalary) > 0 ? (
                            <span className="font-bold text-lg text-green-600">
                              {calculateOvertimePayment(row.overtime_hours, row.is_holiday).toFixed(2)} د.أ
                            </span>
                          ) : (
                            <span className="text-muted-foreground text-sm">أدخل الراتب</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-destructive">{row.error || '-'}</TableCell>
                      </TableRow>
                    ))}
                    {importData.length > 0 && baseSalary && Number(baseSalary) > 0 && (
                      <TableRow className="bg-muted/50 font-bold">
                        <TableCell colSpan={5} className="text-left">
                          الإجمالي الكلي
                        </TableCell>
                        <TableCell className="text-lg text-green-600">
                          {getTotalPayment().toFixed(2)} د.أ
                        </TableCell>
                        <TableCell></TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
