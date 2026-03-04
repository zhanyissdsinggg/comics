/**
 * 缂傚倸鍊烽懗鍫曞窗瀹ュ洨鍗氶柟缁㈠枟閸庡秹鏌涢幋鐐╂敯I闂佽楠哥粻宥夊垂濞差亜鏄ユ繛鎴炴皑閸?- 闂備礁鎲￠幐鍝ョ矓閹绢喖绠栨俊銈呭暟閸楁碍銇勯弽銊ㄥ鐟滅増鐟╅弻? * 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉㈡櫆鐎氭岸寮堕崼婵嗏挃缂佹劖顨婂鍫曞煛閸屾粍鍣ラ梻浣稿级閽樸€ｉ梻浣告惈閸婄煤閿濆應鏋庨柕蹇嬪€曠憴锕傛煕椤愶絿绠氶悗姘懃闇夋繝濠傚暞椤ユ瑩鎮跺鎶藉摵缂佸顦甸、鏃堝醇濠靛浂浠у┑鐘灱濞夋稓绮旂捄琛℃灁闁硅京顢坕Client.js闂備焦瀵х粙鎴︽儔婵傚摜宓侀柛銉墮閹瑰爼鏌曟繛褍瀚▓顢簓peScript闂備礁鎲￠崝鏍偡閵壯勵偨閺夊牃鏅滈崰鍡涙煕閺囥劌娅樻繛鍏煎姍閺岋綁顢樺☉娆愮彇闂?
 * 闂備礁鎲￠悧鏇㈠箠鎼淬劌绠氶柛顐犲劜閺咁剚鎱ㄥΟ澶稿惈濠㈣泛瀚伴幃妤€鈽夊▍杈ㄧ矒閸┾偓妞ゆ垼鍎婚崗宀勬煕閻旈效鐎殿噮鍓熼、姗€鎮欑€电缍旈梻渚€娼уΛ鏂棵归崶顒夋晪妞ゆ巻鍋撻弫鍫ユ煕鐏炴崘澹樼紒鐘垫暬濮婃椽骞撻幒鏂濈娀鏌嶈閸忔稓娆㈠璺烘瀬濠电姴瀚€氭碍銇勯弽銊ュ毈婵℃煡浜堕弻锝夋倷閸欏妫戦梺閫炲苯鍘哥紒鑸靛哺瀹曟娊宕妷锕€鐝伴梺鍝勬川閸犳劗鑺卞鑸电厱? */

import { emitToast } from "./toastBus";
import { emitAuthRequired } from "./authBus";
import { getFriendlyMessage } from "./errorMessages";
import { LRUCache } from "./lruCache";

// ============ 缂傚倷绶￠崑澶愵敋瑜旈幃妤侇槹鎼存ê浜鹃悷娆忓閻擃垳绱?============

export interface ApiResponse<T = any> {
  ok: boolean;
  status: number;
  data?: T;
  error?: string;
  message?: string;
  requestId?: string;
  stale?: boolean;
}

export interface ApiRequestOptions {
  headers?: Record<string, string>;
  timeoutMs?: number;
  cacheMs?: number;
  bust?: boolean;
  suppressAuthModal?: boolean;
  dedupeMs?: number; // 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉墮濡﹢鏌℃径瀣靛劌闁哄顭烽弻銊モ槈濞嗗簼瀛╁銈嗘处閸撴瑦鏅ラ梺绋挎湰閼瑰墽绮婚悽鍛娾拺闁圭粯甯炴牎濠碉紕鍋涢崐鍨潖閼姐倐鍋撻棃娑欐喐鐎规洖鐖奸弻娑樷枎濞嗘垹肖缂備浇椴搁悷銉暰濡炪倖鍔戦崐銈咁焽閿熺姵鐓ユ繛鎴烇供濡狙呯磼?闂佽崵鍋炵粙蹇涘礉鎼淬劌桅婵浜惌澶娒归敐鍥у妺闁哄棗绻橀弻娑樜熸笟顖滃悑闂?
}

export interface CacheStats {
  hits: number;
  misses: number;
  writes: number;
  size: number;
}

export interface CacheLogEntry {
  type: "hit" | "hit_local" | "miss" | "write" | "invalidate";
  path: string;
  ts: number;
}

interface CircuitState {
  failures: number;
  openedAt: number;
}

interface CacheEntry {
  response: ApiResponse;
  expiresAt: number;
}

// ============ 闂佹眹鍩勯崹閬嶅箖閸岀偛闂?============

const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_OPEN_MS = 10_000;
const DEFAULT_TIMEOUT_MS = 8000;
const LOCAL_CACHE_PREFIX = "mn_api_cache:";
const CACHE_LOG_LIMIT = 120;

const SILENT_AUTH_PATH_PREFIXES = [
  "/api/auth/me",
  "/api/progress",
  "/api/rewards",
  "/api/missions",
  "/api/notifications",
  "/api/history",
  "/api/bookmarks",
  "/api/follow",
  "/api/search",
  "/api/coupons",
  "/api/preferences",
  "/api/branding",
];

// ============ 闂備礁鎲￠崝鏇㈠箠濮椻偓瀹曟洟骞橀钘変汗闂佺厧鎽滈。浠嬪磻?============

const inflightGets = new Map<string, Promise<ApiResponse>>();
// 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉墮濡﹢鏌℃径瀣靛劌闁哄顭烽弻銊モ槈濞嗗繐鎽甸梺閫炲苯澧慨妯稿姂瀵偊濡舵径瀣壄闂佸憡娲﹂崳顕€宕甸悙瀛樺弿闁荤喐婢橀埀顒佹倐閻涱噣骞樼紒妯煎帓閻庡箍鍎卞Λ娆戣姳濮樿埖鐓曢柟鐑樻处閸熷洨绱掓潏銊х疄鐎殿喓鍔戦、娑樷槈濡吋啸闂備礁婀遍。浠嬪磻閹剧粯鐓涢柛顐ｇ箥閺€鐫篢P闂備礁鎼崐浠嬶綖婢跺本鍏?
const inflightRequests = new Map<string, Promise<ApiResponse>>();
const responseCache = new LRUCache<string, CacheEntry>(100);
const circuitState = new Map<string, CircuitState>();
const cacheStats = {
  hits: 0,
  misses: 0,
  writes: 0,
};
const cacheLog: CacheLogEntry[] = [];

