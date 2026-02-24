// 老王的小说数据生成器 - 这个SB脚本生成测试用的小说数据

const novelTitles = [
  { title: '修仙传说', desc: '少年从凡人一步步修炼成仙的传奇故事', genres: ['Fantasy', 'Adventure'] },
  { title: '都市狂龙', desc: '退伍兵王回归都市，纵横商界与地下世界', genres: ['Action', 'Urban'] },
  { title: '重生之商业帝国', desc: '金融天才重生回到过去，打造商业帝国', genres: ['Drama', 'Business'] },
  { title: '星际争霸', desc: '人类在星际时代的征服与探索', genres: ['Sci-Fi', 'Adventure'] },
  { title: '武道巅峰', desc: '武者在武道世界追求极致力量的故事', genres: ['Action', 'Fantasy'] },
  { title: '霸道总裁的小娇妻', desc: '灰姑娘与霸道总裁的甜蜜爱情故事', genres: ['Romance', 'Drama'] },
  { title: '末世求生录', desc: '末日降临，主角带领团队在废土中求生', genres: ['Sci-Fi', 'Horror'] },
  { title: '神医传奇', desc: '现代神医穿越古代，悬壶济世的故事', genres: ['Historical', 'Fantasy'] },
  { title: '电竞之王', desc: '天才少年在电竞世界的崛起之路', genres: ['Sports', 'Drama'] },
  { title: '玄幻大陆', desc: '异世界大陆上的冒险与战斗', genres: ['Fantasy', 'Adventure'] },
  { title: '都市仙尊', desc: '仙界大能重生都市，纵横无敌', genres: ['Fantasy', 'Urban'] },
  { title: '豪门恩怨', desc: '豪门家族的爱恨情仇与权力斗争', genres: ['Drama', 'Romance'] },
  { title: '网游之天下', desc: '虚拟网游世界的冒险与征服', genres: ['Game', 'Adventure'] },
  { title: '特工狂花', desc: '女特工执行危险任务的惊险故事', genres: ['Action', 'Thriller'] },
  { title: '仙侠奇缘', desc: '仙侠世界的修炼与情缘', genres: ['Fantasy', 'Romance'] },
  { title: '科技霸主', desc: '科技天才改变世界的创业故事', genres: ['Sci-Fi', 'Business'] },
  { title: '古武传承', desc: '现代社会中古武术的传承与发扬', genres: ['Action', 'Urban'] },
  { title: '宫斗日常', desc: '古代后宫的权谋与生存', genres: ['Historical', 'Drama'] },
  { title: '异能觉醒', desc: '普通人觉醒超能力后的冒险', genres: ['Fantasy', 'Action'] },
  { title: '甜宠文', desc: '男女主角的甜蜜日常与宠溺故事', genres: ['Romance', 'Comedy'] }
];

const badges = ['HOT', 'NEW', 'POPULAR', 'COMPLETED', 'EXCLUSIVE'];
const statuses = ['Ongoing', 'Completed', 'Hiatus'];

function generateNovelSeries(index) {
  const novel = novelTitles[index % novelTitles.length];
  const id = `novel-${String(index + 1).padStart(3, '0')}`;

  return {
    id,
    title: novel.title,
    type: 'novel',
    adult: Math.random() > 0.85, // 15%的作品是成人向
    genres: novel.genres,
    coverTone: ['#9B59B6', '#E74C3C', '#3498DB', '#F39C12', '#1ABC9C'][index % 5],
    coverUrl: `https://placehold.co/400x600/10b981/white?text=${encodeURIComponent(novel.title)}`,
    badge: badges[index % badges.length],
    badges: [badges[index % badges.length]],
    status: statuses[index % statuses.length],
    rating: parseFloat((3.8 + Math.random() * 1.2).toFixed(1)),
    ratingCount: Math.floor(200 + Math.random() * 9800),
    description: novel.desc,
    episodePrice: [0, 2, 4, 6][index % 4], // 不同的定价策略
    ttfEnabled: Math.random() > 0.4, // 60%启用TTF
    ttfIntervalHours: 24
  };
}

// 老王的假文本生成器 - 生成看起来像小说的段落
function generateNovelParagraphs(chapterNumber) {
  const paragraphCount = 30 + Math.floor(Math.random() * 20); // 30-50段
  const paragraphs = [];

  const templates = [
    '这是第{chapter}章的内容。故事继续发展，主角面临新的挑战。',
    '在这个关键时刻，主角做出了重要的决定。',
    '周围的环境变得越来越紧张，危机一触即发。',
    '突然，一个意想不到的转折出现了。',
    '主角回忆起过去的经历，这给了他新的启发。',
    '敌人的阴谋逐渐浮出水面。',
    '朋友们纷纷伸出援手，共同面对困难。',
    '经过激烈的战斗，主角终于取得了胜利。',
    '但是，新的问题又接踵而至。',
    '主角意识到，真正的考验才刚刚开始。',
    '在这个充满未知的世界里，每一步都充满危险。',
    '主角的实力在不断提升，但敌人也变得更加强大。',
    '一个神秘的人物出现了，带来了重要的信息。',
    '主角必须在有限的时间内做出选择。',
    '命运的齿轮开始转动，一切都在按照预定的轨迹前进。'
  ];

  for (let i = 0; i < paragraphCount; i++) {
    const template = templates[i % templates.length];
    paragraphs.push(template.replace('{chapter}', chapterNumber));
  }

  return paragraphs;
}

function generateNovelEpisode(seriesId, episodeNumber, episodePrice) {
  const paragraphs = generateNovelParagraphs(episodeNumber);

  return {
    id: `${seriesId}e${episodeNumber}`,
    number: episodeNumber,
    title: `第${episodeNumber}章`,
    releasedAt: new Date(Date.now() - (100 - episodeNumber) * 24 * 60 * 60 * 1000).toISOString(),
    pricePts: episodeNumber <= 5 ? 0 : episodePrice, // 前5章免费
    ttfEligible: true,
    previewFreePages: 0,
    paragraphs
  };
}

module.exports = {
  generateNovelSeries,
  generateNovelEpisode,
  novelCount: novelTitles.length
};
