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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { Plus, Trash2, Shield, Calendar as CalendarIcon } from 'lucide-react';
import {
  getAllProfiles,
  updateProfileRole,
  getAllHolidays,
  createHoliday,
  deleteHoliday,
} from '@/db/api';
import type { Profile, Holiday } from '@/types/index';

export default function Admin() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [holidays, setHolidays] = useState<Holiday[]>([]);
  const [loading, setLoading] = useState(true);
  const [holidayDialogOpen, setHolidayDialogOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [profilesData, holidaysData] = await Promise.all([
        getAllProfiles(),
        getAllHolidays(),
      ]);
      setProfiles(profilesData);
      setHolidays(holidaysData);
    } catch (error) {
      console.error('Error loading admin data:', error);
      toast.error('فشل تحميل البيانات');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: 'user' | 'admin') => {
    try {
      await updateProfileRole(userId, newRole);
      toast.success('تم تحديث الصلاحية بنجاح');
      loadData();
    } catch (error) {
      console.error('Error updating role:', error);
      toast.error('فشل تحديث الصلاحية');
    }
  };

  const handleAddHoliday = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!holidayForm.date) {
      toast.error('يرجى اختيار التاريخ');
      return;
    }

    try {
      await createHoliday(holidayForm.date, holidayForm.description);
      toast.success('تم إضافة العطلة بنجاح');
      setHolidayDialogOpen(false);
      setHolidayForm({ date: new Date().toISOString().split('T')[0], description: '' });
      loadData();
    } catch (error) {
      console.error('Error adding holiday:', error);
      toast.error('فشل إضافة العطلة');
    }
  };

  const handleDeleteHoliday = async (id: string) => {
    if (!confirm('هل أنت متأكد من حذف هذه العطلة؟')) return;

    try {
      await deleteHoliday(id);
      toast.success('تم حذف العطلة بنجاح');
      loadData();
    } catch (error) {
      console.error('Error deleting holiday:', error);
      toast.error('فشل حذف العطلة');
    }
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
      <div>
        <h1 className="text-3xl font-bold">لوحة الإدارة</h1>
        <p className="text-muted-foreground mt-1">إدارة المستخدمين والإعدادات</p>
      </div>

      <Tabs defaultValue="users" className="space-y-4">
        <TabsList>
          <TabsTrigger value="users">
            <Shield className="ml-2 h-4 w-4" />
            المستخدمين
          </TabsTrigger>
          <TabsTrigger value="holidays">
            <CalendarIcon className="ml-2 h-4 w-4" />
            العطل الرسمية
          </TabsTrigger>
        </TabsList>

        {/* إدارة المستخدمين */}
        <TabsContent value="users">
          <Card>
            <CardHeader>
              <CardTitle>إدارة صلاحيات المستخدمين</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>اسم المستخدم</TableHead>
                      <TableHead>الصلاحية</TableHead>
                      <TableHead>تاريخ الإنشاء</TableHead>
                      <TableHead className="text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {profiles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                          لا توجد مستخدمين
                        </TableCell>
                      </TableRow>
                    ) : (
                      profiles.map((profile) => (
                        <TableRow key={profile.id}>
                          <TableCell className="font-medium">{profile.username}</TableCell>
                          <TableCell>
                            <Badge variant={profile.role === 'admin' ? 'default' : 'secondary'}>
                              {profile.role === 'admin' ? 'مدير' : 'موظف'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(profile.created_at).toLocaleDateString('ar-SA')}
                          </TableCell>
                          <TableCell>
                            <Select
                              value={profile.role}
                              onValueChange={(value: 'user' | 'admin') =>
                                handleRoleChange(profile.id, value)
                              }
                            >
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">موظف</SelectItem>
                                <SelectItem value="admin">مدير</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* إدارة العطل الرسمية */}
        <TabsContent value="holidays">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>العطل الرسمية</CardTitle>
              <Dialog open={holidayDialogOpen} onOpenChange={setHolidayDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="ml-2 h-4 w-4" />
                    إضافة عطلة
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>إضافة عطلة رسمية</DialogTitle>
                    <DialogDescription>أدخل تاريخ ووصف العطلة الرسمية</DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleAddHoliday} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="holiday_date">التاريخ *</Label>
                      <Input
                        id="holiday_date"
                        type="date"
                        value={holidayForm.date}
                        onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="holiday_description">الوصف</Label>
                      <Input
                        id="holiday_description"
                        value={holidayForm.description}
                        onChange={(e) =>
                          setHolidayForm({ ...holidayForm, description: e.target.value })
                        }
                        placeholder="مثال: عيد الفطر"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setHolidayDialogOpen(false)}
                      >
                        إلغاء
                      </Button>
                      <Button type="submit">إضافة</Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>التاريخ</TableHead>
                      <TableHead>الوصف</TableHead>
                      <TableHead className="text-left">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {holidays.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-muted-foreground">
                          لا توجد عطل رسمية
                        </TableCell>
                      </TableRow>
                    ) : (
                      holidays.map((holiday) => (
                        <TableRow key={holiday.id}>
                          <TableCell className="font-medium">
                            {new Date(holiday.holiday_date).toLocaleDateString('ar-SA')}
                          </TableCell>
                          <TableCell>{holiday.description || '-'}</TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteHoliday(holiday.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* معلومات النظام */}
      <Card>
        <CardHeader>
          <CardTitle>معلومات النظام</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm font-medium">إجمالي المستخدمين</p>
            <p className="text-2xl font-bold">{profiles.length}</p>
          </div>
          <div>
            <p className="text-sm font-medium">المدراء</p>
            <p className="text-2xl font-bold">
              {profiles.filter((p) => p.role === 'admin').length}
            </p>
          </div>
          <div>
            <p className="text-sm font-medium">العطل الرسمية</p>
            <p className="text-2xl font-bold">{holidays.length}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