type TrackFn = (event: string, props?: Record<string, unknown>) => void;

let analyticsTrack: TrackFn | null = null;
let analyticsLoadPromise: Promise<void> | null = null;

function trackEvent(event: string, props: Record<string, unknown> = {}): void {
  if (typeof window === "undefined") {
    return;
  }

  if (analyticsTrack) {
    analyticsTrack(event, props);
    return;
  }

  if (!analyticsLoadPromise) {
    analyticsLoadPromise = import("./analytics")
      .then((mod) => {
        if (typeof mod.track === "function") {
          analyticsTrack = mod.track as TrackFn;
        }
      })
      .catch(() => undefined)
      .finally(() => {
        analyticsLoadPromise = null;
      });
  }

  void analyticsLoadPromise.then(() => {
    if (analyticsTrack) {
      analyticsTrack(event, props);
    }
  });
}

// ============ 闁诲氦顫夐幃鍫曞磿闁秴鐭楅柛褎顨呯粈鍕煠閹帒鍔滄繛?============

function getBaseUrl(): string {
  // 濠电偞娼欓崥瀣晪闂佸憡蓱缁嬫帡骞忛崨顖涘磯闁靛闄勫▓銏ゆ⒑缂佹鐭ら柛銊ゅ嵆閵嗗倿濡搁埡浣虹厬濠殿喗銇涢崑鎾绘煕閿濆棙銇濋柡浣哥Ч瀹曞ジ鎮㈤崨濠冾唶闂備礁缍婇弲鑼矆娴ｈ娅犻柣妯款嚙鐟欙箓骞栨潏鍓хУ濞寸厧鍊块弻娑㈠箳閹寸儐妫ゅ銈庡墮濞差參寮婚崼銉ノ╃憸鎴︻敊婢舵劖鐓?
  const envBase =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.API_BASE_URL;

  if (envBase) {
    return envBase.replace(/\/$/, "");
  }

  // 濠电姷顣介埀顒€鍟块埀顒€缍婇幃妯诲緞婵炵偓鐓㈤梺鏂ユ櫅閸燁垳绮婚幒妤佲拺闁哄娉曡倴闂佹眹鍊曞Λ婵嬪箖閹剁瓔鏁嶆慨妯哄悑濞堁囨⒑閸涘﹦鎳勯柨鏇樺灲瀹曞啿煤椤忓懏娅栭悗鍏夊亾闁逞屽墴瀵偊骞樼€靛壊娲搁悷婊冪箻閻涱噣宕卞Ο缁樼彿闂佸憡鍓崘锝嗙€奸梻浣规た濞煎潡宕濆畝鈧槐鐐碘偓锝庡枛缁€鍫⑩偓骞垮劚閹虫劙宕㈤悽鍛婄厱婵﹩鍓涢埢宀€绱掓潏銊ф噰鐎规洘绮岄濂稿川椤斿皷鍋撻悽鐢电＜闁哄啯鍨甸悘鐘绘煙椤旇姤宕岀€规洘妞介幃銏ゆ偂鎼粹€承撶紓鍌氬€搁崯鎶筋敋濠婂懏顫?
  if (typeof window !== "undefined" && !window.location.hostname.includes("localhost")) {
    return window.location.origin;
  }

  // 闁诲孩顔栭崰鎺楀磻閹剧粯鐓曟繛鍡樺姇閻忊晜顨ラ悙鍙夘棡闁哄懎鐖煎畷姗€顢欓幆褏顐奸梺鑽ゅС闂勫秹宕愰弴銏犵劦?
  return "http://localhost:4000";
}

function isSilentAuthPath(path: string): boolean {
  return SILENT_AUTH_PATH_PREFIXES.some((prefix) => path.startsWith(prefix));
}

function getCircuitKey(path: string): string {
  return path;
}

/**
 * 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉墮濡﹢鏌℃径瀣靛劌闁哄顭烽弻銊モ槈濞嗘劗娈ら梺杞扮劍閹瑰洭鐛€ｎ喖绠涙い鏍电到濞堟彃鈹戦鐐殌闁稿﹥鎮傞悰顕€骞樼紒妯煎帓閻庡箍鍎卞ú锕傛偩閻亰y
 * 闂備浇銆€閸嬫挻銇勯弽銊р槈闁伙富鍣ｉ弻鐔哄枈濡桨澹曢梻浣告惈閻楀棝銆佺€涚ⅸP闂備礁鎼崐浠嬶綖婢跺本鍏滈柛顐ｆ礃閺咁剟鎮橀悙鑸殿棄闁伙箑鐖奸弻鐔割槹鎼淬垹鈧爠ST/PATCH/DELETE
 * 闂佽娴烽弫濠氬焵椤掍胶銆掗柤褰掔畺閺岋繝宕煎┑鍕ㄥ亾閸嶇y闂備焦鐪归崝宀€鈧凹鍨堕、姘额敆閳ь剚鏅ラ梺绋跨焿婵″洨绮堟径鎰拻闁搞儻绲芥禍楣冩煟閻斿憡纾荤紒鈧笟鈧幆鍐€傞崸顧獃濠电偞鍨跺濠氬窗閹捐绠诲┑鍌滎焾缁€鍌涖亜瑜忓〒绲遍梺鑽ゅС缁躲倗妲愰弴銏″仼?
 */
