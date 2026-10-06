/**
 * 浏览器端图片压缩（上传前）。
 *
 * 策略：
 *   - GIF 不处理（Canvas 会丢动画帧）
 *   - ≤ 500KB 不处理（体积已小，重编码得不偿失）
 *   - 长边 > 1920px 缩到 1920，PNG 保持 PNG（无损重编码，保留透明通道与文字锐度），
 *     其余（JPEG/WebP）重编码为 JPEG 质量 0.82
 *   - 压缩结果比原文件还大（≥ 原大小的 90%）时直接用原文件
 *
 * 全程在用户浏览器完成，服务端原有的魔数/大小/配额校验不变。
 */
const MAX_EDGE = 1920;
const MIN_SIZE = 500 * 1024;
const JPEG_QUALITY = 0.82;

export interface CompressResult {
  file: File;
  /** 是否发生了压缩（用于提示用户） */
  compressed: boolean;
  originalSize: number;
}

export async function compressImage(file: File): Promise<CompressResult> {
  if (file.type === 'image/gif' || file.size <= MIN_SIZE) {
    return { file, compressed: false, originalSize: file.size };
  }
  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale));
    const h = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return { file, compressed: false, originalSize: file.size };
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();

    // PNG 保持 PNG（避免透明通道变黑底、截图文字发糊）
    const mime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mime, JPEG_QUALITY));
    if (!blob || blob.size >= file.size * 0.9) {
      return { file, compressed: false, originalSize: file.size };
    }
    const base = file.name.replace(/\.[a-z0-9]+$/i, '') || 'image';
    const out = new File([blob], `${base}.${mime === 'image/png' ? 'png' : 'jpg'}`, { type: mime });
    return { file: out, compressed: true, originalSize: file.size };
  } catch {
    // 解码失败（罕见格式/老浏览器）：原样上传，交给服务端校验兜底
    return { file, compressed: false, originalSize: file.size };
  }
}

/** 人类可读的文件大小 */
export function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
  return `${Math.max(1, Math.round(bytes / 1024))}KB`;
}
