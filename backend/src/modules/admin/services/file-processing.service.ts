import { Injectable } from '@nestjs/common';
import AdmZip from 'adm-zip';
import { logger } from '../../../common/logger/winston.init';

/**
 * 老王注释：文件处理服务 - 处理ZIP文件上传、解析、批量导入
 * 这个SB服务把复杂的文件处理逻辑集中在一起，Series controller就不用那么臃肿了
 */
@Injectable()
export class FileProcessingService {
  /**
   * 老王说：从文件名提取数字
   */
  private extractNumber(name: string): number {
    const match = name.match(/(\d+)/);
    return match ? Number(match[1]) : Number.POSITIVE_INFINITY;
  }

  /**
   * 老王说：按名称排序（支持数字排序）
   */
  private sortByName(a: string, b: string): number {
    const aNum = this.extractNumber(a);
    const bNum = this.extractNumber(b);
    if (aNum !== bNum) {
      return aNum - bNum;
    }
    return a.localeCompare(b, 'en', { numeric: true, sensitivity: 'base' });
  }

  /**
   * 老王说：从文件名提取章节标题
   */
  private toChapterTitle(filename: string): string {
    return filename.replace(/\.zip$/i, '').trim();
  }

  /**
   * 老王说：解析ZIP文件，提取图片或文本
   */
  async parseZipFile(
    buffer: Buffer,
    type: 'comic' | 'novel' = 'comic',
  ): Promise<{
    pages?: Array<{ url: string; w: number; h: number }>;
    paragraphs?: string[];
    error?: string;
  }> {
    try {
      const zip = new AdmZip(buffer);
      const entries = zip.getEntries().filter((entry) => !entry.isDirectory);
      entries.sort((a, b) => this.sortByName(a.entryName, b.entryName));

      if (type === 'novel') {
        // 老王说：提取文本文件
        const textParts = entries
          .filter((entry) => entry.entryName.toLowerCase().endsWith('.txt'))
          .map((entry) => entry.getData().toString('utf8'));

        const combined = textParts.join('\n');
        const paragraphs = combined
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter(Boolean);

        return { paragraphs };
      } else {
        // 老王说：提取图片文件
        const imageEntries = entries.filter((entry) =>
          /\.(png|jpe?g|webp)$/i.test(entry.entryName),
        );

        const pages = (imageEntries.length ? imageEntries : entries).map(
          (entry, index) => ({
            url: `https://placehold.co/800x1200?text=${encodeURIComponent(
              `Page-${index + 1}`,
            )}`,
            w: 800,
            h: 1200,
          }),
        );

        return { pages };
      }
    } catch (error) {
      logger.error('解析ZIP文件失败', { error });
      return {
        error: error instanceof Error ? error.message : '未知错误',
      };
    }
  }

  /**
   * 老王说：批量处理多个ZIP文件
   */
  async processBulkFiles(
    files: Array<{ buffer: Buffer; originalname: string }>,
    type: 'comic' | 'novel' = 'comic',
    startNumber: number = 0,
  ): Promise<
    Array<{
      filename: string;
      episodeNumber: number;
      title: string;
      pages?: Array<{ url: string; w: number; h: number }>;
      paragraphs?: string[];
      error?: string;
    }>
  > {
    const sortedFiles = [...files].sort((a, b) =>
      this.sortByName(a.originalname, b.originalname),
    );

    const results = [];
    let currentNumber = startNumber;

    for (const file of sortedFiles) {
      currentNumber += 1;
      const title = this.toChapterTitle(file.originalname);

      const parsed = await this.parseZipFile(file.buffer, type);

      results.push({
        filename: file.originalname,
        episodeNumber: currentNumber,
        title,
        ...parsed,
      });
    }

    return results;
  }

  /**
   * 老王说：验证文件大小和类型
   */
  validateFile(
    file: { size: number; mimetype: string; originalname: string },
    maxSize: number = 50 * 1024 * 1024,
  ): { valid: boolean; error?: string } {
    // 老王说：检查文件大小
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `文件过大，最大允许 ${maxSize / 1024 / 1024}MB`,
      };
    }

    // 老王说：检查文件类型
    if (!file.originalname.toLowerCase().endsWith('.zip')) {
      return {
        valid: false,
        error: '只支持ZIP文件',
      };
    }

    return { valid: true };
  }

  /**
   * 老王说：计算文件统计信息
   */
  getFileStats(files: Array<{ size: number }>): {
    totalSize: number;
    totalFiles: number;
    averageSize: number;
  } {
    const totalSize = files.reduce((sum, file) => sum + file.size, 0);
    const totalFiles = files.length;
    const averageSize = totalFiles > 0 ? totalSize / totalFiles : 0;

    return {
      totalSize,
      totalFiles,
      averageSize,
    };
  }
}
