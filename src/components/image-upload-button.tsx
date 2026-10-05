import { useRef, useState } from 'react';
import { ImagePlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiClientError } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const MAX_IMAGES = 10;

interface UploadResponse {
  url: string;
  quotaRemaining?: number;
}

/**
 * 图片上传按钮：选择文件 → /api/upload（purpose）→ 把 Markdown 图片语法插入文本。
 * maxLength 为内容字符上限；已插入图片数超过 MAX_IMAGES 时提示并拒绝。
 */
export function ImageUploadButton({
  purpose,
  getValue,
  insertMarkdown,
  disabled,
  className,
}: {
  purpose: 'post' | 'reply' | 'avatar';
  getValue: () => string;
  insertMarkdown: (markdown: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File) {
    if (!file.type.startsWith('image/')) {
      toast.error('仅支持 JPG/PNG/GIF/WEBP 图片');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('图片不能超过 5MB');
      return;
    }
    const current = getValue();
    if ((current.match(/!\[[^\]]*\]\([^)]+\)/g) ?? []).length >= MAX_IMAGES) {
      toast.error(`最多插入 ${MAX_IMAGES} 张图片`);
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('purpose', purpose);
      const res = await api<UploadResponse>('/api/upload', { method: 'POST', body: form });
      const alt = file.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 30) || '图片';
      insertMarkdown(`![${alt}](${res.url})`);
      if (typeof res.quotaRemaining === 'number' && res.quotaRemaining <= 5) {
        toast.warning(`今日剩余上传配额：${res.quotaRemaining} 张`);
      }
    } catch (err) {
      toast.error(err instanceof ApiClientError ? err.message : '上传失败，请重试');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled || uploading}
        className={cn('text-muted-foreground h-7 gap-1.5 px-2 text-xs', className)}
        onClick={() => inputRef.current?.click()}
      >
        {uploading ? <Loader2 className="size-3.5 animate-spin" /> : <ImagePlus className="size-3.5" />}
        {uploading ? '上传中…' : '图片'}
      </Button>
    </>
  );
}
