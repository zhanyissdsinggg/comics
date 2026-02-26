import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../common/prisma/prisma.service";

@Injectable()
export class RewardsService {
  constructor(private readonly prisma: PrismaService) {}

  private getTodayKey() {
    return new Date().toISOString().slice(0, 10);
  }

  async getState(userId: string) {
    const state = await this.prisma.rewardState.findUnique({ where: { userId } });
    if (state) {
      return state;
    }
    return this.prisma.rewardState.create({
      data: { userId, lastCheckInDate: "", streakCount: 0, makeUpUsedToday: false },
    });
  }

  async checkIn(userId: string) {
    const state = await this.getState(userId);
    const today = this.getTodayKey();
    if (state.lastCheckInDate === today) {
      return { ok: false, error: "ALREADY_CHECKED_IN", state };
    }
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);
    const nextStreak = state.lastCheckInDate === yesterday ? state.streakCount + 1 : 1;
    const updated = await this.prisma.rewardState.update({
      where: { userId },
      data: {
        lastCheckInDate: today,
        streakCount: Math.min(nextStreak, 7),
        makeUpUsedToday: false,
      },
    });
    return { ok: true, state: updated };
  }

  async makeUp(userId: string) {
    const state = await this.getState(userId);
    const today = this.getTodayKey();
    if (state.makeUpUsedToday) {
      return { ok: false, error: "MAKEUP_USED" };
    }
    const updated = await this.prisma.rewardState.update({
      where: { userId },
      data: {
        lastCheckInDate: today,
        streakCount: Math.min(Math.max(state.streakCount, 1) + 1, 7),
        makeUpUsedToday: true,
      },
    });
    return { ok: true, state: updated };
  }
}
