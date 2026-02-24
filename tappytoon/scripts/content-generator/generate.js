#!/usr/bin/env node
// 老王的内容生成器主脚本 - 一键填充你的SB网站

const { generateComicSeries, generateComicEpisode, comicCount } = require('./comic-data');
const { generateNovelSeries, generateNovelEpisode, novelCount } = require('./novel-data');

// 配置项 - 你可以根据需要修改这些参数
const CONFIG = {
  apiBaseUrl: process.env.API_URL || 'http://localhost:4000/api',
  adminKey: process.env.ADMIN_KEY || 'MySecureAdm1nK3y!2024',
  comicCount: 20,  // 生成20个漫画系列
  novelCount: 20,  // 生成20个小说系列
  episodesPerSeries: {
    min: 10,  // 每个系列最少10章
    max: 30   // 每个系列最多30章
  },
  batchSize: 5,  // 每批处理5个系列，避免API压力过大
  delayBetweenBatches: 1000  // 批次之间延迟1秒
};

// 老王的HTTP请求工具 - 简单粗暴
async function apiRequest(endpoint, method = 'GET', body = null) {
  const url = `${CONFIG.apiBaseUrl}${endpoint}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'x-admin-key': CONFIG.adminKey
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (!response.ok) {
      console.error(`❌ API请求失败 [${method} ${endpoint}]:`, data);
      return null;
    }

    return data;
  } catch (error) {
    console.error(`❌ 网络错误 [${method} ${endpoint}]:`, error.message);
    return null;
  }
}

// 创建系列
async function createSeries(seriesData) {
  console.log(`  📚 创建系列: ${seriesData.title} (${seriesData.id})`);
  const result = await apiRequest('/admin/series', 'POST', { series: seriesData });
  return result !== null;
}

// 批量创建章节
async function createEpisodes(seriesId, episodes) {
  console.log(`  📖 创建 ${episodes.length} 个章节...`);

  for (const episode of episodes) {
    const result = await apiRequest(`/admin/series/${seriesId}/episodes`, 'POST', { episode });
    if (!result) {
      console.error(`    ❌ 章节 ${episode.number} 创建失败`);
    }
  }

  console.log(`  ✅ 章节创建完成`);
}

// 生成漫画内容
async function generateComics() {
  console.log(`\n🎨 开始生成 ${CONFIG.comicCount} 个漫画系列...\n`);

  for (let i = 0; i < CONFIG.comicCount; i++) {
    const series = generateComicSeries(i);
    const episodeCount = Math.floor(
      Math.random() * (CONFIG.episodesPerSeries.max - CONFIG.episodesPerSeries.min + 1)
    ) + CONFIG.episodesPerSeries.min;

    console.log(`\n[${i + 1}/${CONFIG.comicCount}] ${series.title}`);

    // 创建系列
    const created = await createSeries(series);
    if (!created) {
      console.error(`  ❌ 系列创建失败，跳过章节创建`);
      continue;
    }

    // 生成章节
    const episodes = [];
    for (let j = 1; j <= episodeCount; j++) {
      episodes.push(generateComicEpisode(series.id, j, series.episodePrice));
    }

    // 创建章节
    await createEpisodes(series.id, episodes);

    // 批次延迟
    if ((i + 1) % CONFIG.batchSize === 0 && i + 1 < CONFIG.comicCount) {
      console.log(`\n⏳ 休息一下，避免API压力过大...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
    }
  }

  console.log(`\n✅ 漫画生成完成！`);
}

// 生成小说内容
async function generateNovels() {
  console.log(`\n📚 开始生成 ${CONFIG.novelCount} 个小说系列...\n`);

  for (let i = 0; i < CONFIG.novelCount; i++) {
    const series = generateNovelSeries(i);
    const episodeCount = Math.floor(
      Math.random() * (CONFIG.episodesPerSeries.max - CONFIG.episodesPerSeries.min + 1)
    ) + CONFIG.episodesPerSeries.min;

    console.log(`\n[${i + 1}/${CONFIG.novelCount}] ${series.title}`);

    // 创建系列
    const created = await createSeries(series);
    if (!created) {
      console.error(`  ❌ 系列创建失败，跳过章节创建`);
      continue;
    }

    // 生成章节
    const episodes = [];
    for (let j = 1; j <= episodeCount; j++) {
      episodes.push(generateNovelEpisode(series.id, j, series.episodePrice));
    }

    // 创建章节
    await createEpisodes(series.id, episodes);

    // 批次延迟
    if ((i + 1) % CONFIG.batchSize === 0 && i + 1 < CONFIG.novelCount) {
      console.log(`\n⏳ 休息一下，避免API压力过大...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.delayBetweenBatches));
    }
  }

  console.log(`\n✅ 小说生成完成！`);
}

// 主函数
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   老王的内容生成器 v1.0                                  ║
║   一键填充你的gush网站                              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
  `);

  console.log(`📋 配置信息:`);
  console.log(`   API地址: ${CONFIG.apiBaseUrl}`);
  console.log(`   漫画数量: ${CONFIG.comicCount}`);
  console.log(`   小说数量: ${CONFIG.novelCount}`);
  console.log(`   每个系列章节数: ${CONFIG.episodesPerSeries.min}-${CONFIG.episodesPerSeries.max}`);

  const startTime = Date.now();

  try {
    // 生成漫画
    await generateComics();

    // 生成小说
    await generateNovels();

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   🎉 内容生成完成！                                      ║
║                                                           ║
║   📊 统计信息:                                           ║
║      - 漫画系列: ${CONFIG.comicCount} 个                           ║
║      - 小说系列: ${CONFIG.novelCount} 个                           ║
║      - 总耗时: ${duration} 秒                              ║
║                                                           ║
║   现在你的网站应该有内容了，去看看吧！                   ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);
  } catch (error) {
    console.error(`\n❌ 艹！出错了:`, error);
    process.exit(1);
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

module.exports = { main };
