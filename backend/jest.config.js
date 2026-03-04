// 老王说：在模块加载前设置环境变量，别tm用setupFilesAfterEnv这个SB东西
process.env.ADMIN_KEY = process.env.ADMIN_KEY || 'TestAdminKey123!@#';
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret-key-for-testing';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/test';
process.env.REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: 'src',
  testRegex: '.*\\.spec\\.ts$',
  transform: {
    '^.+\\.(t|j)s$': 'ts-jest',
  },
  collectCoverageFrom: ['**/*.(t|j)s'],
  coverageDirectory: '../coverage',
  testEnvironment: 'node',
};
