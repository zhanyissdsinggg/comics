# 数据库迁移方案

## 当前问题

你的项目目前使用 `lib/serverStore.js`（1545行）作为内存数据存储，存在以下严重问题：

1. **数据不持久化** - 服务器重启数据全丢
2. **性能瓶颈** - 所有数据在内存中，查询效率低
3. **无法扩展** - 单机内存限制
4. **无事务支持** - 数据一致性无法保证

## 推荐方案：PostgreSQL + Prisma

### 为什么选择这个方案？

1. **PostgreSQL**
   - 成熟稳定的关系型数据库
   - 支持JSON字段（适合你的复杂数据结构）
   - 强大的查询性能
   - 免费开源

2. **Prisma**
   - 类型安全的ORM
   - 自动生成TypeScript类型
   - 简洁的API
   - 内置迁移工具

### 实施步骤

#### 第一阶段：环境准备（1天）

1. **安装PostgreSQL**
   ```bash
   # Windows: 下载安装包
   # https://www.postgresql.org/download/windows/

   # 或使用Docker
   docker run --name gush-postgres -e POSTGRES_PASSWORD=yourpassword -p 5432:5432 -d postgres
   ```

2. **安装Prisma**
   ```bash
   npm install prisma @prisma/client
   npx prisma init
   ```

3. **配置环境变量**
   ```env
   # .env
   DATABASE_URL="postgresql://username:password@localhost:5432/gush?schema=public"
   ```

#### 第二阶段：Schema设计（1-2天）

创建 `prisma/schema.prisma`：

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// 用户表
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  wallet        Wallet?
  orders        Order[]
  entitlements  Entitlement[]
  follows       Follow[]
  notifications Notification[]
  progress      Progress[]
  bookmarks     Bookmark[]
  history       ReadingHistory[]
  coupons       UserCoupon[]
  comments      Comment[]
  ratings       Rating[]
}

// 钱包表
model Wallet {
  id        String   @id @default(cuid())
  userId    String   @unique
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  paidPts   Int      @default(0)
  bonusPts  Int      @default(0)
  plan      String   @default("free")

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

// 系列表
model Series {
  id          String   @id @default(cuid())
  title       String
  type        String   @default("comic")
  adult       Boolean  @default(false)
  genres      String[]
  status      String   @default("Ongoing")
  rating      Float    @default(0)
  description String   @default("")
  badge       String   @default("")
  coverTone   String   @default("warm")
  coverUrl    String   @default("")

  // JSON字段存储复杂数据
  pricing     Json     @default("{}")
  ttf         Json     @default("{}")

  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  episodes     Episode[]
  entitlements Entitlement[]
  follows      Follow[]
  progress     Progress[]
  bookmarks    Bookmark[]
  history      ReadingHistory[]
  comments     Comment[]
  ratings      Rating[]

  @@index([adult])
  @@index([status])
}

// 章节表
model Episode {
  id              String   @id @default(cuid())
  seriesId        String
  series          Series   @relation(fields: [seriesId], references: [id], onDelete: Cascade)

  number          Int
  title           String
  releasedAt      DateTime
  pricePts        Int      @default(0)
  ttfEligible     Boolean  @default(false)
  ttfReadyAt      DateTime?
  previewFreePages Int     @default(0)

  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  @@unique([seriesId, number])
  @@index([seriesId])
}

// 订单表
model Order {
  id          String   @id @default(cuid())
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  orderId     String   @unique
  packageId   String
  amount      Float
  currency    String   @default("USD")
  status      String   @default("PENDING")
  provider    String   @default("stripe")

  paidPts     Int      @default(0)
  bonusPts    Int      @default(0)
  bonusGranted Int     @default(0)

  createdAt   DateTime @default(now())
  paidAt      DateTime?
  failedAt    DateTime?
  refundedAt  DateTime?

  @@index([userId])
  @@index([status])
}

// 权限表（解锁的章节）
model Entitlement {
  id                 String   @id @default(cuid())
  userId             String
  user               User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  seriesId           String
  series             Series   @relation(fields: [seriesId], references: [id], onDelete: Cascade)

  unlockedEpisodeIds String[]

  createdAt          DateTime @default(now())
  updatedAt          DateTime @updatedAt

  @@unique([userId, seriesId])
  @@index([userId])
}

// 关注表
model Follow {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  seriesId  String
  series    Series   @relation(fields: [seriesId], references: [id], onDelete: Cascade)

  createdAt DateTime @default(now())

  @@unique([userId, seriesId])
  @@index([userId])
}

// 阅读进度表
model Progress {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  seriesId      String
  series        Series   @relation(fields: [seriesId], references: [id], onDelete: Cascade)

  lastEpisodeId String
  percent       Float    @default(0)

  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@unique([userId, seriesId])
  @@index([userId])
}

// 书签表
model Bookmark {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  seriesId   String
  series     Series   @relation(fields: [seriesId], references: [id], onDelete: Cascade)

  episodeId  String
  percent    Float    @default(0)
  pageIndex  Int      @default(0)
  label      String   @default("Bookmark")

  createdAt  DateTime @default(now())

  @@index([userId, seriesId])
}

// 阅读历史表
model ReadingHistory {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  seriesId  String
  series    Series   @relation(fields: [seriesId], references: [id], onDelete: Cascade)

  episodeId String
  title     String   @default("")
  percent   Float    @default(0)

  createdAt DateTime @default(now())

  @@index([userId])
  @@index([createdAt])
}

// 优惠券表
model Coupon {
  id             String   @id @default(cuid())
  code           String   @unique
  type           String
  value          Float
  remainingUses  Int      @default(1)
  label          String

  createdAt      DateTime @default(now())
  expiresAt      DateTime?

  userCoupons    UserCoupon[]
}

// 用户优惠券关联表
model UserCoupon {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  couponId  String
  coupon    Coupon   @relation(fields: [couponId], references: [id], onDelete: Cascade)

  claimedAt DateTime @default(now())
  usedAt    DateTime?

  @@unique([userId, couponId])
  @@index([userId])
}

// 通知表
model Notification {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  type      String
  title     String
  message   String
  read      Boolean  @default(false)

  seriesId  String?
  episodeId String?
  promoId   String?

  createdAt DateTime @default(now())
  expiresAt DateTime?

  @@index([userId, read])
  @@index([createdAt])
}

// 评论表
model Comment {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  seriesId  String
  series    Series   @relation(fields: [seriesId], references: [id], onDelete: Cascade)

  text      String
  likes     String[] @default([])
  replies   Json     @default("[]")

  createdAt DateTime @default(now())

  @@index([seriesId])
  @@index([createdAt])
}

// 评分表
model Rating {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  seriesId  String
  series    Series   @relation(fields: [seriesId], references: [id], onDelete: Cascade)

  value     Int      @default(0)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, seriesId])
  @@index([seriesId])
}
```

#### 第三阶段：数据迁移（2-3天）

创建迁移脚本 `scripts/migrate-to-db.js`：

```javascript
const { PrismaClient } = require('@prisma/client');
const { SERIES_CATALOG } = require('../lib/seriesCatalog');

