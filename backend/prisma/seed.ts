import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';
import { resolve } from 'path';

// 老王说：加载 .env 文件
config({ path: resolve(__dirname, '../.env') });

const prisma = new PrismaClient();

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
        pages: [
          { url: `https://placehold.co/800x1200/1a1a2e/ffffff?text=${encodeURIComponent(series.title)}+Ep${i}+P1`, w: 800, h: 1200 },
          { url: `https://placehold.co/800x1200/1a1a2e/ffffff?text=${encodeURIComponent(series.title)}+Ep${i}+P2`, w: 800, h: 1200 },
          { url: `https://placehold.co/800x1200/1a1a2e/ffffff?text=${encodeURIComponent(series.title)}+Ep${i}+P3`, w: 800, h: 1200 },
        ],
      });
    }
  }

  for (const episode of episodesData) {
    await prisma.episode.upsert({
      where: { id: episode.id },
      update: {},
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
