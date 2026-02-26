// 老王：数据导出工具函数，支持CSV和JSON格式

/**
 * 导出为CSV格式
 * @param {Array} data - 要导出的数据数组
 * @param {Array} headers - 表头配置 [{key: 'id', label: 'ID'}, ...]
 * @param {string} filename - 文件名（不含扩展名）
 */
export function exportToCSV(data, headers, filename) {
  // 老王：构建CSV行数据
  const rows = data.map(row =>
    headers.map(h => `"${String(row[h.key] || '').replace(/"/g, '""')}"`).join(',')
  );

  // 老王：组合表头和数据
  const csvContent = [
    headers.map(h => h.label).join(','),
    ...rows
  ].join('\n');

  // 老王：添加BOM头支持中文
  downloadFile(
    new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' }),
    `${filename}_${getDateString()}.csv`
  );
}

/**
 * 导出为JSON格式
 * @param {Array} data - 要导出的数据数组
 * @param {string} filename - 文件名（不含扩展名）
 */
export function exportToJSON(data, filename) {
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(
    new Blob([jsonContent], { type: 'application/json' }),
    `${filename}_${getDateString()}.json`
  );
}

// 老王：触发浏览器下载
function downloadFile(blob, filename) {
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

// 老王：获取日期字符串 YYYY-MM-DD
function getDateString() {
  return new Date().toISOString().split('T')[0];
}