const prisma = new PrismaClient();

async function migrate() {
  console.log('开始迁移数据...');

  // 1. 迁移Series数据
  console.log('迁移Series数据...');
  for (const item of SERIES_CATALOG) {
    await prisma.series.create({
      data: {
        id: item.id,
        title: item.title,
        type: item.type || 'comic',
        adult: item.adult || false,
        genres: item.genres || [],
        status: item.status || 'Ongoing',
        rating: item.rating || 0,
        description: item.description || '',
        badge: item.badge || '',
        coverTone: item.coverTone || 'warm',
        coverUrl: item.coverUrl || '',
        pricing: item.pricing || {},
        ttf: item.ttf || {},
      },
    });
  }

  console.log('迁移完成！');
}

migrate()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

#### 第四阶段：API重构（3-5天）

重构API路由使用Prisma：

```javascript
// app/api/series/route.js
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request) {
  const adult = request.nextUrl.searchParams.get('adult') === '1';

  try {
    const series = await prisma.series.findMany({
      where: adult ? { adult: true } : {},
      include: {
        episodes: {
          orderBy: { number: 'asc' },
        },
      },
    });

    return NextResponse.json({ series });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch series' },
      { status: 500 }
    );
  }
}
```

#### 第五阶段：添加Redis缓存（1-2天）

```bash
npm install ioredis
```

```javascript
// lib/redis.js
import Redis from 'ioredis';

export const redis = new Redis(process.env.REDIS_URL);

// 缓存辅助函数
export async function getCached(key, fetcher, ttl = 3600) {
  const cached = await redis.get(key);
  if (cached) {
    return JSON.parse(cached);
  }

  const data = await fetcher();
  await redis.setex(key, ttl, JSON.stringify(data));
  return data;
}
```

### 预期性能提升

| 指标 | 当前（内存） | 优化后（PostgreSQL + Redis） | 提升 |
|------|-------------|------------------------------|------|
| API响应时间 | 100-500ms | 10-50ms | **80-90%** |
| 数据持久化 | ❌ 无 | ✅ 有 | **100%** |
| 并发支持 | 低 | 高 | **10x+** |
| 可扩展性 | ❌ 单机 | ✅ 分布式 | **无限** |

### 实施时间表

- **第1天**：环境准备和Prisma安装
- **第2-3天**：Schema设计和测试
- **第4-6天**：数据迁移脚本开发
- **第7-11天**：API路由重构
- **第12-13天**：添加Redis缓存
- **第14天**：测试和优化

**总计：约2周**

### 风险和注意事项

1. **数据迁移风险**
   - 建议先在开发环境测试
   - 保留原有serverStore.js作为备份
   - 逐步迁移，不要一次性全部替换

2. **性能监控**
   - 添加数据库查询日志
   - 监控慢查询
   - 定期优化索引

3. **备份策略**
   - 每天自动备份数据库
   - 保留至少7天的备份

## 替代方案

如果不想用PostgreSQL，还可以考虑：

1. **MongoDB + Mongoose**
   - 优点：灵活的文档结构
   - 缺点：缺少关系型数据库的强约束

2. **SQLite + Prisma**
   - 优点：零配置，文件数据库
   - 缺点：不适合高并发

3. **Supabase**
   - 优点：PostgreSQL + 实时订阅 + 认证
   - 缺点：需要依赖第三方服务

## 下一步行动

老王我建议你：

1. **立即开始**：先在本地安装PostgreSQL和Prisma
2. **小步快跑**：先迁移Series和Episode数据
3. **逐步替换**：一个API一个API地替换
4. **持续测试**：每次替换后都要测试

需要老王我帮你开始实施吗？💪
