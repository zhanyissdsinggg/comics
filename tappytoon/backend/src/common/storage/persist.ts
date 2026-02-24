import * as fs from "fs";
import * as path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "mock-store.json");

type PersistPayload = {
  usersByEmail?: Record<string, any>;
  usersById?: Record<string, any>;
  sessions?: Record<string, string>;
  wallets?: Record<string, any>;
  entitlements?: Record<string, Record<string, any>>;
  orders?: Record<string, any[]>;
  paymentIntents?: Record<string, Record<string, any>>;
  progress?: Record<string, Record<string, any>>;
  seriesById?: Record<string, any>;
  episodesBySeriesId?: Record<string, any[]>;
  promotionsById?: Record<string, any>;
  coupons?: Record<string, any[]>;
  rewards?: Record<string, any>;
  missions?: Record<string, any>;
  follows?: Record<string, any[]>;
  notifications?: Record<string, any[]>;
  comments?: Record<string, any[]>;
  ratings?: Record<string, Record<string, number>>;
  subscriptionUsage?: Record<string, any>;
  subscriptionVoucher?: Record<string, any>;
  bookmarks?: Record<string, Record<string, any[]>>;
  history?: Record<string, any[]>;
  trackingConfig?: { values: Record<string, any>; updatedAt: string | null };
  brandingConfig?: {
    siteLogoUrl: string;
    faviconUrl: string;
    homeBannerUrl: string;
    updatedAt: string | null;
  };
  regionConfig?: {
    countryCodes: { code: string; label: string }[];
    lengthRules: Record<string, number[]>;
    updatedAt: string | null;
  };
  emailJobs?: Record<string, any>;
  searchLog?: Record<string, Record<string, number>>;
  viewStatsByDate?: Record<string, number>;
  registrationStatsByDate?: Record<string, number>;
  dauStatsByDate?: Record<string, string[]>;
  paidOrdersByDate?: Record<string, number>;
  seriesViewByDate?: Record<string, Record<string, number>>;
};

let writeTimer: NodeJS.Timeout | null = null;

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function readPersistedStore(): PersistPayload {
  try {
    if (!fs.existsSync(DATA_FILE)) {
      return {};
    }
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function schedulePersist(payload: PersistPayload) {
  ensureDir();
  if (writeTimer) {
    clearTimeout(writeTimer);
  }
  writeTimer = setTimeout(() => {
    try {
      fs.writeFileSync(DATA_FILE, JSON.stringify(payload, null, 2), "utf-8");
    } catch {
      // ignore write errors
    }
  }, 500);
}
