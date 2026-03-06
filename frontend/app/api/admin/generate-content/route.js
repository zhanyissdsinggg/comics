import { NextResponse } from "next/server";

// 老王注释：漫画数据生成器
const comicTitles = [
  { title: "恋爱的艺术", desc: "一个关于艺术学院学生之间浪漫爱情故事的漫画", genres: ["Romance", "Drama"] },
  { title: "剑与魔法", desc: "在魔法世界中，年轻剑士踏上拯救王国的冒险之旅", genres: ["Action", "Fantasy"] },
  { title: "校园日常", desc: "高中生们的搞笑日常生活，充满欢乐和温馨", genres: ["Comedy", "Slice of Life"] },
  { title: "暗夜侦探", desc: "天才侦探在黑暗都市中追查连环谋杀案的真相", genres: ["Mystery", "Thriller"] },
  { title: "龙之传说", desc: "少年与神龙签订契约，共同对抗邪恶势力", genres: ["Fantasy", "Adventure"] },
  { title: "星际战争", desc: "未来世界，人类与外星种族的史诗级太空战争", genres: ["Sci-Fi", "Action"] },
  { title: "鬼屋惊魂", desc: "一群年轻人误入闹鬼的废弃豪宅，恐怖事件接连发生", genres: ["Horror", "Supernatural"] },
  { title: "篮球梦想", desc: "热血少年为了篮球梦想，从零开始挑战全国冠军", genres: ["Sports", "Drama"] },
  { title: "宫廷秘史", desc: "古代宫廷中的权谋斗争与禁忌之恋", genres: ["Historical", "Romance"] },
  { title: "青春物语", desc: "校园里的友情、爱情和成长的故事", genres: ["School Life", "Comedy"] },
  { title: "魔法少女", desc: "普通女孩获得魔法力量，守护城市的和平", genres: ["Fantasy", "Action"] },
  { title: "末日求生", desc: "僵尸病毒爆发后，幸存者们的生存之战", genres: ["Horror", "Action"] },
  { title: "料理之王", desc: "天才厨师在料理界的奋斗与成长", genres: ["Drama", "Slice of Life"] },
  { title: "时空旅人", desc: "意外获得时空穿越能力的少年改变历史的故事", genres: ["Sci-Fi", "Adventure"] },
  { title: "黑帮风云", desc: "黑帮世界的权力斗争与兄弟情义", genres: ["Action", "Drama"] },
  { title: "偶像之路", desc: "追逐偶像梦想的少女们的奋斗历程", genres: ["Drama", "Music"] },
  { title: "武林高手", desc: "武林中的江湖恩怨与武功传承", genres: ["Action", "Historical"] },
  { title: "都市传说", desc: "现代都市中隐藏的超自然现象和神秘事件", genres: ["Mystery", "Supernatural"] },
  { title: "机甲战士", desc: "驾驶巨型机甲对抗外星入侵者", genres: ["Sci-Fi", "Action"] },
  { title: "甜蜜恋曲", desc: "糕点师与音乐家之间的甜蜜爱情故事", genres: ["Romance", "Comedy"] },
];

