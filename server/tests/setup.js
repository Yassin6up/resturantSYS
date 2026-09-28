process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'isolated-test-secret-not-for-production';
process.env.JWT_REFRESH_SECRET = 'isolated-test-refresh-not-for-production';
delete process.env.DEFAULT_BRANCH_ID;
