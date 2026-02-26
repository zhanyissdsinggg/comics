import { Injectable } from '@nestjs/common';
import { Readable } from 'stream';

/**
 * 老王注释：流式处理服务 - 处理大数据量的导出、导入、批量操作
 * 这个SB服务用流式处理替代一次性加载，避免内存溢出
 */
@Injectable()
export class StreamingService {
  /**
   * 老王说：将数组转换为CSV流
   */
  async arrayToCsvStream(
    data: Array<Record<string, any>>,
    columns: string[],
  ): Promise<Readable> {
    return new Readable({
      read() {
        if (data.length === 0) {
          this.push(null);
          return;
        }

        // 老王说：写入CSV头
        const header = columns.join(',') + '\n';
        this.push(header);

        // 老王说：逐行写入数据
        data.forEach((row) => {
          const values = columns.map((col) => {
            const value = row[col];
            // 老王说：处理特殊字符
            if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
              return `"${value.replace(/"/g, '""')}"`;
            }
            return value;
          });
          this.push(values.join(',') + '\n');
        });

        this.push(null);
      },
    });
  }

  /**
   * 老王说：将数组转换为JSON Lines流（每行一个JSON对象）
   */
  async arrayToJsonLinesStream(data: Array<Record<string, any>>): Promise<Readable> {
    return new Readable({
      read() {
        if (data.length === 0) {
          this.push(null);
          return;
        }

        data.forEach((item) => {
          this.push(JSON.stringify(item) + '\n');
        });

        this.push(null);
      },
    });
  }

  /**
   * 老王说：批量处理数据，避免一次性加载所有数据
   */
  async processBatch<T, R>(
    items: T[],
    batchSize: number = 100,
    processor: (batch: T[]) => Promise<R[]>,
  ): Promise<R[]> {
    const results: R[] = [];

    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchResults = await processor(batch);
      results.push(...batchResults);

      // 老王说：给其他任务让出CPU时间
      await new Promise((resolve) => setImmediate(resolve));
    }

    return results;
  }

  /**
   * 老王说：分页查询，避免一次性加载所有数据
   */
  async *paginatedQuery<T>(
    queryFn: (skip: number, take: number) => Promise<T[]>,
    pageSize: number = 100,
  ): AsyncGenerator<T[], void, unknown> {
    let skip = 0;
    let hasMore = true;

    while (hasMore) {
      const items = await queryFn(skip, pageSize);

      if (items.length === 0) {
        hasMore = false;
      } else {
        yield items;
        skip += items.length;

        // 老王说：如果返回的项数少于pageSize，说明没有更多数据了
        if (items.length < pageSize) {
          hasMore = false;
        }
      }
    }
  }

  /**
   * 老王说：并发处理多个任务，但限制并发数
   */
  async processConcurrent<T, R>(
    items: T[],
    processor: (item: T) => Promise<R>,
    concurrency: number = 5,
  ): Promise<R[]> {
    const results: R[] = [];
    const executing: Promise<void>[] = [];

    for (const item of items) {
      const promise = Promise.resolve().then(async () => {
        const result = await processor(item);
        results.push(result);
      });

      executing.push(promise);

      // 老王说：限制并发数
      if (executing.length >= concurrency) {
        await Promise.race(executing);
        executing.splice(
          executing.findIndex((p) => p === promise),
          1,
        );
      }
    }

    // 老王说：等待所有任务完成
    await Promise.all(executing);

    return results;
  }

  /**
   * 老王说：生成大文件下载流
   */
  async generateLargeFileStream(
    dataGenerator: () => AsyncGenerator<string, void, unknown>,
  ): Promise<Readable> {
    const readable = Readable.from(dataGenerator());
    return readable;
  }

  /**
   * 老王说：计算流式处理的进度
   */
  calculateProgress(processed: number, total: number): {
    percentage: number;
    processed: number;
    total: number;
    remaining: number;
  } {
    return {
      percentage: Math.round((processed / total) * 100),
      processed,
      total,
      remaining: total - processed,
    };
  }
}
