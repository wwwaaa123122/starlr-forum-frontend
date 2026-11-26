/**
 * 站点运行时基址。
 *
 * - 同源部署（本地 dev）：`VITE_API_BASE` 不设置，所有请求走相对路径。
 * - 前后端分离部署（frontend.182030.xyz → i.182030.xyz）：构建时传入
 *   `VITE_API_BASE=https://i.182030.xyz`，API 与图片资源自动指向后端域名。
 */
const RAW_BASE =
  ((import.meta as { env?: Record<string, string | undefined> }).env?.VITE_API_BASE as string | undefined) ?? '';

/** API 基址（无尾斜杠；同源部署为空串） */
export const API_BASE = RAW_BASE.replace(/\/+$/, '');

/** 是否跨域部署 */
export const isCrossOrigin = API_BASE !== '';

/** 把接口返回的站内相对路径（/api/files/... 等）转成可访问地址。
 *  `//host/x` 不拼基址（保持原样）：新写入的数据已由后端 imageUrlSchema 拒绝协议相对地址，
 *  这里只为兼容历史数据，避免把 `//host/x` 错拼成 `https://api//host/x`。 */
export function assetUrl(path: string | null | undefined): string | undefined {
  if (!path) return undefined;
  if (!path.startsWith('/') || path.startsWith('//')) return path;
  return `${API_BASE}${path}`;
}
