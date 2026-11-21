/** 账号安全卡片：退出所有设备 */
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { LogOut } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function SecurityCard() {
  const { logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Card>
      <CardHeader>
        <CardTitle>账号安全</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          onClick={async () => {
            await api('/api/auth/logout-all', { method: 'POST' });
            await logout();
            toast.success('已退出所有设备');
            navigate('/');
          }}
        >
          <LogOut className="size-4" /> 退出所有设备
        </Button>
      </CardContent>
    </Card>
  );
}
