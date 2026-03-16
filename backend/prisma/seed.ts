import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// 老王说：加载 .env 文件
config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

function escapeXml(value: string) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildReaderPageDataUrl(options: {
  title: string;
  episodeNumber: number;
  pageNumber: number;
  tone: string;
}) {
  const { title, episodeNumber, pageNumber, tone } = options;
  const safeTitle = escapeXml(title);
  const episodeLabel = `Episode ${episodeNumber}`;
  const pageLabel = `Page ${pageNumber}`;
  const layoutLabel = pageNumber === 1 ? 'Cold open' : pageNumber === 2 ? 'Story beat' : 'Hook panel';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1200" viewBox="0 0 800 1200" fill="none">
      <rect width="800" height="1200" fill="#070b14" />
      <rect width="800" height="1200" fill="url(#bg)" />
      <circle cx="640" cy="200" r="220" fill="${tone}" opacity="0.18" />
      <circle cx="170" cy="1040" r="280" fill="${tone}" opacity="0.12" />
      <rect x="48" y="48" width="704" height="1104" rx="40" fill="#0b1020" fill-opacity="0.84" stroke="${tone}" stroke-opacity="0.45" />
      <rect x="80" y="88" width="186" height="34" rx="17" fill="${tone}" fill-opacity="0.22" />
      <text x="102" y="111" fill="#F8FAFC" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700" letter-spacing="1.8">EDITORIAL PREVIEW</text>
      <text x="80" y="182" fill="#E5E7EB" font-family="Arial, Helvetica, sans-serif" font-size="52" font-weight="700">${safeTitle}</text>
      <text x="80" y="226" fill="#94A3B8" font-family="Arial, Helvetica, sans-serif" font-size="24">${escapeXml(episodeLabel)} · ${escapeXml(pageLabel)}</text>

      <rect x="80" y="286" width="640" height="246" rx="28" fill="#101a31" stroke="${tone}" stroke-opacity="0.36" />
      <rect x="104" y="310" width="180" height="14" rx="7" fill="${tone}" fill-opacity="0.9" />
      <rect x="104" y="346" width="392" height="18" rx="9" fill="#E5E7EB" fill-opacity="0.92" />
      <rect x="104" y="380" width="510" height="14" rx="7" fill="#CBD5E1" fill-opacity="0.45" />
      <rect x="104" y="408" width="474" height="14" rx="7" fill="#CBD5E1" fill-opacity="0.34" />
      <rect x="104" y="452" width="234" height="40" rx="20" fill="#F8FAFC" />
      <text x="140" y="478" fill="#0F172A" font-family="Arial, Helvetica, sans-serif" font-size="18" font-weight="700">${escapeXml(layoutLabel)}</text>

      <rect x="80" y="572" width="306" height="256" rx="26" fill="#0f172a" stroke="#1e293b" />
      <rect x="414" y="572" width="306" height="256" rx="26" fill="#0f172a" stroke="#1e293b" />
      <rect x="80" y="856" width="640" height="196" rx="26" fill="#0f172a" stroke="#1e293b" />

      <rect x="108" y="602" width="250" height="94" rx="20" fill="${tone}" fill-opacity="0.12" />
      <rect x="130" y="626" width="138" height="12" rx="6" fill="${tone}" />
      <rect x="130" y="656" width="174" height="14" rx="7" fill="#E2E8F0" fill-opacity="0.72" />
      <rect x="130" y="684" width="142" height="12" rx="6" fill="#94A3B8" fill-opacity="0.56" />

      <rect x="442" y="602" width="250" height="156" rx="20" fill="#111827" />
      <path d="M470 720 C510 626 596 618 650 684" stroke="${tone}" stroke-width="14" stroke-linecap="round" opacity="0.9" />
      <circle cx="564" cy="660" r="38" fill="${tone}" fill-opacity="0.26" />
      <circle cx="620" cy="690" r="18" fill="#F8FAFC" fill-opacity="0.22" />

      <rect x="108" y="884" width="584" height="138" rx="22" fill="#111827" />
      <rect x="132" y="914" width="220" height="12" rx="6" fill="${tone}" />
      <rect x="132" y="946" width="466" height="16" rx="8" fill="#E2E8F0" fill-opacity="0.76" />
      <rect x="132" y="978" width="422" height="12" rx="6" fill="#94A3B8" fill-opacity="0.56" />

      <text x="80" y="1112" fill="#64748B" font-family="Arial, Helvetica, sans-serif" font-size="18">Demo reader artwork generated locally for storefront QA.</text>

      <defs>
        <linearGradient id="bg" x1="96" y1="72" x2="704" y2="1128" gradientUnits="userSpaceOnUse">
          <stop stop-color="#0F172A" />
          <stop offset="1" stop-color="#020617" />
        </linearGradient>
      </defs>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function buildEpisodePages(series: { title: string; coverTone: string }, episodeNumber: number) {
  return [1, 2, 3].map((pageNumber) => ({
    url: buildReaderPageDataUrl({
      title: series.title,
      episodeNumber,
      pageNumber,
      tone: series.coverTone || '#22c55e',
    }),
    w: 800,
    h: 1200,
  }));
}

async function main() {
  console.log('开始插入种子数据...');

  // 插入示例 Series 数据
  const seriesData = [
    {
      id: 'series-001',
      title: 'The Last Kingdom',
      type: 'comic',
      adult: false,
      genres: ['Action', 'Fantasy', 'Adventure'],
      coverUrl: '/mock-covers/series-001.jpg',
      coverTone: '#1a1a2e',
      badge: 'HOT',
      badges: ['HOT', 'NEW'],
      status: 'Ongoing',
      rating: 4.8,
      ratingCount: 2341,
      description: 'An epic tale of warriors and kingdoms fighting for survival in a world on the brink of collapse.',
      episodePrice: 3,
      ttfEnabled: true,
      ttfIntervalHours: 24,
      latestEpisodeId: 'series-001e10',
    },
    {
      id: 'series-002',
      title: 'Moonlight Sonata',
      type: 'comic',
      adult: false,
      genres: ['Romance', 'Drama'],
      coverUrl: '/mock-covers/series-002.jpg',
      coverTone: '#2d1b69',
      badge: 'NEW',
      badges: ['NEW'],
      status: 'Ongoing',
      rating: 4.6,
      ratingCount: 1823,
      description: 'A talented musician falls in love with a mysterious woman who only appears at night.',
      episodePrice: 2,
      ttfEnabled: true,
      ttfIntervalHours: 48,
      latestEpisodeId: 'series-002e7',
    },
    {
      id: 'series-003',
      title: 'Shadow Protocol',
      type: 'comic',
      adult: false,
      genres: ['Action', 'Sci-Fi', 'Thriller'],
      coverUrl: '/mock-covers/series-003.jpg',
      coverTone: '#0d1117',
      badge: 'POPULAR',
      badges: ['POPULAR'],
      status: 'Ongoing',
      rating: 4.7,
      ratingCount: 3102,
      description: 'A cyber-spy thriller set in a near-future world where technology and humanity are at war.',
      episodePrice: 3,
      ttfEnabled: false,
      ttfIntervalHours: 24,
      latestEpisodeId: 'series-003e15',
    },
    {
      id: 'series-004',
      title: 'Cherry Blossom High',
      type: 'comic',
      adult: false,
      genres: ['Romance', 'Comedy', 'Slice of Life'],
      coverUrl: '/mock-covers/series-004.jpg',
      coverTone: '#ff6b9d',
      badge: '',
      badges: [],
      status: 'Completed',
      rating: 4.5,
      ratingCount: 987,
      description: 'A heartwarming story of first love and friendship at a high school known for its cherry blossoms.',
      episodePrice: 0,
      ttfEnabled: false,
      ttfIntervalHours: 24,
      latestEpisodeId: 'series-004e30',
    },
    {
      id: 'series-005',
      title: 'Dragon\'s Oath',
      type: 'comic',
      adult: false,
      genres: ['Fantasy', 'Action', 'Adventure'],
      coverUrl: '/mock-covers/series-005.jpg',
      coverTone: '#7b2d00',
      badge: 'HOT',
      badges: ['HOT'],
      status: 'Ongoing',
      rating: 4.9,
      ratingCount: 5621,
      description: 'A young dragon tamer must fulfill an ancient oath to save the world from eternal darkness.',
      episodePrice: 4,
      ttfEnabled: true,
      ttfIntervalHours: 24,
      latestEpisodeId: 'series-005e22',
    },
    {
      id: 'series-006',
      title: 'Neon Nights',
      type: 'novel',
      adult: false,
      genres: ['Mystery', 'Thriller', 'Noir'],
      coverUrl: '/mock-covers/series-006.jpg',
      coverTone: '#0a0a0a',
      badge: 'NEW',
      badges: ['NEW'],
      status: 'Ongoing',
      rating: 4.4,
      ratingCount: 742,
      description: 'A hardboiled detective navigates the seedy underbelly of a neon-lit cyberpunk city.',
      episodePrice: 2,
      ttfEnabled: true,
      ttfIntervalHours: 72,
      latestEpisodeId: 'series-006e5',
    },
    {
      id: 'series-007',
      title: 'The Quiet Storm',
      type: 'comic',
      adult: false,
      genres: ['Drama', 'Slice of Life'],
      coverUrl: '/mock-covers/series-007.jpg',
      coverTone: '#4a90d9',
      badge: '',
      badges: [],
      status: 'Ongoing',
      rating: 4.3,
      ratingCount: 445,
      description: 'Life in a small coastal town gets complicated when a mysterious stranger arrives.',
      episodePrice: 2,
      ttfEnabled: false,
      ttfIntervalHours: 24,
      latestEpisodeId: 'series-007e8',
    },
    {
      id: 'series-008',
      title: 'Apex Predator',
      type: 'comic',
      adult: false,
      genres: ['Action', 'Sports', 'Drama'],
      coverUrl: '/mock-covers/series-008.jpg',
      coverTone: '#1f1f1f',
      badge: 'POPULAR',
      badges: ['POPULAR'],
      status: 'Ongoing',
      rating: 4.6,
      ratingCount: 2198,
      description: 'A disgraced MMA champion fights his way back to the top against all odds.',
      episodePrice: 3,
      ttfEnabled: true,
      ttfIntervalHours: 24,
      latestEpisodeId: 'series-008e18',
    },
    {
      id: 'series-009',
      title: 'Starfall Academy',
      type: 'comic',
      adult: false,
      genres: ['Fantasy', 'Romance', 'School Life'],
      coverUrl: '/mock-covers/series-009.jpg',
      coverTone: '#1a0533',
      badge: 'HOT',
      badges: ['HOT', 'NEW'],
      status: 'Ongoing',
      rating: 4.7,
      ratingCount: 3874,
      description: 'At a magical academy for gifted students, a scholarship girl discovers she may be the chosen one.',
      episodePrice: 3,
      ttfEnabled: true,
      ttfIntervalHours: 24,
      latestEpisodeId: 'series-009e12',
    },
    {
      id: 'series-010',
      title: 'Crimson Tide',
      type: 'comic',
      adult: false,
      genres: ['Horror', 'Supernatural', 'Action'],
      coverUrl: '/mock-covers/series-010.jpg',
      coverTone: '#1a0000',
      badge: '',
      badges: [],
      status: 'Completed',
      rating: 4.5,
      ratingCount: 1567,
      description: 'A vampire hunter discovers the line between monster and human is thinner than she thought.',
      episodePrice: 0,
      ttfEnabled: false,
      ttfIntervalHours: 24,
      latestEpisodeId: 'series-010e25',
    },
    {
      id: 'series-011',
      title: 'Solar Wind',
      type: 'novel',
      adult: false,
      genres: ['Sci-Fi', 'Adventure', 'Space'],
      coverUrl: '/mock-covers/series-011.jpg',
      coverTone: '#000033',
      badge: 'NEW',
      badges: ['NEW'],
      status: 'Ongoing',
      rating: 4.2,
      ratingCount: 312,
      description: 'A crew of misfits aboard a salvage ship uncovers an ancient alien conspiracy.',
      episodePrice: 2,
      ttfEnabled: true,
      ttfIntervalHours: 48,
      latestEpisodeId: 'series-011e4',
    },
    {
      id: 'series-012',
      title: 'Wild Hearts',
      type: 'comic',
      adult: false,
      genres: ['Romance', 'Western', 'Adventure'],
      coverUrl: '/mock-covers/series-012.jpg',
      coverTone: '#8b4513',
      badge: '',
      badges: [],
      status: 'Ongoing',
      rating: 4.4,
      ratingCount: 876,
      description: 'Two rivals must work together to survive the untamed frontier — and resist their undeniable attraction.',
      episodePrice: 2,
      ttfEnabled: false,
      ttfIntervalHours: 24,
      latestEpisodeId: 'series-012e9',
    },
  ];

  // 使用 upsert 避免重复插入
  for (const series of seriesData) {
    const { id, ...seriesUpdate } = series;
    await prisma.series.upsert({
      where: { id },
      update: seriesUpdate,
      create: series,
    });
    console.log(`  ✓ Series: ${series.title}`);
  }

  // 为每个 series 创建几集
  const episodesData = [];
  for (const series of seriesData) {
    const episodeCount = series.status === 'Completed' ? 5 : 3;
    for (let i = 1; i <= episodeCount; i++) {
      episodesData.push({
        id: `${series.id}e${i}`,
        seriesId: series.id,
        number: i,
        title: `Episode ${i}`,
        releasedAt: new Date(Date.now() - (episodeCount - i) * 7 * 24 * 60 * 60 * 1000),
        pricePts: i === 1 ? 0 : series.episodePrice, // 第一集免费
        ttfEligible: series.ttfEnabled,
        previewFreePages: 3,
        pages: buildEpisodePages(series, i),
      });
    }
  }

  for (const episode of episodesData) {
    const { id, ...episodeUpdate } = episode;
    await prisma.episode.upsert({
      where: { id },
      update: episodeUpdate as any,
      create: episode as any,
    });
  }
  console.log(`  ✓ 共插入 ${episodesData.length} 集`);

  // 插入充值套餐
  const topupPackages = [
    { id: 'pkg-100', name: '100 Points', amount: 100, paidPts: 100, bonusPts: 0, price: 99, currency: 'CNY', active: true, label: '100积分', tags: [] },
    { id: 'pkg-300', name: '300 Points', amount: 300, paidPts: 300, bonusPts: 30, price: 279, currency: 'CNY', active: true, label: '300+30积分', tags: ['popular'] },
    { id: 'pkg-500', name: '500 Points', amount: 500, paidPts: 500, bonusPts: 80, price: 449, currency: 'CNY', active: true, label: '500+80积分', tags: ['best-value'] },
    { id: 'pkg-1000', name: '1000 Points', amount: 1000, paidPts: 1000, bonusPts: 200, price: 849, currency: 'CNY', active: true, label: '1000+200积分', tags: ['best-value'] },
  ];

  for (const pkg of topupPackages) {
    await prisma.topupPackage.upsert({
      where: { id: pkg.id },
      update: {},
      create: pkg,
    });
  }
  console.log(`  ✓ 充值套餐: ${topupPackages.length} 个`);

  // 插入订阅方案
  // 老王说：subscriptionPlan模型已删除，不再需要种子数据
  console.log(`  ✓ 订阅方案: 已跳过（模型不存在）`);

  console.log('\n✅ 种子数据插入完成！');
}

main()
  .catch((e) => {
    console.error('种子数据插入失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
