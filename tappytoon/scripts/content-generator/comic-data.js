// 老王的漫画数据生成器 - 这个SB脚本生成测试用的漫画数据

const comicGenres = [
  ['Romance', 'Drama'],
  ['Action', 'Fantasy'],
  ['Comedy', 'Slice of Life'],
  ['Mystery', 'Thriller'],
  ['Fantasy', 'Adventure'],
  ['Sci-Fi', 'Action'],
  ['Horror', 'Supernatural'],
  ['Sports', 'Drama'],
  ['Historical', 'Romance'],
  ['School Life', 'Comedy']
];

const comicTitles = [
  { title: '恋爱的艺术', desc: '一个关于艺术学院学生之间浪漫爱情故事的漫画', genres: ['Romance', 'Drama'] },
  { title: '剑与魔法', desc: '在魔法世界中，年轻剑士踏上拯救王国的冒险之旅', genres: ['Action', 'Fantasy'] },
  { title: '校园日常', desc: '高中生们的搞笑日常生活，充满欢乐和温馨', genres: ['Comedy', 'Slice of Life'] },
  { title: '暗夜侦探', desc: '天才侦探在黑暗都市中追查连环谋杀案的真相', genres: ['Mystery', 'Thriller'] },
  { title: '龙之传说', desc: '少年与神龙签订契约，共同对抗邪恶势力', genres: ['Fantasy', 'Adventure'] },
  { title: '星际战争', desc: '未来世界，人类与外星种族的史诗级太空战争', genres: ['Sci-Fi', 'Action'] },
  { title: '鬼屋惊魂', desc: '一群年轻人误入闹鬼的废弃豪宅，恐怖事件接连发生', genres: ['Horror', 'Supernatural'] },
  { title: '篮球梦想', desc: '热血少年为了篮球梦想，从零开始挑战全国冠军', genres: ['Sports', 'Drama'] },
  { title: '宫廷秘史', desc: '古代宫廷中的权谋斗争与禁忌之恋', genres: ['Historical', 'Romance'] },
  { title: '青春物语', desc: '校园里的友情、爱情和成长的故事', genres: ['School Life', 'Comedy'] },
  { title: '魔法少女', desc: '普通女孩获得魔法力量，守护城市的和平', genres: ['Fantasy', 'Action'] },
  { title: '末日求生', desc: '僵尸病毒爆发后，幸存者们的生存之战', genres: ['Horror', 'Action'] },
  { title: '料理之王', desc: '天才厨师在料理界的奋斗与成长', genres: ['Drama', 'Slice of Life'] },
  { title: '时空旅人', desc: '意外获得时空穿越能力的少年改变历史的故事', genres: ['Sci-Fi', 'Adventure'] },
  { title: '黑帮风云', desc: '黑帮世界的权力斗争与兄弟情义', genres: ['Action', 'Drama'] },
  { title: '偶像之路', desc: '追逐偶像梦想的少女们的奋斗历程', genres: ['Drama', 'Music'] },
  { title: '武林高手', desc: '武林中的江湖恩怨与武功传承', genres: ['Action', 'Historical'] },
  { title: '都市传说', desc: '现代都市中隐藏的超自然现象和神秘事件', genres: ['Mystery', 'Supernatural'] },
  { title: '机甲战士', desc: '驾驶巨型机甲对抗外星入侵者', genres: ['Sci-Fi', 'Action'] },
  { title: '甜蜜恋曲', desc: '糕点师与音乐家之间的甜蜜爱情故事', genres: ['Romance', 'Comedy'] }
];

const badges = ['HOT', 'NEW', 'POPULAR', 'COMPLETED', 'EXCLUSIVE'];
const statuses = ['Ongoing', 'Completed', 'Hiatus'];

function generateComicSeries(index) {
  const comic = comicTitles[index % comicTitles.length];
  const id = `comic-${String(index + 1).padStart(3, '0')}`;

  return {
    id,
    title: comic.title,
    type: 'comic',
    adult: Math.random() > 0.8, // 20%的作品是成人向
    genres: comic.genres,
    coverTone: ['#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8'][index % 5],
    coverUrl: `https://placehold.co/400x600/10b981/white?text=${encodeURIComponent(comic.title)}`,
    badge: badges[index % badges.length],
    badges: [badges[index % badges.length]],
    status: statuses[index % statuses.length],
    rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
    ratingCount: Math.floor(100 + Math.random() * 9900),
    description: comic.desc,
    episodePrice: [0, 3, 5, 8][index % 4], // 不同的定价策略
    ttfEnabled: Math.random() > 0.3, // 70%启用TTF
    ttfIntervalHours: 24
  };
}

function generateComicEpisode(seriesId, episodeNumber, episodePrice) {
  const pageCount = 20 + Math.floor(Math.random() * 30); // 20-50页
  const pages = Array.from({ length: pageCount }, (_, i) => ({
    url: `https://placehold.co/800x1200/10b981/white?text=Ep${episodeNumber}-P${i + 1}`,
    w: 800,
    h: 1200
  }));

  return {
    id: `${seriesId}e${episodeNumber}`,
    number: episodeNumber,
    title: `Episode ${episodeNumber}`,
    releasedAt: new Date(Date.now() - (100 - episodeNumber) * 24 * 60 * 60 * 1000).toISOString(),
    pricePts: episodeNumber <= 3 ? 0 : episodePrice, // 前3话免费
    ttfEligible: true,
    previewFreePages: 3,
    pages
  };
}

module.exports = {
  generateComicSeries,
  generateComicEpisode,
  comicCount: comicTitles.length
};
