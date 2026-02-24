import { Injectable } from '@nestjs/common';

/**
 * TTF加速计算Mapper - 统一处理Time-To-Free加速逻辑
 * 之前这个SB方法在3个Service中重复定义，现在统一管理
 */
@Injectable()
export class TtfMapper {
  /**
   * 应用TTF加速倍数到Episode
   * @param episode 剧集数据
   * @param series 作品数据
   * @param subscription 用户订阅信息
   * @returns 加速后的ttfReadyAt时间戳（毫秒）
   */
  applyTtfAcceleration(episode: any, series: any, subscription: any): number | null {
    if (!episode.ttfEligible || !episode.ttfReadyAt) {
      return episode.ttfReadyAt ? new Date(episode.ttfReadyAt).getTime() : null;
    }

    const multiplier = subscription?.perks?.ttfMultiplier;
    if (!multiplier || multiplier >= 1) {
      return new Date(episode.ttfReadyAt).getTime();
    }

    const releasedAtMs = new Date(episode.releasedAt).getTime();
    if (Number.isNaN(releasedAtMs)) {
      return new Date(episode.ttfReadyAt).getTime();
    }

    const intervalHours = series?.ttfIntervalHours || 24;
    const baseReadyAtMs = releasedAtMs + intervalHours * 60 * 60 * 1000;
    const acceleratedReadyAtMs = releasedAtMs + intervalHours * multiplier * 60 * 60 * 1000;
    const originalReadyAtMs = new Date(episode.ttfReadyAt).getTime();

    const targetReadyAtMs = Number.isNaN(originalReadyAtMs)
      ? Math.min(baseReadyAtMs, acceleratedReadyAtMs)
      : Math.min(originalReadyAtMs, acceleratedReadyAtMs);

    return targetReadyAtMs;
  }

  /**
   * 应用TTF加速到Episode对象（返回完整对象）
   */
  applyTtfAccelerationToEpisode(episode: any, series: any, subscription: any): any {
    if (!episode.ttfEligible || !episode.ttfReadyAt) {
      return episode;
    }

    const multiplier = subscription?.perks?.ttfMultiplier;
    if (!multiplier || multiplier >= 1) {
      return episode;
    }

    const releasedAtMs = new Date(episode.releasedAt).getTime();
    if (Number.isNaN(releasedAtMs)) {
      return episode;
    }

    const intervalHours = series?.ttfIntervalHours || 24;
    const baseReadyAtMs = releasedAtMs + intervalHours * 60 * 60 * 1000;
    const acceleratedReadyAtMs = releasedAtMs + intervalHours * multiplier * 60 * 60 * 1000;
    const originalReadyAtMs = new Date(episode.ttfReadyAt).getTime();

    const targetReadyAtMs = Number.isNaN(originalReadyAtMs)
      ? Math.min(baseReadyAtMs, acceleratedReadyAtMs)
      : Math.min(originalReadyAtMs, acceleratedReadyAtMs);

    return {
      ...episode,
      ttfReadyAt: new Date(targetReadyAtMs),
    };
  }
}
