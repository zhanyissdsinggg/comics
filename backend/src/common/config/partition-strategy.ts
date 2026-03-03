/**
 * 老王说：数据库分区策略配置
 * 针对大表进行分区，提高查询性能
 */

/**
 * 分区策略说明：
 *
 * 1. ReadingHistory表 - 按userId分区
 *    - 原因：用户查询自己的阅读历史是高频操作
 *    - 分区键：userId
 *    - 分区数：根据用户数量动态调整
 *
 * 2. Comment表 - 按seriesId分区
 *    - 原因：评论查询通常按系列进行
 *    - 分区键：seriesId
 *    - 分区数：根据系列数量动态调整
 *
 * 3. Order表 - 按createdAt分区（时间分区）
 *    - 原因：订单查询通常按时间范围进行
 *    - 分区键：createdAt
 *    - 分区策略：按月分区
 *
 * 4. PaymentIntent表 - 按userId分区
 *    - 原因：支付查询通常按用户进行
 *    - 分区键：userId
 *    - 分区数：根据用户数量动态调整
 */

export const PartitionStrategy = {
  // ReadingHistory表分区配置
  readingHistory: {
    enabled: true,
    type: 'hash', // hash分区
    key: 'userId',
    partitions: 16, // 初始16个分区，可根据用户数量调整
    description: '按userId进行hash分区，提高用户阅读历史查询性能',
  },

  // Comment表分区配置
  comment: {
    enabled: true,
    type: 'hash', // hash分区
    key: 'seriesId',
    partitions: 32, // 初始32个分区，可根据系列数量调整
    description: '按seriesId进行hash分区，提高评论查询性能',
  },

  // Order表分区配置
  order: {
    enabled: true,
    type: 'range', // 范围分区
    key: 'createdAt',
    partitionInterval: 'MONTH', // 按月分区
    description: '按createdAt进行范围分区，提高订单时间范围查询性能',
  },

  // PaymentIntent表分区配置
  paymentIntent: {
    enabled: true,
    type: 'hash', // hash分区
    key: 'userId',
    partitions: 16, // 初始16个分区
    description: '按userId进行hash分区，提高支付查询性能',
  },

  // Entitlement表分区配置
  entitlement: {
    enabled: true,
    type: 'hash', // hash分区
    key: 'userId',
    partitions: 16, // 初始16个分区
    description: '按userId进行hash分区，提高权限查询性能',
  },
};

/**
 * 分区实施步骤（PostgreSQL示例）：
 *
 * 1. ReadingHistory表分区：
 *    CREATE TABLE reading_history_partitioned (
 *      id CUID PRIMARY KEY,
 *      userId STRING NOT NULL,
 *      seriesId STRING NOT NULL,
 *      episodeId STRING NOT NULL,
 *      readAt TIMESTAMP DEFAULT now(),
 *      createdAt TIMESTAMP DEFAULT now()
 *    ) PARTITION BY HASH (userId);
 *
 *    -- 创建16个分区
 *    CREATE TABLE reading_history_p0 PARTITION OF reading_history_partitioned FOR VALUES WITH (MODULUS 16, REMAINDER 0);
 *    CREATE TABLE reading_history_p1 PARTITION OF reading_history_partitioned FOR VALUES WITH (MODULUS 16, REMAINDER 1);
 *    ... (继续创建p2-p15)
 *
 * 2. Comment表分区：
 *    CREATE TABLE comment_partitioned (
 *      id CUID PRIMARY KEY,
 *      userId STRING NOT NULL,
 *      seriesId STRING NOT NULL,
 *      content STRING NOT NULL,
 *      isDeleted BOOLEAN DEFAULT false,
 *      createdAt TIMESTAMP DEFAULT now()
 *    ) PARTITION BY HASH (seriesId);
 *
 *    -- 创建32个分区
 *    CREATE TABLE comment_p0 PARTITION OF comment_partitioned FOR VALUES WITH (MODULUS 32, REMAINDER 0);
 *    ... (继续创建p1-p31)
 *
 * 3. Order表分区（按月）：
 *    CREATE TABLE order_partitioned (
 *      id CUID PRIMARY KEY,
 *      userId STRING NOT NULL,
 *      packageId STRING NOT NULL,
 *      amount INT NOT NULL,
 *      status STRING NOT NULL,
 *      createdAt TIMESTAMP DEFAULT now()
 *    ) PARTITION BY RANGE (createdAt);
 *
 *    -- 创建2024年的分区
 *    CREATE TABLE order_2024_01 PARTITION OF order_partitioned
 *      FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
 *    CREATE TABLE order_2024_02 PARTITION OF order_partitioned
 *      FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
 *    ... (继续创建其他月份)
 */

export const PartitionMigrationSQL = {
  readingHistory: `
    -- 创建分区表
    CREATE TABLE reading_history_new (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      seriesId TEXT NOT NULL,
      episodeId TEXT NOT NULL,
      readAt TIMESTAMP,
      createdAt TIMESTAMP DEFAULT now()
    ) PARTITION BY HASH (userId);

    -- 创建16个分区
    CREATE TABLE reading_history_p0 PARTITION OF reading_history_new FOR VALUES WITH (MODULUS 16, REMAINDER 0);
    CREATE TABLE reading_history_p1 PARTITION OF reading_history_new FOR VALUES WITH (MODULUS 16, REMAINDER 1);
    -- ... 继续创建p2-p15

    -- 迁移数据
    INSERT INTO reading_history_new SELECT * FROM reading_history;

    -- 删除旧表，重命名新表
    DROP TABLE reading_history;
    ALTER TABLE reading_history_new RENAME TO reading_history;
  `,

  comment: `
    -- 创建分区表
    CREATE TABLE comment_new (
      id TEXT PRIMARY KEY,
      userId TEXT NOT NULL,
      seriesId TEXT NOT NULL,
      content TEXT NOT NULL,
      hidden BOOLEAN DEFAULT false,
      isDeleted BOOLEAN DEFAULT false,
      createdAt TIMESTAMP DEFAULT now(),
      updatedAt TIMESTAMP
    ) PARTITION BY HASH (seriesId);

    -- 创建32个分区
    CREATE TABLE comment_p0 PARTITION OF comment_new FOR VALUES WITH (MODULUS 32, REMAINDER 0);
    -- ... 继续创建p1-p31

    -- 迁移数据
    INSERT INTO comment_new SELECT * FROM comment;

    -- 删除旧表，重命名新表
    DROP TABLE comment;
    ALTER TABLE comment_new RENAME TO comment;
  `,
};
