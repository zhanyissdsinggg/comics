/**
 * 闂佸ジ顣﹂懗鍓佹暜閸パ€鏋栭柕濞炬櫅濞呯偤鏌ㄥ☉娆樺剸PI闂佺顑冮崕閬嶅箖瀹ュ憘娑㈠焵椤掑嫬钃熼柕澶堝劜鐎氭煡姊洪幐搴ｆ噯妞ゆ洏鍊濋獮渚€濮€閻欌偓濡插鏌￠崼婵囨儓闁? * 闁哄鏅滈悷銈夋煂濞ｇ嫙闂佸搫鍊稿ú锝呪枎閵忋倖鍋ㄩ柕濠忛檮闂勫秵淇婇鐔蜂壕濠电偞娼欓鍛村箖濡ゅ啰鍗氶柣銈咁敆I闂佸搫瀚烽崹浼村箚娴ｅ壊娼伴柨婵嗘噽閸╂寮堕埡鍌氬妞ゃ垺鍨块弫宥囦沪閸婄喎鐝梺鍦帛閸旀帞娆㈤悽鍛婂殜妞ゅ繐瀚闂佽鍘归崹褰捤囬弻銉ュ珘闁告繂瀚悡? * 闂佺厧宕惌渚€鎯屽Δ鍛櫖? * - 闁诲氦顫夌喊宥咃耿閳ユ緞娑㈠焵椤掑嫬钃熼柕澶堝劜閸婄數绱掗弮鍌涚€盤I闂佺顑冮崕閬嶅箖瀹ュ鍋愰柤鍝ヮ暯閸? * - 闁荤姳鐒﹀妯肩礊瀹€鐢圛闂備焦瀵ч悷銊╊敋閵堝绫嶉柕澶堝劤缁? * - 闂佸湱绮崝鎺旀閻㈠憡鈷旂€广儱娲悰鎾绘煛閸屾繍娼愭い銏犵Ч閺佸秹宕奸姀銏狀槱闁诲孩绋掕摫闁哄棛鍠栭獮鎴︻敊鐞涒€充壕濞达綀顫夐幏閬嶆煕閿旀儳顣奸柡鍡欏枛楠炴垿顢欓崜褎鎯ｉ梺? * - 闂佺厧顨庢禍婊勬叏閳哄懏鐓傜€广儱鐗忓Σ绋款熆閹壆绨块悷娆欑畵閹啴宕熼鍛濠? */

import { apiGet } from "./apiClient";
import { trackEvent } from "./trackEvent";

const HEALTH_CHECK_INTERVAL = 30000; // 30s
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1s
class APIHealthManager {
  constructor() {
    this.isHealthy = true;
    this.lastCheckTime = 0;
    this.failureCount = 0;
    this.errorLog = [];
    this.maxErrorLogSize = 100;
  }

  /**
   * 闂佸ジ顣﹂懗鍓佹暜閸パ€鏋栭柕濞炬櫅濞呯偤鏌ㄥ☉娆戭暡妞ゃ儱鎳樺濠氬Ψ閵夛箑鈧數绱掗弮鍌涚€盤I闂佺顑冮崕閬嶅箖瀹ュ鍋愰柤鍝ヮ暯閸?   * 闁哄鏅滈悷銈夋煂濞ｇ嫙闂佸憡鍨兼慨銈夊汲閻旂顕辨慨姗嗗墰閺嗕即鏌￠崼銏犳瀾妞ゃ儱鎳樺濠氬Ψ閵夛箑鈧數绱掗弮鎴濈仭婵″弶鎮傚畷銉╂晝娴ｈ櫣顔庡┑鐐跺蔼瀹曢潧顭?   */
  async checkHealth() {
    const now = Date.now();

        // Avoid excessive health checks
    if (now - this.lastCheckTime < HEALTH_CHECK_INTERVAL) {
      return this.isHealthy;
    }

    this.lastCheckTime = now;

    try {
      const response = await apiGet("/api/health", {
        suppressAuthModal: true,
        timeoutMs: 5000,
      });

      if (response.ok) {
        this.isHealthy = true;
        this.failureCount = 0;
        trackEvent("api_health_check_success");
        return true;
      } else {
        this.recordFailure("Health check failed", response.status);
        return false;
      }
    } catch (error) {
      this.recordFailure("Health check error", error.message);
      return false;
    }
  }

  /**
   * 闂佸ジ顣﹂懗鍓佹暜閸パ€鏋栭柕濞炬櫅濞呯偤鏌ㄥ☉娆庝孩妞ゆ柨娲╅妵鎰板籍閻將闂備焦瀵ч悷銊╊敋?   * 闁哄鏅滈悷銈夋煂濞ｇ嫙闂佸憡鍨兼慨銈夊汲閻斿吋鍋ㄩ柕濠忛檮闂勫秹鎮规担瑙勭凡缂傚秴绉归獮宥夊焵椤掑嫬瀚夐柛顐ょ瑓I闂備焦瀵ч悷銊╊敋閵堝鏅悘鐐靛亾閻撴瑥銆掑鍐插姷闁汇劎鍠撻幏?   */
  recordFailure(message, details) {
    this.failureCount += 1;

    if (this.failureCount >= 3) {
      this.isHealthy = false;
      trackEvent("api_health_degraded", { failureCount: this.failureCount });
    }

    const errorEntry = {
      timestamp: new Date().toISOString(),
      message,
      details,
      failureCount: this.failureCount,
    };

    this.errorLog.push(errorEntry);

        // Keep a bounded error log
    if (this.errorLog.length > this.maxErrorLogSize) {
      this.errorLog.shift();
    }

    console.error("[API Health]", message, details);
  }

