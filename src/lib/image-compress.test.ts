/** lib/image-compress 单测：formatSize 纯函数 + compressImage 策略分支（stub Canvas API） */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatSize, compressImage } from './image-compress';

describe('formatSize', () => {
  it('KB 档（不足 1MB）', () => {
    expect(formatSize(0)).toBe('1KB'); // Math.max(1, …) 兜底
    expect(formatSize(500 * 1024)).toBe('500KB');
  });
  it('MB 档', () => {
    expect(formatSize(1024 * 1024)).toBe('1.0MB');
    expect(formatSize(2.5 * 1024 * 1024)).toBe('2.5MB');
  });
});

function makeFile(size: number, type: string, name = 'photo.png'): File {
  const blob = new Blob([new Uint8Array(size)], { type });
  return new File([blob], name, { type });
}

/** stub createImageBitmap + canvas，控制编码产物体积 */
function stubCanvas(encodedSize: number, dims = { width: 4000, height: 3000 }) {
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ width: dims.width, height: dims.height, close: () => {} })),
  );
  const toBlob = vi.fn(
    (_cb: (b: Blob | null) => void, _mime: string, _q?: number) =>
      _cb(new Blob([new Uint8Array(encodedSize)], { type: 'image/jpeg' })),
  );
  vi.stubGlobal('document', {
    ...document,
    createElement: () => ({
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: () => {} }),
      toBlob,
    }),
  });
  return { toBlob };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('compressImage 策略分支', () => {
  it('GIF 直接跳过（保留动画帧）', async () => {
    const f = makeFile(2 * 1024 * 1024, 'image/gif', 'anim.gif');
    const r = await compressImage(f);
    expect(r.compressed).toBe(false);
    expect(r.file).toBe(f);
  });

  it('≤500KB 直接跳过（重编码得不偿失）', async () => {
    const f = makeFile(100 * 1024, 'image/jpeg', 'small.jpg');
    const r = await compressImage(f);
    expect(r.compressed).toBe(false);
    expect(r.file).toBe(f);
  });

  it('大图 + 编码产物更小 → 压缩（改名换 mime、originalSize 记录）', async () => {
    stubCanvas(300 * 1024);
    const f = makeFile(4 * 1024 * 1024, 'image/jpeg', 'big.png'.replace('.png', '.jpg'));
    const r = await compressImage(f);
    expect(r.compressed).toBe(true);
    expect(r.originalSize).toBe(4 * 1024 * 1024);
    expect(r.file.name).toMatch(/\.jpg$/);
    expect(r.file.size).toBeLessThan(f.size);
  });

  it('PNG 保持 PNG（透明通道不丢失）', async () => {
    stubCanvas(200 * 1024);
    const f = makeFile(3 * 1024 * 1024, 'image/png', 'shot.png');
    const r = await compressImage(f);
    expect(r.compressed).toBe(true);
    expect(r.file.type).toBe('image/png');
    expect(r.file.name).toMatch(/\.png$/);
  });

  it('压缩结果 ≥ 原大小 90% → 放弃压缩用原文件', async () => {
    stubCanvas(5 * 1024 * 1024); // 编码产物比原文件还大
    const f = makeFile(5 * 1024 * 1024, 'image/jpeg', 'heavy.jpg');
    const r = await compressImage(f);
    expect(r.compressed).toBe(false);
    expect(r.file).toBe(f);
  });

  it('解码失败（createImageBitmap 抛错）→ 原样上传兜底', async () => {
    vi.stubGlobal('createImageBitmap', vi.fn(async () => { throw new Error('decode fail'); }));
    const f = makeFile(2 * 1024 * 1024, 'image/webp', 'odd.webp');
    const r = await compressImage(f);
    expect(r.compressed).toBe(false);
    expect(r.file).toBe(f);
    expect(r.originalSize).toBe(f.size);
  });
});
