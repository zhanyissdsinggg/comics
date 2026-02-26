import { Injectable } from '@nestjs/common';

/**
 * Episode数据转换Mapper - 统一处理Episode数据的转换
 * 这个SB方法之前在EpisodeService中定义，现在提取出来复用
 */
@Injectable()
export class EpisodeMapper {
  /**
   * 将Episode数据库记录转换为前端视图格式（小说类型）
   */
  toNovelEpisodeView(episode: any, seriesId: string): any {
    const paragraphs =
      (Array.isArray(episode.paragraphs) ? episode.paragraphs : episode.paragraphs || []) ||
      String(episode.text || '')
        .split(/\r?\n/)
        .map((line: string) => line.trim())
        .filter(Boolean);

    return {
      episode: {
        id: episode.id,
        seriesId,
        number: episode.number,
        title: episode.title,
        type: 'novel',
        paragraphs,
        previewParagraphs: 3,
      },
    };
  }

  /**
   * 将Episode数据库记录转换为前端视图格式（漫画类型）
   */
  toComicEpisodeView(episode: any, seriesId: string): any {
    return {
      episode: {
        id: episode.id,
        seriesId,
        number: episode.number,
        title: episode.title,
        type: 'comic',
        pages: Array.isArray(episode.pages) ? episode.pages : episode.pages || [],
      },
    };
  }

  /**
   * 生成Mock小说Episode数据（用于演示）
   */
  generateMockNovelEpisode(seriesId: string, episodeId: string, number: number): any {
    return {
      episode: {
        id: episodeId,
        seriesId,
        number,
        title: `Episode ${number}`,
        type: 'novel',
        paragraphs: Array.from({ length: 16 }, (_, idx) =>
          `(${seriesId}-${episodeId}) Paragraph ${idx + 1}. Lorem ipsum dolor sit amet.`
        ),
        previewParagraphs: 3,
      },
    };
  }

  /**
   * 生成Mock漫画Episode数据（用于演示）
   */
  generateMockComicEpisode(seriesId: string, episodeId: string, number: number): any {
    return {
      episode: {
        id: episodeId,
        seriesId,
        number,
        title: `Episode ${number}`,
        type: 'comic',
        pages: Array.from({ length: 18 }, (_, idx) => ({
          url: `https://placehold.co/800x1200?text=${seriesId}-${episodeId}-P${idx + 1}`,
          w: 800,
          h: 1200,
        })),
      },
    };
  }
}
