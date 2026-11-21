import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { ImagePlus, X } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { CategoryIcon } from '@/components/category-icon';
import { CATEGORY_EMOJIS, errMsg } from './shared';

export function IconPicker({ icon, onChange }: { icon: string; onChange: (v: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('purpose', 'category');
      const res = await api<{ url: string }>('/api/upload', { method: 'POST', body: form });
      onChange(res.url);
      toast.success('图片已上传，点击「创建/保存」生效');
    } catch (e) {
      toast.error(errMsg(e));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-none border">
          <CategoryIcon icon={icon} className="size-6 text-xl" />
        </span>
        <Input
          value={/^(https?:\/\/|\/api\/)/.test(icon) ? '' : icon}
          onChange={(e) => onChange(e.target.value.slice(0, 4))}
          placeholder="emoji"
          className="h-10 w-20 text-center"
          maxLength={4}
        />
        <Button type="button" variant="outline" size="sm" disabled={uploading} onClick={() => fileRef.current?.click()}>
          <ImagePlus className="size-4" /> {uploading ? '上传中…' : '图片'}
        </Button>
        {icon && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange('')}>
            <X className="size-4" />
          </Button>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/png,image/jpeg,image/gif,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void upload(f);
            e.target.value = '';
          }}
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {CATEGORY_EMOJIS.map((e: string) => (
          <button
            key={e}
            type="button"
            onClick={() => onChange(e)}
            className={`rounded-none px-1.5 py-0.5 text-base leading-none transition-colors hover:bg-accent ${
              icon === e ? 'bg-accent ring-1 ring-primary' : ''
            }`}
            aria-label={`选择图标 ${e}`}
          >
            {e}
          </button>
        ))}
      </div>
    </div>
  );
}
