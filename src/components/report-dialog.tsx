/** 举报对话框：帖子/回复通用（从 post-detail.tsx 提出，供详情页两处复用） */
import { useState } from 'react';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

export function ReportDialog({
  open,
  onOpenChange,
  targetType,
  targetId,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  targetType: 'post' | 'reply';
  targetId: string;
}) {
  const [reason, setReason] = useState('spam');
  const [detail, setDetail] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    setSubmitting(true);
    try {
      await api('/api/reports', { method: 'POST', body: { targetType, targetId, reason, detail } });
      toast.success('举报已提交，管理员会尽快处理');
      onOpenChange(false);
      setDetail('');
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : '举报失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>举报内容</DialogTitle>
          <DialogDescription>请选择举报原因，恶意举报可能导致账号受限。</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>原因</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="spam">垃圾广告 / 灌水</SelectItem>
                <SelectItem value="abuse">辱骂 / 人身攻击</SelectItem>
                <SelectItem value="porn">色情低俗</SelectItem>
                <SelectItem value="illegal">违法违规</SelectItem>
                <SelectItem value="other">其他</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>补充说明（可选）</Label>
            <Textarea value={detail} onChange={(e) => setDetail(e.target.value)} maxLength={1000} rows={3} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={() => void submit()} disabled={submitting}>
            提交举报
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