const novelTitles = [
  { title: "修仙传说", desc: "少年从凡人一步步修炼成仙的传奇故事", genres: ["Fantasy", "Adventure"] },
  { title: "都市狂龙", desc: "退伍兵王回归都市，纵横商界与地下世界", genres: ["Action", "Urban"] },
  { title: "重生之商业帝国", desc: "金融天才重生回到过去，打造商业帝国", genres: ["Drama", "Business"] },
  { title: "星际争霸", desc: "人类在星际时代的征服与探索", genres: ["Sci-Fi", "Adventure"] },
  { title: "武道巅峰", desc: "武者在武道世界追求极致力量的故事", genres: ["Action", "Fantasy"] },
  { title: "霸道总裁的小娇妻", desc: "灰姑娘与霸道总裁的甜蜜爱情故事", genres: ["Romance", "Drama"] },
  { title: "末世求生录", desc: "末日降临，主角带领团队在废土中求生", genres: ["Sci-Fi", "Horror"] },
  { title: "神医传奇", desc: "现代神医穿越古代，悬壶济世的故事", genres: ["Historical", "Fantasy"] },
  { title: "电竞之王", desc: "天才少年在电竞世界的崛起之路", genres: ["Sports", "Drama"] },
  { title: "玄幻大陆", desc: "异世界大陆上的冒险与战斗", genres: ["Fantasy", "Adventure"] },
  { title: "都市仙尊", desc: "仙界大能重生都市，纵横无敌", genres: ["Fantasy", "Urban"] },
  { title: "豪门恩怨", desc: "豪门家族的爱恨情仇与权力斗争", genres: ["Drama", "Romance"] },
  { title: "网游之天下", desc: "虚拟网游世界的冒险与征服", genres: ["Game", "Adventure"] },
  { title: "特工狂花", desc: "女特工执行危险任务的惊险故事", genres: ["Action", "Thriller"] },
  { title: "仙侠奇缘", desc: "仙侠世界的修炼与情缘", genres: ["Fantasy", "Romance"] },
  { title: "科技霸主", desc: "科技天才改变世界的创业故事", genres: ["Sci-Fi", "Business"] },
  { title: "古武传承", desc: "现代社会中古武术的传承与发扬", genres: ["Action", "Urban"] },
  { title: "宫斗日常", desc: "古代后宫的权谋与生存", genres: ["Historical", "Drama"] },
  { title: "异能觉醒", desc: "普通人觉醒超能力后的冒险", genres: ["Fantasy", "Action"] },
  { title: "甜宠文", desc: "男女主角的甜蜜日常与宠溺故事", genres: ["Romance", "Comedy"] },
];

const badges = ["HOT", "NEW", "POPULAR", "COMPLETED", "EXCLUSIVE"];
const statuses = ["Ongoing", "Completed", "Hiatus"];

function generateComicSeries(index) {
  const comic = comicTitles[index % comicTitles.length];
  const id = `comic-${String(index + 1).padStart(3, "0")}`;

  return {
    id,
    title: comic.title,
    type: "comic",
    adult: Math.random() > 0.8,
    genres: comic.genres,
    coverTone: ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"][index % 5],
    coverUrl: `https://placehold.co/400x600/10b981/white?text=${encodeURIComponent(comic.title)}`,
    badge: badges[index % badges.length],
    badges: [badges[index % badges.length]],
    status: statuses[index % statuses.length],
    rating: parseFloat((3.5 + Math.random() * 1.5).toFixed(1)),
    ratingCount: Math.floor(100 + Math.random() * 9900),
    description: comic.desc,
    episodePrice: [0, 3, 5, 8][index % 4],
    ttfEnabled: Math.random() > 0.3,
    ttfIntervalHours: 24,
  };
}

function generateNovelSeries(index) {
  const novel = novelTitles[index % novelTitles.length];
  const id = `novel-${String(index + 1).padStart(3, "0")}`;

  return {
    id,
    title: novel.title,
    type: "novel",
    adult: Math.random() > 0.85,
    genres: novel.genres,
    coverTone: ["#9B59B6", "#E74C3C", "#3498DB", "#F39C12", "#1ABC9C"][index % 5],
    coverUrl: `https://placehold.co/400x600/10b981/white?text=${encodeURIComponent(novel.title)}`,
    badge: badges[index % badges.length],
    badges: [badges[index % badges.length]],
    status: statuses[index % statuses.length],
    rating: parseFloat((3.8 + Math.random() * 1.2).toFixed(1)),
    ratingCount: Math.floor(200 + Math.random() * 9800),
    description: novel.desc,
    episodePrice: [0, 2, 4, 6][index % 4],
    ttfEnabled: Math.random() > 0.4,
    ttfIntervalHours: 24,
  };
}

