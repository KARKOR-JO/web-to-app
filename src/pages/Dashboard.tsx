import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { getDashboardStats, getEmployeeByUserId } from '@/db/api';
import { useAuth } from '@/contexts/AuthContext';
import { Users, Clock, DollarSign, FileText } from 'lucide-react';
import type { Employee } from '@/types/index';

export default function Dashboard() {
  const { user, profile } = useAuth();
  const [stats, setStats] = useState({
    totalEmployees: 0,
    totalRecords: 0,
    monthlyAmount: 0,
    monthlyHours: 0,
  });
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [statsData, employeeData] = await Promise.all([
          getDashboardStats(),
          user ? getEmployeeByUserId(user.id) : Promise.resolve(null),
        ]);
        setStats(statsData);
        setEmployee(employeeData);
      } catch (error) {
        console.error('Error loading dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [user]);

  const isAdmin = profile?.role === 'admin';

  const statCards = [
    {
      title: 'إجمالي الموظفين',
      value: stats.totalEmployees,
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      show: isAdmin,
    },
    {
      title: 'إجمالي السجلات',
      value: stats.totalRecords,
      icon: FileText,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
      show: isAdmin,
    },
    {
      title: 'ساعات الشهر الحالي',
      value: stats.monthlyHours.toFixed(2),
      icon: Clock,
      color: 'text-chart-3',
      bgColor: 'bg-chart-3/10',
      show: true,
    },
    {
      title: 'مستحقات الشهر الحالي',
      value: `${stats.monthlyAmount.toFixed(2)} ر.س`,
      icon: DollarSign,
      color: 'text-chart-4',
      bgColor: 'bg-chart-4/10',
      show: true,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">مرحباً، {profile?.username}</h1>
        <p className="text-muted-foreground mt-1">
          {isAdmin ? 'لوحة تحكم المدير' : 'لوحة التحكم الخاصة بك'}
        </p>
      </div>

      {/* معلومات الموظف */}
      {!isAdmin && employee && (
        <Card>
          <CardHeader>
            <CardTitle>معلوماتك الشخصية</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">رقم الموظف</p>
                <p className="font-medium">{employee.employee_number}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">الاسم الكامل</p>
                <p className="font-medium">{employee.full_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">القسم</p>
                <p className="font-medium">{employee.department}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards
          .filter((card) => card.show)
          .map((card) => {
            const Icon = card.icon;
            return (
              <Card key={card.title}>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                  <div className={`p-2 rounded-lg ${card.bgColor}`}>
                    <Icon className={`h-4 w-4 ${card.color}`} />
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <Skeleton className="h-8 w-24 bg-muted" />
                  ) : (
                    <div className="text-2xl font-bold">{card.value}</div>
                  )}
                </CardContent>
              </Card>
            );
          })}
      </div>

      {/* رسالة ترحيبية */}
      <Card>
        <CardHeader>
          <CardTitle>mohammad drabee HR</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            مرحباً بك في نظام mohammad drabee HR لإدارة الموارد البشرية. يمكنك من خلال هذا النظام:
          </p>
          <ul className="list-disc list-inside space-y-2 text-muted-foreground">
            {isAdmin ? (
              <>
                <li>إدارة بيانات الموظفين وأقسامهم</li>
                <li>تسجيل ساعات العمل الإضافية لجميع الموظفين</li>
                <li>عرض التقارير الشهرية والإحصائيات</li>
                <li>إدارة العطل الرسمية</li>
                <li>إدارة صلاحيات المستخدمين</li>
              </>
            ) : (
              <>
                <li>عرض معلوماتك الشخصية</li>
                <li>تسجيل ساعات العمل الإضافية الخاصة بك</li>
                <li>عرض سجل الوقت الإضافي الخاص بك</li>
                <li>متابعة مستحقاتك الشهرية</li>
              </>
            )}
          </ul>
        </CardContent>
      </Card>

      {/* معلومات حساب الوقت الإضافي */}
      <Card>
        <CardHeader>
          <CardTitle>كيفية حساب الوقت الإضافي</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="font-medium">ساعات العمل الرسمية:</p>
            <p className="text-sm text-muted-foreground">من 8:00 صباحاً حتى 4:30 مساءً</p>
          </div>
          <div>
            <p className="font-medium">معادلة حساب الوقت الإضافي:</p>
            <ul className="text-sm text-muted-foreground space-y-1 mt-1">
              <li>• الأيام العادية: (الراتب ÷ 30 ÷ 8) × 1.25</li>
              <li>• العطل الرسمية: (الراتب ÷ 30 ÷ 8) × 1.5</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
