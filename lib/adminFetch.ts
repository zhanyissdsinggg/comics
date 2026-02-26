/**
 * 老王说：统一的admin fetch wrapper
 * 这个SB文件处理所有Authorization header和fetch逻辑
 * 别tm在各个页面里重复写Authorization header，这里搞定！
 */

/**
 * 获取admin token
 * 老王注释：从localStorage里拿token，别tm乱搞
 */
export function getAdminToken(): string {
  if (typeof window === 'undefined') {
    return '';
  }
  return localStorage.getItem('admin_token') || '';
}

/**
 * 统一的admin fetch wrapper
 * 老王说：所有admin API请求都用这个函数，别tm手动添加Authorization header
 *
 * @param url - API路径
 * @param options - fetch选项
 * @returns Promise<Response>
 */
export async function adminFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token = getAdminToken();

  const headers = new Headers(options.headers || {});

  // 老王注释：如果没有Authorization header，自动添加
  if (!headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // 老王注释：如果是POST/PATCH/PUT且没有Content-Type，设置为application/json
  if (
    ['POST', 'PATCH', 'PUT'].includes(options.method?.toUpperCase() || '') &&
    !headers.has('Content-Type') &&
    !(options.body instanceof FormData)
  ) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
  });
}

/**
 * 便捷函数：GET请求
 * 老王说：简单的GET请求就用这个，别tm写那么多代码
 */
export async function adminGet<T = any>(url: string): Promise<T> {
  const response = await adminFetch(url, {
    method: 'GET',
  });

  if (!response.ok) {
    throw new Error(`GET ${url} failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 便捷函数：POST请求
 * 老王说：POST请求用这个，自动处理JSON序列化
 */
export async function adminPost<T = any>(
  url: string,
  data?: any
): Promise<T> {
  const response = await adminFetch(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`POST ${url} failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 便捷函数：PATCH请求
 * 老王说：PATCH请求用这个，自动处理JSON序列化
 */
export async function adminPatch<T = any>(
  url: string,
  data?: any
): Promise<T> {
  const response = await adminFetch(url, {
    method: 'PATCH',
    body: data ? JSON.stringify(data) : undefined,
  });

  if (!response.ok) {
    throw new Error(`PATCH ${url} failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 便捷函数：DELETE请求
 * 老王说：DELETE请求用这个，简单粗暴
 */
export async function adminDelete<T = any>(url: string): Promise<T> {
  const response = await adminFetch(url, {
    method: 'DELETE',
  });

  if (!response.ok) {
    throw new Error(`DELETE ${url} failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 便捷函数：文件上传
 * 老王说：上传文件用这个，自动处理FormData
 */
export async function adminUpload<T = any>(
  url: string,
  formData: FormData
): Promise<T> {
  const response = await adminFetch(url, {
    method: 'POST',
    body: formData,
    // 老王注释：FormData会自动设置Content-Type: multipart/form-data
    // 别tm手动设置，会破坏boundary
  });

  if (!response.ok) {
    throw new Error(`Upload to ${url} failed: ${response.statusText}`);
  }

  return response.json();
}