function generateComicEpisode(seriesId, episodeNumber, episodePrice) {
  const pageCount = 20 + Math.floor(Math.random() * 30);
  const pages = Array.from({ length: pageCount }, (_, i) => ({
    url: `https://placehold.co/800x1200/10b981/white?text=Ep${episodeNumber}-P${i + 1}`,
    w: 800,
    h: 1200,
  }));

  return {
    id: `${seriesId}e${episodeNumber}`,
    seriesId,
    number: episodeNumber,
    title: `Episode ${episodeNumber}`,
    releasedAt: new Date(Date.now() - (100 - episodeNumber) * 24 * 60 * 60 * 1000).toISOString(),
    pricePts: episodeNumber <= 3 ? 0 : episodePrice,
    ttfEligible: true,
    previewFreePages: 3,
    pages,
  };
}

function generateNovelParagraphs(chapterNumber) {
  const paragraphCount = 30 + Math.floor(Math.random() * 20);
  const paragraphs = [];

  const templates = [
    `这是第${chapterNumber}章的内容。故事继续发展，主角面临新的挑战。`,
    "在这个关键时刻，主角做出了重要的决定。",
    "周围的环境变得越来越紧张，危机一触即发。",
    "突然，一个意想不到的转折出现了。",
    "主角回忆起过去的经历，这给了他新的启发。",
  ];

  for (let i = 0; i < paragraphCount; i++) {
    paragraphs.push(templates[i % templates.length]);
  }

  return paragraphs;
}

function generateNovelEpisode(seriesId, episodeNumber, episodePrice) {
  const paragraphs = generateNovelParagraphs(episodeNumber);

  return {
    id: `${seriesId}e${episodeNumber}`,
    seriesId,
    number: episodeNumber,
    title: `第${episodeNumber}章`,
    releasedAt: new Date(Date.now() - (100 - episodeNumber) * 24 * 60 * 60 * 1000).toISOString(),
    pricePts: episodeNumber <= 5 ? 0 : episodePrice,
    ttfEligible: true,
    previewFreePages: 0,
    paragraphs,
  };
}

export async function POST(request) {
  const startTime = Date.now();
  const apiBaseUrl =
    process.env.API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000/api";
  const adminKey = process.env.ADMIN_KEY || "MySecureAdm1nK3y!2024";

  let comicsCount = 0;
  let novelsCount = 0;
  let totalEpisodes = 0;

  try {
    // 生成漫画
    for (let i = 0; i < 20; i++) {
      const series = generateComicSeries(i);
      const episodeCount = Math.floor(Math.random() * 21) + 10; // 10-30章

      // 创建系列
      const seriesRes = await fetch(`${apiBaseUrl}/admin/series`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({ series }),
      });

      if (seriesRes.ok) {
        comicsCount++;

        // 创建章节
        for (let j = 1; j <= episodeCount; j++) {
          const episode = generateComicEpisode(series.id, j, series.episodePrice);
          await fetch(`${apiBaseUrl}/admin/series/${series.id}/episodes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${adminKey}`,
            },
            body: JSON.stringify({ episode }),
          });
          totalEpisodes++;
        }
      }
    }

    // 生成小说
    for (let i = 0; i < 20; i++) {
      const series = generateNovelSeries(i);
      const episodeCount = Math.floor(Math.random() * 21) + 10; // 10-30章

      // 创建系列
      const seriesRes = await fetch(`${apiBaseUrl}/admin/series`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${adminKey}`,
        },
        body: JSON.stringify({ series }),
      });

      if (seriesRes.ok) {
        novelsCount++;

        // 创建章节
        for (let j = 1; j <= episodeCount; j++) {
          const episode = generateNovelEpisode(series.id, j, series.episodePrice);
          await fetch(`${apiBaseUrl}/admin/series/${series.id}/episodes`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${adminKey}`,
            },
            body: JSON.stringify({ episode }),
          });
          totalEpisodes++;
        }
      }
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    return NextResponse.json({
      success: true,
      comicsCount,
      novelsCount,
      totalEpisodes,
      duration,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
