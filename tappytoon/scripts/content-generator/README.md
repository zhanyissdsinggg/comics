# 老王的内容生成器

艹！你的网站没内容？老王我给你整了个一键生成工具！

## 功能特性

- 🎨 **自动生成漫画**: 20个不同类型的漫画系列，每个10-30章
- 📚 **自动生成小说**: 20个不同类型的小说系列，每个10-30章
- 🏷️ **完整数据**: 包含封面、描述、标签、评分等所有字段
- ⚡ **批量处理**: 智能批次处理，避免API压力过大
- 🎯 **真实模拟**: 生成的数据看起来像真实内容

## 生成的内容

### 漫画类型
- 恋爱剧情、动作奇幻、校园喜剧
- 悬疑惊悚、科幻冒险、恐怖超自然
- 体育竞技、历史宫廷等20种

### 小说类型
- 修仙传说、都市异能、重生商战
- 星际争霸、武侠江湖、甜宠言情
- 电竞游戏、特工谍战等20种

## 使用方法

### 1. 确保后端服务运行

```bash
cd backend
npm run start:dev
```

后端应该运行在 `http://localhost:3001`

### 2. 配置管理员密钥

编辑 `generate.js` 文件，修改配置：

```javascript
const CONFIG = {
  apiBaseUrl: 'http://localhost:3001/api',  // 你的API地址
  adminKey: 'your-admin-key-here',          // 你的管理员密钥
  comicCount: 20,   // 生成多少个漫画
  novelCount: 20,   // 生成多少个小说
  // ...
};
```

或者使用环境变量：

```bash
export API_URL=http://localhost:3001/api
export ADMIN_KEY=your-admin-key-here
```

### 3. 运行生成脚本

```bash
cd scripts/content-generator
node generate.js
```

### 4. 等待完成

脚本会显示进度，大概需要5-10分钟完成（取决于你的配置）。

```
╔═══════════════════════════════════════════════════════════╗
║   老王的内容生成器 v1.0                                  ║
║   一键填充你的gush网站                              ║
╚═══════════════════════════════════════════════════════════╝

📋 配置信息:
   API地址: http://localhost:3001/api
   漫画数量: 20
   小说数量: 20
   每个系列章节数: 10-30

🎨 开始生成 20 个漫画系列...

[1/20] 恋爱的艺术
  📚 创建系列: 恋爱的艺术 (comic-001)
  📖 创建 25 个章节...
  ✅ 章节创建完成
...
```

## 配置选项

在 `generate.js` 中可以修改这些配置：

```javascript
const CONFIG = {
  apiBaseUrl: 'http://localhost:3001/api',  // API地址
  adminKey: 'your-admin-key-here',          // 管理员密钥
  comicCount: 20,                           // 漫画数量
  novelCount: 20,                           // 小说数量
  episodesPerSeries: {
    min: 10,  // 每个系列最少章节数
    max: 30   // 每个系列最多章节数
  },
  batchSize: 5,                             // 批次大小
  delayBetweenBatches: 1000                 // 批次延迟(毫秒)
};
```

## 生成的数据示例

### 漫画系列
```json
{
  "id": "comic-001",
  "title": "恋爱的艺术",
  "type": "comic",
  "genres": ["Romance", "Drama"],
  "coverUrl": "https://placehold.co/400x600/...",
  "description": "一个关于艺术学院学生之间浪漫爱情故事的漫画",
  "episodePrice": 5,
  "rating": 4.5,
  "status": "Ongoing"
}
```

### 漫画章节
```json
{
  "id": "comic-001e1",
  "number": 1,
  "title": "Episode 1",
  "pricePts": 0,  // 前3话免费
  "pages": [
    { "url": "https://placehold.co/800x1200/...", "w": 800, "h": 1200 },
    // ... 20-50页
  ]
}
```

### 小说系列
```json
{
  "id": "novel-001",
  "title": "修仙传说",
  "type": "novel",
  "genres": ["Fantasy", "Adventure"],
  "description": "少年从凡人一步步修炼成仙的传奇故事",
  "episodePrice": 4,
  "rating": 4.2
}
```

### 小说章节
```json
{
  "id": "novel-001e1",
  "number": 1,
  "title": "第1章",
  "pricePts": 0,  // 前5章免费
  "paragraphs": [
    "这是第1章的内容。故事继续发展，主角面临新的挑战。",
    // ... 30-50段
  ]
}
```

## 注意事项

⚠️ **重要提示**：

1. **管理员密钥**: 必须配置正确的管理员密钥，否则API会返回403错误
2. **后端运行**: 确保后端服务正在运行
3. **数据库清空**: 如果想重新生成，先清空数据库
4. **API限制**: 如果API有速率限制，调整 `batchSize` 和 `delayBetweenBatches`
5. **测试数据**: 这些都是测试数据，图片使用的是占位符

## 清空数据

如果想重新生成，可以通过管理后台删除所有系列，或者直接清空数据库：

```bash
cd backend
npx prisma db push --force-reset
```

## 故障排查

### 问题1: API返回403错误
**原因**: 管理员密钥不正确
**解决**: 检查 `adminKey` 配置是否正确

### 问题2: 连接失败
**原因**: 后端服务未运行
**解决**: 启动后端服务 `npm run start:dev`

### 问题3: 生成速度太慢
**原因**: 批次大小太小或延迟太长
**解决**: 增加 `batchSize` 或减少 `delayBetweenBatches`

### 问题4: 系列ID重复
**原因**: 数据库中已存在相同ID的系列
**解决**: 清空数据库或修改生成逻辑

## 下一步

生成完内容后，你可以：

1. 访问前端页面查看效果
2. 测试搜索、筛选、排序功能
3. 测试阅读器功能
4. 测试付费解锁功能
5. 根据需要调整数据

## 扩展功能

如果你需要更多功能，可以修改脚本：

- 添加更多漫画/小说类型
- 自定义章节内容
- 导入真实内容
- 从其他平台爬取数据（注意版权！）

---

**老王提醒**: 这些都是测试数据，别tm拿去做正式网站！要用真实内容，自己去找合法的内容源！
