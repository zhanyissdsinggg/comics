import { Injectable } from '@nestjs/common';

/**
 * Series数据转换Mapper - 统一处理Series数据的视图转换
 * 这个SB方法之前在SeriesService中定义，现在提取出来复用
 */
@Injectable()
export class SeriesMapper {
  /**
   * 将Series数据库记录转换为前端视图格式
   */
  toSeriesView(series: any): any {
    return {
      id: series.id,
      title: series.title,
      type: series.type,
      adult: series.adult,
      coverTone: series.coverTone || '',
      coverUrl: series.coverUrl || '',
      badge: series.badge || '',
      badges: Array.isArray(series.badges) && series.badges.length
        ? series.badges
        : series.badge
          ? [series.badge]
          : [],
      latest: series.latestEpisodeId ? `Ep ${series.latestEpisodeId}` : '',
      latestEpisodeId: series.latestEpisodeId || '',
      genres: Array.isArray(series.genres) ? series.genres : [],
      status: series.status || 'Ongoing',
      rating: series.rating || 0,
      ratingCount: series.ratingCount || 0,
      description: series.description || '',
      pricing: {
        currency: 'POINTS',
        episodePrice: series.episodePrice || 0,
        discount: 0,
      },
      ttf: {
        enabled: Boolean(series.ttfEnabled),
        intervalHours: series.ttfIntervalHours || 24,
      },
    };
  }

  /**
   * 批量转换Series列表
   */
  toSeriesViewList(seriesList: any[]): any[] {
    return seriesList.map((series) => this.toSeriesView(series));
  }
}
