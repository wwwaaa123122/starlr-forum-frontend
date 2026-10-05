import { cn } from '@/lib/utils';

/**
 * 分类图标：支持 emoji 或图片 URL（/api/files/...、http(s)）
 */
export function CategoryIcon({
  icon,
  className,
  imgClassName,
}: {
  icon?: string | null;
  className?: string;
  imgClassName?: string;
}) {
  if (!icon) {
    return <span className={cn('inline-block', className)}>📁</span>;
  }
  if (/^(https?:\/\/|\/api\/(files|avatars)\/)/.test(icon)) {
    return <img src={icon} alt="" className={cn('object-contain', className ?? 'size-5', imgClassName)} />;
  }
  return <span className={cn('inline-block leading-none', className)}>{icon}</span>;
}
