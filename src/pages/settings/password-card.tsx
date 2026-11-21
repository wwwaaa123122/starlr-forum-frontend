/** 修改密码卡片：成功后强制全设备重新登录 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { KeyRound } from 'lucide-react';
import { api, ApiClientError } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function PasswordCard() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPw, setChangingPw] = useState(false);

  return (
    <Card>
      <CardHeader>
        <CardTitle>修改密码</CardTitle>
        <CardDescription>修改成功后，所有设备需要重新登录</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="max-w-sm space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (newPassword.length < 8) {
              toast.error('新密码至少 8 位');
              return;
            }
            if (newPassword !== confirmPassword) {
              toast.error('两次输入的新密码不一致');
              return;
            }
            setChangingPw(true);
            try {
              await api('/api/me/password', {
                method: 'PATCH',
                body: { currentPassword: currentPassword, newPassword },
              });
              toast.success('密码已修改，请重新登录');
              await logout();
              navigate('/login');
            } catch (err) {
              toast.error(err instanceof ApiClientError ? err.message : '修改失败');
            } finally {
              setChangingPw(false);
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="current-password">当前密码</Label>
            <Input
              id="current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="new-password">新密码（至少 8 位）</Label>
            <Input
              id="new-password"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirm-password">确认新密码</Label>
            <Input
              id="confirm-password"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
            />
          </div>
          <Button type="submit" loading={changingPw}>
            <KeyRound className="size-4" /> 修改密码
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