  /**
   * 闂佸ジ顣﹂懗鍓佹暜閸パ€鏋栭柕濞炬櫅濞呯偤鏌ㄥ☉娆庝孩妤犵偛绻樺畷锝夊冀椤撶喐娅撻柣鐘叉祩閸ㄥ崬螞閳哄嫮鐤€?   * 闁哄鏅滈悷銈夋煂濞ｇ嫙闂佸憡鍨兼慨銈夊汲閻斿吋鍋ㄩ柕濠忛檮闂勫秹鏌ら幆褍妲荤憸鏉挎喘瀵敻鍩€椤掍焦浜ら柟瀵稿У閻ｉ亶姊洪幐搴ｆ噯妞ゆ洏鍊濆顕€濡烽妷褏顔嶉梺鎸庣☉閺堫剟寮婚悢鍝ョ懝闁兼剚鍨冲▓鍫曟偣?   */
  getErrorLog() {
    return this.errorLog;
  }

  /**
   * 闂佸ジ顣﹂懗鍓佹暜閸パ€鏋栭柕濞炬櫅濞呯偤鏌ㄥ☉娆忓摵闁革絽鎽滅槐鏃堫敊闂傚瓨妯婇柟鍏兼尦椤ユ挻鎱ㄩ幖浣哥畱?   * 闁哄鏅滈悷銈夋煂濞ｇ嫙闂佸憡鍨兼慨銈夊汲閻斿吋鍋ㄩ柕濠忛檮闂勫秹姊洪幓鎺斝ら柣銈呮瀹曟垿濡烽妷锕€鈧綁鏌ｅΟ鍨厫闁逞屽厸缁躲倗妲愬┑濞夸汗闁规崘娅曢崐鐢电磼閺冩垵鐏″ù鐙€鍠楀鍕吋閸℃﹩妲柣鐘差儏閸熶即寮?   */
  reset() {
    this.isHealthy = true;
    this.failureCount = 0;
    this.errorLog = [];
  }
}

/**
 * 闂佸ジ顣﹂懗鍓佹暜閸パ€鏋栭柕濞炬櫅濞呯偤鏌ㄥ☉娆樺剸PI闂備焦褰冪粔鐑芥儊椤栫偛瀚夐柛婵嗗閻? * 闁哄鏅滈悷銈夋煂濞ｇ嫙闂佸憡鍨兼慨銈夊汲閻斿吋鍋ㄩ柕濠忛檮闂勫秹鏌ゆ總澶夌盎濠殿喒鏅犻弻灞筋吋閸垺笑婵犮垺鍎肩划鍓ф喆閿曞倹鍎嶉柛鎴炩攰I闁荤姴娲弨閬嶆儑? */
export async function apiWithRetry(
  apiFunction,
  maxRetries = MAX_RETRIES,
  retryDelay = RETRY_DELAY
) {
  let lastError;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const result = await apiFunction();

      if (result.ok) {
        return result;
      }

            // Do not retry 4xx errors
      if (result.status >= 400 && result.status < 500) {
        return result;
      }

      lastError = new Error(`HTTP ${result.status}`);
    } catch (error) {
      lastError = error;
    }

        // Backoff between retries
    if (attempt < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
      trackEvent("api_retry_attempt", { attempt: attempt + 1, maxRetries });
    }
  }

    // All retries exhausted
  trackEvent("api_retry_exhausted", { maxRetries });
  throw lastError;
}

/**
 * 闂佸ジ顣﹂懗鍓佹暜閸パ€鏋栭柕濞炬櫅濞呯偤鏌ㄥ☉娆樺剸PI闂傚倸瀚粔鑸殿殽閸ヮ剙妫橀悷娆忓閺€? * 闁哄鏅滈悷銈夋煂濞ｇ嫙闂佸憡鍨兼慨銈夊汲閻斿吋鍋ㄩ柕濠忛檮闂勫秹鏌涢敂鍝勫闁诡喗顨堢划鈺咁敍濞嗘垹鎲归梺鍛婄懐閸ㄦ娊寮妶澶婄睄闁兼悂娼х徊鐟般€掑顓犳创婵￠箖顥撻惀顏囶槼闁哄瞼鍠庨々? */
export function getAPIFallbackData(endpoint) {
  // 闁哄鏅滈悷鈺呭闯閻戣棄鐭楁い鏍ㄧ懁缁ㄤ即寮堕埡鍌涚叆婵炲弶鐗滅槐鎾诲箻瀹曞洦鎲奸梺姹囧妼鐎氼參寮抽悢鐓庣妞ゆ棁妫勯悘妤呮煛閸偄澧繝鈧幘顔兼瀬闁绘鐗嗙粊?
  const fallbackMap = {
    "/api/wallet": {
      ok: true,
      data: {
        paidPts: 0,
        bonusPts: 0,
        plan: null,
      },
    },
    "/api/entitlements": {
      ok: true,
      data: {
        entitlements: [],
      },
    },
    "/api/coupons": {
      ok: true,
      data: {
        coupons: [],
      },
    },
  };

  return fallbackMap[endpoint] || null;
}


// API health singleton
export const apiHealthManager = new APIHealthManager();
