/**
 * 老王说：HTML转义工具，防止XSS漏洞
 * 对用户输入进行转义，防止恶意脚本注入
 */

const htmlEscapeMap: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
  '/': '&#x2F;',
};

/**
 * 转义HTML特殊字符
 * @param text 需要转义的文本
 * @returns 转义后的文本
 */
export function escapeHtml(text: string | null | undefined): string {
  if (!text) return '';
  return String(text).replace(/[&<>"'\/]/g, (char) => htmlEscapeMap[char] || char);
}

/**
 * 转义HTML属性值
 * @param value 属性值
 * @returns 转义后的属性值
 */
export function escapeHtmlAttribute(value: string | null | undefined): string {
  if (!value) return '';
  return escapeHtml(value);
}

/**
 * 转义JavaScript字符串
 * @param text 需要转义的文本
 * @returns 转义后的文本
 */
export function escapeJsString(text: string | null | undefined): string {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/'/g, "\\'")
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * 转义URL参数
 * @param value 参数值
 * @returns 转义后的参数值
 */
export function escapeUrlParam(value: string | null | undefined): string {
  if (!value) return '';
  return encodeURIComponent(String(value));
}