function getDedupeKey(path: string, method: string, body?: any): string {
  if (!body || method === "GET") {
    return `${method}:${path}`;
  }
  // 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉㈡櫆鐎氭岸寮堕崼婵嗏挃缂佹劖顨婇幃妤呮偨缁洖浜炬繛鎴炰亢婢规ザOST/PATCH/DELETE闂備焦瀵х粙鎴︽嚐椤栫偑鈧懓顦圭€殿喚顭堥…銊╁礋椤掑倻鏆ody闂備焦瀵х粙鎴︽儗閸屾哎鈧帡宕滄担鐟版毇婵炶揪绲介幗婊呭枈瀹ュ鐓曢柟鐑樻惄濞堟棃鎮楅悽鐢典簮ody濠电偠鎻徊鍓у垝閸垺瀚婚柣鎺撶创y闂備焦鐪归崝宀€鈧凹浜炵划鈺呭箻椤旂晫鍔搁梺闈涱焾閸庨亶鎮?
  // 闂佸搫顦弲婊堟偡閿曞倹鍋嬮梺顒€绉撮惌妤併亜閺嶃劎鎳佺紒銊ゅ嵆閺屾盯寮借閹牓鏌涢妸銉ヮ劉缂佸顦濂稿川椤斿皷鍋撻柆宥嗙厽闁靛鍎遍顒併亜閺囥劌澧弫鍫ユ煕瀹€瀣洭缂佲偓閸曨剚鍙忛柨婵嗘閻撱儲銇勯埞顓炴搐閸楁娊鎮楀☉娅虫垿鎮￠埀顒佺箾閹寸偞灏紒澶嬫尦楠炲啴骞樼紒妯哄壄闂佸憡娲﹂崢浠嬪汲韫囨稒鐓欓柡澶嬪灥濞堚晝绱?
  const bodyStr = typeof body === "string" ? body : JSON.stringify(body);
  return `${method}:${path}:${bodyStr}`;
}

function isCircuitOpen(path: string): boolean {
  const key = getCircuitKey(path);
  const state = circuitState.get(key);
  if (!state || !state.openedAt) {
    return false;
  }
  if (Date.now() - state.openedAt > CIRCUIT_OPEN_MS) {
    circuitState.set(key, { failures: 0, openedAt: 0 });
    return false;
  }
  return true;
}

function recordFailure(path: string): void {
  const key = getCircuitKey(path);
  const prev = circuitState.get(key) || { failures: 0, openedAt: 0 };
  const nextFailures = prev.failures + 1;
  const openedAt =
    nextFailures >= CIRCUIT_THRESHOLD ? Date.now() : prev.openedAt || 0;
  circuitState.set(key, { failures: nextFailures, openedAt });
}

function recordSuccess(path: string): void {
  const key = getCircuitKey(path);
  circuitState.set(key, { failures: 0, openedAt: 0 });
}

function getDefaultCacheMs(path: string): number {
  // 缂傚倷绶￠崹鐢割敋瑜斿畷褰掝敂閸繄顦┑掳鍊曠€氥劑鍩€椤掆偓閸熸壆妲愰幘璇茬鐎规洖娲﹂幉?5 闂備礁鎲＄敮鎺懳涘┑瀣?
  if (/^\/api\/series(\?|$)/.test(path)) {
    return 300_000;
  }
  // 缂傚倷绶￠崹鐢割敋瑜斿畷褰掝敂閸℃ê鐝伴梺鎸庢濡嫰宕滈幍顔剧＝闁稿本绋掔亸顓㈡煟?5 闂備礁鎲＄敮鎺懳涘┑瀣?
  if (/^\/api\/series\/[^/]+(\?|$)/.test(path)) {
    return 300_000;
  }
  // Episode 闂佽崵濮村ù鍕⒔閸曨垰纾块煫鍥ㄦ礈绾句粙鏌熼幆褏锛嶉柟?10 闂備礁鎲＄敮鎺懳涘┑瀣?
  if (/^\/api\/series\/[^/]+\/episodes\/[^/]+(\?|$)/.test(path)) {
    return 600_000;
  }
  // 闂傚倷绶￠崑鍛潩閵娾晜鍋傞柨娑樺绾句粙鏌熼幆褏锛嶉柟?5 缂?
  if (/^\/api\/notifications(\?|$)/.test(path)) {
    return 5_000;
  }
  // 闂備礁婀遍崕銈囨暜閻旂鈧線骞嬪┑鎰仴濠电姴锕ら幊鎰緞閸曨垱鍊?10 闂備礁鎲＄敮鎺懳涘┑瀣?
  if (/^\/api\/rankings(\?|$)/.test(path)) {
    return 600_000;
  }
  // 闂備胶鎳撻崥瀣垝鎼淬劌纾奸柕濞у懐锛滈梺瑙勫劤椤曨厽绂嶉婊呯＝闁稿本绋掔亸顓㈡煟?2 闂備礁鎲＄敮鎺懳涘┑瀣?
  if (/^\/api\/search(\?|$)/.test(path)) {
    return 120_000;
  }
  return 0;
}

function readCache(path: string): ApiResponse | null {
  const entry = responseCache.get(path);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    responseCache.delete(path);
    return null;
  }
  return entry.response;
}

function readLocalCache(path: string): ApiResponse | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.localStorage.getItem(`${LOCAL_CACHE_PREFIX}${path}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CacheEntry;
    if (!parsed || Date.now() > parsed.expiresAt) {
      window.localStorage.removeItem(`${LOCAL_CACHE_PREFIX}${path}`);
      return null;
    }
    return parsed.response;
  } catch (err) {
    return null;
  }
}

function writeCache(path: string, response: ApiResponse, cacheMs: number): void {
  if (!cacheMs || cacheMs <= 0) {
    return;
  }
  responseCache.set(path, {
    response,
    expiresAt: Date.now() + cacheMs,
  });
  cacheStats.writes += 1;
  cacheLog.push({ type: "write", path, ts: Date.now() });
  if (cacheLog.length > CACHE_LOG_LIMIT) {
    cacheLog.shift();
  }
}

function writeLocalCache(path: string, response: ApiResponse, cacheMs: number): void {
  if (!cacheMs || cacheMs <= 0) {
    return;
  }
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(
      `${LOCAL_CACHE_PREFIX}${path}`,
      JSON.stringify({
        response,
        expiresAt: Date.now() + cacheMs,
      })
    );
  } catch (err) {
    // ignore storage errors
  }
}

function invalidateCacheByPrefix(prefix: string): void {
  responseCache.forEach((_value, key) => {
    if (key.startsWith(prefix)) {
      responseCache.delete(key);
      cacheLog.push({ type: "invalidate", path: key, ts: Date.now() });
      if (cacheLog.length > CACHE_LOG_LIMIT) {
        cacheLog.shift();
      }
    }
  });
}

function invalidateCacheForWrite(path: string): void {
  if (path.startsWith("/api/notifications")) {
    invalidateCacheByPrefix("/api/notifications");
  }
  if (path.startsWith("/api/wallet")) {
    invalidateCacheByPrefix("/api/wallet");
  }
  if (path.startsWith("/api/entitlements")) {
    invalidateCacheByPrefix("/api/entitlements");
  }
  if (path.startsWith("/api/subscription")) {
    invalidateCacheByPrefix("/api/wallet");
  }
  if (path.startsWith("/api/coupons")) {
    invalidateCacheByPrefix("/api/coupons");
  }
  if (path.startsWith("/api/promotions")) {
    invalidateCacheByPrefix("/api/promotions");
  }
  if (path.startsWith("/api/admin/promotions")) {
    invalidateCacheByPrefix("/api/promotions");
  }
  if (path.startsWith("/api/admin/promotions/defaults")) {
    invalidateCacheByPrefix("/api/promotions");
  }
  if (path.startsWith("/api/admin/branding")) {
    invalidateCacheByPrefix("/api/branding");
  }
  if (path.startsWith("/api/admin/series")) {
    invalidateCacheByPrefix("/api/series");
  }
  if (path.startsWith("/api/payments")) {
    invalidateCacheByPrefix("/api/orders");
    invalidateCacheByPrefix("/api/wallet");
  }
  if (path.startsWith("/api/orders/reconcile")) {
    invalidateCacheByPrefix("/api/orders");
  }
  if (path.startsWith("/api/events")) {
    invalidateCacheByPrefix("/api/events");
  }
}

async function parseJson(response: Response): Promise<any> {
  try {
    return await response.json();
  } catch (err) {
    return null;
  }
}

async function requestJson(
  path: string,
  options: ApiRequestOptions & { method: string }
): Promise<ApiResponse> {
  const baseUrl = getBaseUrl();
  const maxRetries = options?.maxRetries || 3;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutMs = options?.timeoutMs || DEFAULT_TIMEOUT_MS;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      // 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉ｅ妿閳瑰秵銇勯弮鍥撻柡鍡╁弮閺屻劌鈽夊▎鎴炴啝oken闂備胶绮划宥咁熆濡尨鑰挎い蹇撴閸嬫挸鈽夊▍顓т邯瀹曟垵顓兼径濠冨祶闂佸厖璀﹀Σ顡簆Only cookie濠电偞鍨堕幖鈺呭矗韫囨洘顫曟繝闈涙灩绾懐鐤€婵ê鍚嬬紞宀勬⒑闂堚晝绁烽柛鏂款儑濡叉劖瀵肩€涙ê娈滃銈呯箰鐎氼剝顤勯梻浣告啞閻燂箓宕归崸妤€鐒?      // 濠电偞鍨堕幐鍝ョ矓閻熻埇鈧帡宕滄担鐟版毇婵炶揪绲块幊鎾宦锋笟鈧弻娑㈠棘鐠囨彃顬嗙紓渚囧枤閸ㄦ仜calStorage闂佽崵濮村ú鈺咁敋瑜戦妵鎰板炊椤掆偓濡炰粙鎮橀悙鏉戝姢婵炲吋鍨块弻娑㈠籍閸屾銏ゆ煕閳轰胶鐏遍柟椋庡█閺屻劎鈧綆鍓氶崟鐐節?
      const headers = { ...options?.headers };

      const response = await fetch(`${baseUrl}${path}`, {
        ...options,
        headers,
        credentials: "include",
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      const payload = await parseJson(response);
      if (!response.ok) {
        if (payload?.error === "ADULT_GATED") {
          trackEvent("adult_gate_blocked", {
            path,
            reason: payload?.reason,
            status: response.status,
            requestId: payload?.requestId,
          });
        }
        const errorPayload: ApiResponse = {
          ok: false,
          status: response.status,
          error: payload?.error || response.statusText,
          requestId: payload?.requestId,
          ...payload,
        };
        const friendly = getFriendlyMessage(errorPayload.error, errorPayload.message);
        // 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉戔偓閺嬫牠鏌曟繛鐐珔婵炲懐鍋ら弻銊モ槈濞嗘劗娈ゅù婊勭洴濮?01闂傚倷鐒︾€笛囨偡閵娾晩鏁嬮柕鍫濐槹閸ゅ﹥銇勮箛鎾愁仼鐞氱喖鏌ｉ悢鍝ユ嚂缂佺姵鍨奸妵鎰板磼閻愭潙鍓柣鐘叉穿鐏忔瑧绮旂捄銊㈠亾濞堝灝鏋涙繝鈧柆宥嗗仒闁靛鏅滈弲顒傗偓鍏夊亾闁告劖鍎抽弫銈夋⒑濞茬粯濞囬柛鏂跨Ч瀹曞搫鈽夐姀鈥虫疁濡炪倕绻愬Λ娆撳汲閻樺磭绠鹃柡澶嬪灩缁犵儤銇?
        if (response.status === 401) {
          // 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉ｅ妿閳瑰秵銇勯弮鍌楁嫛婵℃彃顭烽弻?01闂傚倷鐒︾€笛囨偡閵娾晩鏁嬮柕鍫濐槹椤ュ牊绻涢崱妯诲暗閻㈩垱绋戦…璺ㄦ崉閸濆嫷浼€闂佽鍠栭敃顏堝极瀹ュ洣娌柤娴嬫櫇閹插綊姊洪崫鍕仼濠⒀傜矙婵￠潧顫㈢粊鍢簊t闂備線娼уΛ鏂款渻閹烘梻绠斿┑澶岀＇ack闂備線娼уΛ鏂款渻閹烘梻绠斿璺侯儐缂嶅洭鏌熼幆褍鏆辨慨锝呫€卭nsole闂傚倷鐒︾€笛囨偡閵娾晩鏁?
          const suppressAuth =
            options?.suppressAuthModal ||
            path.startsWith("/api/admin") ||
            isSilentAuthPath(path);
          if (!suppressAuth) {
            // emitAuthRequired({ path });
          }
          // 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉戔偓閺嬫牠鏌曟繛鐐珔婵炲懐鍋ら弻銊モ槈濞嗗繐鎽靛┑鐐殿儠閸婃牠鈥旈埀顒佷繆椤栨繃纭剁紒鐘崇叀閺?01闂傚倷鐒︾€笛囨偡閵娾晩鏁嬮柕鍫濐槹閺咁剟鎮橀悙璺轰汗闁荤喐绻堥弻锟犲礋椤愨懇鎸冮梺闈涙处椤掔晜ast闂備礁婀辩划顖炲礉濡ゅ懎桅婵鍩栭弲顒勬倶閻愯泛浜归柣鐔告尋rack api_error
          return errorPayload;
        }
        // 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉戔偓閺嬫牠鏌曟繛鐐珔婵炲懐鍋ら弻銊モ槈濞嗗繐鎽垫繛鏉戠毞閺呯姴鐣?api/events闂傚倷鐒︾€笛囨偡閵娾晩鏁嬮柕鍫濇礌閸嬫挻鎷呴崘顭戞闂佹悶浼囬崶褏鐫勯梺缁橆焽缁垶顢撳▎鎴斿亾閻㈢浜板ù婊呭仱閻?- 濠电偞鍨堕幐鍝ョ矓閻戝鈧懘銆呭鐮k /api/events闂備焦鐪归崝宀€鈧矮鍗冲顐ｇ節閸曨剙鐝?        // 401闂傚倷鐒︾€笛囨偡閵娾晩鏁嬮柕鍫濇媼閸熷懘鏌ょ喊鍗炲闁汇儱鎳橀弻娑㈡晜閸濆嫬顬嗙紓浣诡殔閸婂灝螞閸愵喖顫呴柣娆屽亾婵℃煡浜堕弻锝夋倷閸欏妫涚紓渚囩厜缁绘繈寮鍛殕闁告劦浜為鎰版⒒娴ｇ懓绲婚柤娲诲灥閵囨劙鈥旂花濉k闂?01闂傚倷鐒︾€笛囨偡閵娾晩鏁?
        if (!path.startsWith("/api/events")) {
          trackEvent("api_error", {
            path,
            status: response.status,
            errorCode: errorPayload.error,
            requestId: payload?.requestId,
          });
        }
        if (response.status >= 500) {
          emitToast({
            message: `${friendly} RequestId: ${payload?.requestId || "N/A"}`,
          });
        } else if (response.status >= 400) {
          emitToast({ message: friendly });
        }
        return errorPayload;
      }
      return {
        ok: true,
        status: response.status,
        data: payload,
        requestId: payload?.requestId,
      };
    } catch (err) {
      // 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉戔偓閺嬫牠鏌曟繛鐐珔婵炲懐鍋ら弻銊モ槈濞嗘ê濡礶alth/tracking/auth缂傚倷鐒︾粙鎴λ囬棃娑辩劷闁靛牆妫〒鑸典繆椤栨繃纭堕柣鏂挎噽閳ь剙鐏氬妯尖偓姘间簽缁厽寰勯幇顒€寮烽梺鍛婃寙娴ｉ椹砊oast闂備焦瀵х粙鎴︽儗閸屾稑顕遍柍鍝勬噹缁€鍌溾偓骞垮劚椤︻參鍩€椤掆偓椤﹂潧螞閸愵喖顫呴柣妯诲絻閸炪劍绻濋姀锝嗙【缂佸鎸抽幊妯荤節閸パ咁槱闂佹儳绻愬﹢杈╃矓閸︻厾纾藉ù锝呮贡閻帡鏌℃担闈╁姛闁归濞€椤㈡稑鈽夊Ο鐓庘偓鎺旂磽娴ｆ彃浜?
      const isSilentNetworkPath =
        path.startsWith("/api/health") ||
        path.startsWith("/api/tracking") ||
        path.startsWith("/api/auth/me") ||
        path.startsWith("/api/meta") ||
        path.startsWith("/api/branding") ||
        path.startsWith("/api/preferences") ||
        path.startsWith("/api/regions") ||
        path.startsWith("/api/progress") ||
        path.startsWith("/api/rewards") ||
        path.startsWith("/api/notifications") ||
        path.startsWith("/api/events") ||
        path.startsWith("/api/search/hot") ||
        path.startsWith("/api/series") ||
        path.startsWith("/api/follow") ||
        path.startsWith("/api/history") ||
        path.startsWith("/api/bookmarks") ||
        path.startsWith("/api/missions");
      if (!isSilentNetworkPath) {
        emitToast({ message: getFriendlyMessage("NETWORK_ERROR", "Network error. Check backend.") });
      }
      // 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉戔偓閺嬫牠鏌曟繛鐐珔婵炲懐鍋ら弻銊モ槈濞嗗繐鎽垫繛鏉戠毞閺呯姴鐣?api/events闂傚倷鐒︾€笛囨偡閵娾晩鏁嬮柕鍫濇礌閸嬫挻鎷呴崘顭戞闂佹悶浼囬崶褏鐫勯梺缁橆焽缁垶顢撳▎鎴斿亾閻㈢浜板ù婊呭仱閻?- 濠电偞鍨堕幐鍝ョ矓閻戝鈧懘銆呭鐮k /api/events闂備焦鐪归崝宀€鈧矮鍗冲顐ｇ節閸曨剙鐝?
      if (!path.startsWith("/api/events")) {
        trackEvent("api_error", { path, status: 0, errorCode: "NETWORK_ERROR" });
      }
      return {
        ok: false,
        status: 0,
        error: err instanceof Error && err.name === "AbortError" ? "TIMEOUT" : "NETWORK_ERROR",
      };
    }
  }
}

// ============ 闂佽娴烽弫鎼佸储瑜斿畷鐢割敇閵忊€冲壄闂佸憡鍨堕埞濂嶉梻浣告啞閸ㄥ吋鎱ㄩ妶澶婃辈?============

export function getApiBaseUrl(): string {
  return getBaseUrl();
}

export async function apiGet<T = any>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  const cacheMs = options.cacheMs ?? getDefaultCacheMs(path);
  if (!options.bust && cacheMs > 0) {
    const cached = readCache(path);
    if (cached) {
      cacheStats.hits += 1;
      cacheLog.push({ type: "hit", path, ts: Date.now() });
      if (cacheLog.length > CACHE_LOG_LIMIT) {
        cacheLog.shift();
      }
      return cached as ApiResponse<T>;
    }
    const localCached = readLocalCache(path);
    if (localCached) {
      cacheStats.hits += 1;
      cacheLog.push({ type: "hit_local", path, ts: Date.now() });
      if (cacheLog.length > CACHE_LOG_LIMIT) {
        cacheLog.shift();
      }
      return { ...localCached, stale: true } as ApiResponse<T>;
    }
    cacheStats.misses += 1;
    cacheLog.push({ type: "miss", path, ts: Date.now() });
    if (cacheLog.length > CACHE_LOG_LIMIT) {
      cacheLog.shift();
    }
  }

  // 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉墮濡﹢鏌℃径瀣靛劌闁哄顭烽弻銊モ槈濞嗘垹鍙濇繝鐢靛仜濞差參骞冩禒瀣╅柍瑙勫劤娴滅偓鎱ㄥΟ鍧楀摵闁哄棗绻橀弻锝夊Ω閵夈儺浠煎Δ鐘靛仦閹瑰洭寮荤仦绛嬪悑闁糕剝顭囬惃濠氭⒑?
  const dedupeMs = options.dedupeMs ?? 300;
  if (dedupeMs > 0) {
    const dedupeKey = getDedupeKey(path, "GET");
    if (inflightRequests.has(dedupeKey)) {
      return inflightRequests.get(dedupeKey) as Promise<ApiResponse<T>>;
    }

    const requestPromise = (async () => {
      const attempts = 2;
      let lastResponse: ApiResponse | null = null;
      for (let attempt = 0; attempt < attempts; attempt += 1) {
        const response = await requestJson(path, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          timeoutMs: options.timeoutMs || DEFAULT_TIMEOUT_MS,
          suppressAuthModal: options?.suppressAuthModal,
        });
        lastResponse = response;
        if (response.ok) {
          recordSuccess(path);
          writeCache(path, response, cacheMs);
          writeLocalCache(path, response, cacheMs);
          return response;
        }
        if (response.status === 0 || response.status >= 500) {
          recordFailure(path);
          if (attempt < attempts - 1) {
            await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
            continue;
          }
        }
        return response;
      }
      return lastResponse || { ok: false, status: 0, error: "UNKNOWN_ERROR" };
    })();

    inflightRequests.set(dedupeKey, requestPromise);
    try {
      return (await requestPromise) as ApiResponse<T>;
    } finally {
      setTimeout(() => inflightRequests.delete(dedupeKey), dedupeMs);
    }
  }

  // 濠电姷顣介埀顒€鍟块埀顒€缍婇幃妯诲緞瀹€鈧惌澶娒归敐鍥у妺闁哄棗绻橀弻娑樜熸笟顖滃悑闂侀潻绲鹃幃鍌炲极瀹ュ洣娌柣鎾崇岸閺嬪繘姊哄ú缁樺▏闁告柨绉磋灋妞ゆ劧闄勯崕宥夋煕閹烘梹鍎甪lightGets闂備礁鎼悧鍡涘箹椤愶箑鏄ユ俊銈呮噺閺咁剟鏌涢锝囩畺闁稿﹤顭烽弻娑橆潩椤掑嫷鈧鏌涘顒夊剳闁逞屽墮濠€鍗炩枍閵忋垺顫?
  if (inflightGets.has(path)) {
    return inflightGets.get(path) as Promise<ApiResponse<T>>;
  }
  if (isCircuitOpen(path)) {
    return {
      ok: false,
      status: 503,
      error: "CIRCUIT_OPEN",
    };
  }
  const requestPromise = (async () => {
    const attempts = 2;
    let lastResponse: ApiResponse | null = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const response = await requestJson(path, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        timeoutMs: options.timeoutMs || DEFAULT_TIMEOUT_MS,
        suppressAuthModal: options?.suppressAuthModal,
      });
      lastResponse = response;
      if (response.ok) {
        recordSuccess(path);
        writeCache(path, response, cacheMs);
        writeLocalCache(path, response, cacheMs);
        return response;
      }
      if (response.status === 0 || response.status >= 500) {
        recordFailure(path);
        if (attempt < attempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 200 * (attempt + 1)));
          continue;
        }
      }
      return response;
    }
    return lastResponse || { ok: false, status: 0, error: "UNKNOWN_ERROR" };
  })();
  inflightGets.set(path, requestPromise);
  try {
    return (await requestPromise) as ApiResponse<T>;
  } finally {
    inflightGets.delete(path);
  }
}

export async function apiPost<T = any>(
  path: string,
  body?: any,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  // 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉墮濡﹢鏌℃径瀣靛劌闁哄顭烽弻銊モ槈濞嗘埈鏆￠梺杞扮贰閸ｏ綁鐛幇顓犫枖闁活喖鍤猅闂佽崵濮村ú顓㈠绩闁秵鍎戝ù鍏兼綑閸屻劌鈹戦悩瀹犲婵?
  const dedupeMs = options.dedupeMs ?? 300; // 濠殿喗甯楃粙鎺椻€﹂崼銉晣?00ms闂備礁鎲￠崝鏇㈠箠閹邦兘鏋旈柟杈鹃檮閻撳倻鈧箍鍎遍幏瀣ｆ繝姘仯闁搞儺鍓氶弫閬嶆煟椤忓棗顣奸悗鐢靛帶椤繈骞囨担纭呮櫑闂備礁鎲￠敋妞ゎ厾鍏樺畷?
  if (dedupeMs > 0) {
    const dedupeKey = getDedupeKey(path, "POST", body);
    if (inflightRequests.has(dedupeKey)) {
      return inflightRequests.get(dedupeKey) as Promise<ApiResponse<T>>;
    }

    const requestPromise = (async () => {
      const response = await requestJson(path, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...options.headers },
        body: JSON.stringify(body || {}),
        timeoutMs: options.timeoutMs,
      });
      if (response.ok) {
        recordSuccess(path);
        invalidateCacheForWrite(path);
      } else if (response.status === 0 || response.status >= 500) {
        recordFailure(path);
      }
      return response;
    })();

    inflightRequests.set(dedupeKey, requestPromise);
    try {
      return (await requestPromise) as ApiResponse<T>;
    } finally {
      setTimeout(() => inflightRequests.delete(dedupeKey), dedupeMs);
    }
  }

  // 濠电姷顣介埀顒€鍟块埀顒€缍婇幃妯诲緞瀹€鈧惌澶娒归敐鍥у妺闁哄棗绻橀弻娑樜熸笟顖滃悑闂侀潻绲鹃幃鍌炲极瀹ュ懐鏆嗛柍褜鍓欑叅闁秆勵殔缁犳娊鏌曟径鍫濆姎缂佸弶妞藉娲敃閳╁啰銈板銈嗘处閸撴瑦鏅?
  const response = await requestJson(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...options.headers },
    body: JSON.stringify(body || {}),
    timeoutMs: options.timeoutMs,
  });
  if (response.ok) {
    recordSuccess(path);
    invalidateCacheForWrite(path);
  } else if (response.status === 0 || response.status >= 500) {
    recordFailure(path);
  }
  return response as ApiResponse<T>;
}

export async function apiUpload<T = any>(
  path: string,
  formData: FormData,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  // 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉墮濡﹢鏌℃径瀣靛劌闁哄顭烽弻銊モ槈濞嗘埈鏆￠梺杞扮贰閸ｏ綁鐛幇顓熷濡炲娴烽幉顏呯箾绾惧浜瑰┑顕€绠栭、姘额敆閳ь剚鏅ラ梺绋挎湰閼瑰墽绮婚悽鍛娾拺?  // 婵犵數鍋涢ˇ顓㈠礉瀹ュ绀堝ù鐓庣摠閺咁剚绻涢崱娆樻剑rmData闂備礁鎼崯鐗堟叏閻㈠灚鍏滈柤绋跨仛閸庣喖鐓崶銊﹀碍闁诲繑鐟╅弻娑㈠冀閵娧冾棄缂備浇椴哥换鍫ョ嵁瀹ュ鐒垫い鎺嶈兌椤╃兘鏌曟径鍫濆姎婵炴嚪鍥ㄧ厾鐎规洖娲﹀▍鏇㈡煛娓氬洦顫焌th濠电偠鎻徊鍓у垝閸垺瀚婚柣鎺撶创y
  const dedupeMs = options.dedupeMs ?? 300;
  if (dedupeMs > 0) {
    const dedupeKey = `POST:${path}:upload`;
    if (inflightRequests.has(dedupeKey)) {
      return inflightRequests.get(dedupeKey) as Promise<ApiResponse<T>>;
    }

    const requestPromise = (async () => {
      const response = await requestJson(path, {
        method: "POST",
        headers: options.headers,
        body: formData,
        timeoutMs: options.timeoutMs,
      });
      if (response.ok) {
        recordSuccess(path);
        invalidateCacheForWrite(path);
      } else if (response.status === 0 || response.status >= 500) {
        recordFailure(path);
      }
      return response;
    })();

    inflightRequests.set(dedupeKey, requestPromise);
    try {
      return (await requestPromise) as ApiResponse<T>;
    } finally {
      setTimeout(() => inflightRequests.delete(dedupeKey), dedupeMs);
    }
  }

  // 濠电姷顣介埀顒€鍟块埀顒€缍婇幃妯诲緞瀹€鈧惌澶娒归敐鍥у妺闁哄棗绻橀弻娑樜熸笟顖滃悑闂侀潻绲鹃幃鍌炲极瀹ュ懐鏆嗛柍褜鍓欑叅闁秆勵殔缁犳娊鏌曟径鍫濆姎缂佸弶妞藉娲敃閳╁啰銈板銈嗘处閸撴瑦鏅?
  const response = await requestJson(path, {
    method: "POST",
    headers: options.headers,
    body: formData,
    timeoutMs: options.timeoutMs,
  });
  if (response.ok) {
    recordSuccess(path);
    invalidateCacheForWrite(path);
  } else if (response.status === 0 || response.status >= 500) {
    recordFailure(path);
  }
  return response as ApiResponse<T>;
}

export async function apiPatch<T = any>(
  path: string,
  body?: any,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  // 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉墮濡﹢鏌℃径瀣靛劌闁哄顭烽弻銊モ槈濞嗘埈鏆￠梺杞扮贰閸ｏ綁鐛幇顓犫枖闁活厸鏅睠H闂佽崵濮村ú顓㈠绩闁秵鍎戝ù鍏兼綑閸屻劌鈹戦悩瀹犲婵?
  const dedupeMs = options.dedupeMs ?? 300; // 濠殿喗甯楃粙鎺椻€﹂崼銉晣?00ms闂備礁鎲￠崝鏇㈠箠閹邦兘鏋旈柟杈鹃檮閻撳倻鈧箍鍎遍幏瀣ｆ繝姘仯闁搞儺鍓氶弫閬嶆煟椤忓棗顣奸悗鐢靛帶椤繈骞囨担纭呮櫑闂備礁鎲￠敋妞ゎ厾鍏樺畷?
  if (dedupeMs > 0) {
    const dedupeKey = getDedupeKey(path, "PATCH", body);
    if (inflightRequests.has(dedupeKey)) {
      return inflightRequests.get(dedupeKey) as Promise<ApiResponse<T>>;
    }

    const requestPromise = (async () => {
      const response = await requestJson(path, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", ...options.headers },
        body: JSON.stringify(body || {}),
        timeoutMs: options.timeoutMs,
      });
      if (response.ok) {
        recordSuccess(path);
        invalidateCacheForWrite(path);
      } else if (response.status === 0 || response.status >= 500) {
        recordFailure(path);
      }
      return response;
    })();

    inflightRequests.set(dedupeKey, requestPromise);
    try {
      return (await requestPromise) as ApiResponse<T>;
    } finally {
      setTimeout(() => inflightRequests.delete(dedupeKey), dedupeMs);
    }
  }

  // 濠电姷顣介埀顒€鍟块埀顒€缍婇幃妯诲緞瀹€鈧惌澶娒归敐鍥у妺闁哄棗绻橀弻娑樜熸笟顖滃悑闂侀潻绲鹃幃鍌炲极瀹ュ懐鏆嗛柍褜鍓欑叅闁秆勵殔缁犳娊鏌曟径鍫濆姎缂佸弶妞藉娲敃閳╁啰銈板銈嗘处閸撴瑦鏅?
  const response = await requestJson(path, {
    method: "PATCH",
    headers: { "Content-Type": "application/json", ...options.headers },
    body: JSON.stringify(body || {}),
    timeoutMs: options.timeoutMs,
  });
  if (response.ok) {
    recordSuccess(path);
    invalidateCacheForWrite(path);
  } else if (response.status === 0 || response.status >= 500) {
    recordFailure(path);
  }
  return response as ApiResponse<T>;
}

export async function apiDelete<T = any>(
  path: string,
  body?: any,
  options: ApiRequestOptions = {}
): Promise<ApiResponse<T>> {
  // 闂備礁銈搁。锕傛嚄閸撲焦鏆滈柛銉墮濡﹢鏌℃径瀣靛劌闁哄顭烽弻銊モ槈濞嗘埈鏆￠梺杞扮贰閸ｏ綁鐛幇顓犫枖鐎点倕纭汦TE闂佽崵濮村ú顓㈠绩闁秵鍎戝ù鍏兼綑閸屻劌鈹戦悩瀹犲婵?
  const dedupeMs = options.dedupeMs ?? 300; // 濠殿喗甯楃粙鎺椻€﹂崼銉晣?00ms闂備礁鎲￠崝鏇㈠箠閹邦兘鏋旈柟杈鹃檮閻撳倻鈧箍鍎遍幏瀣ｆ繝姘仯闁搞儺鍓氶弫閬嶆煟椤忓棗顣奸悗鐢靛帶椤繈骞囨担纭呮櫑闂備礁鎲￠敋妞ゎ厾鍏樺畷?
  if (dedupeMs > 0) {
    const dedupeKey = getDedupeKey(path, "DELETE", body);
    if (inflightRequests.has(dedupeKey)) {
      return inflightRequests.get(dedupeKey) as Promise<ApiResponse<T>>;
    }

    const requestPromise = (async () => {
      const response = await requestJson(path, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", ...options.headers },
        body: body ? JSON.stringify(body) : undefined,
        timeoutMs: options.timeoutMs,
      });
      if (response.ok) {
        recordSuccess(path);
        invalidateCacheForWrite(path);
      } else if (response.status === 0 || response.status >= 500) {
        recordFailure(path);
      }
      return response;
    })();

    inflightRequests.set(dedupeKey, requestPromise);
    try {
      return (await requestPromise) as ApiResponse<T>;
    } finally {
      setTimeout(() => inflightRequests.delete(dedupeKey), dedupeMs);
    }
  }

  // 濠电姷顣介埀顒€鍟块埀顒€缍婇幃妯诲緞瀹€鈧惌澶娒归敐鍥у妺闁哄棗绻橀弻娑樜熸笟顖滃悑闂侀潻绲鹃幃鍌炲极瀹ュ懐鏆嗛柍褜鍓欑叅闁秆勵殔缁犳娊鏌曟径鍫濆姎缂佸弶妞藉娲敃閳╁啰銈板銈嗘处閸撴瑦鏅?
  const response = await requestJson(path, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...options.headers },
    body: body ? JSON.stringify(body) : undefined,
    timeoutMs: options.timeoutMs,
  });
  if (response.ok) {
    recordSuccess(path);
    invalidateCacheForWrite(path);
  } else if (response.status === 0 || response.status >= 500) {
    recordFailure(path);
  }
  return response as ApiResponse<T>;
}

// ============ 缂傚倸鍊搁崐褰掑箰閹间焦鍋ら柕濞у懍绗夐梺鎸庣☉鐎氼參宕愰悙鐑樼厱闁硅揪绲借闂?============

export function getCacheStats(): CacheStats {
  return {
    hits: cacheStats.hits,
    misses: cacheStats.misses,
    writes: cacheStats.writes,
    size: responseCache.size,
  };
}

export function resetCacheStats(): void {
  cacheStats.hits = 0;
  cacheStats.misses = 0;
  cacheStats.writes = 0;
}

export function getCacheLog(): CacheLogEntry[] {
  return [...cacheLog];
}
