#!/usr/bin/env node

const axios = require('axios');
const fs = require('fs');
const path = require('path');

const API_BASE = process.env.API_URL || 'http://localhost:3001';

async function testSetup() {
  console.log('🧪 Testing POSQ setup...\n');

  const tests = [
    {
      name: 'Health Check',
      test: async () => {
        const response = await axios.get(`${API_BASE}/health`);
        return response.data.status === 'OK';
      }
    },
    {
      name: 'Database Connection',
      test: async () => {
        // Check if database file exists (for LOCAL mode)
        const dbPath = './server/data/posq.db';
        return fs.existsSync(dbPath);
      }
    },
    {
      name: 'Menu API',
      test: async () => {
        const response = await axios.get(`${API_BASE}/api/menu`);
        return response.data.success && response.data.data.length > 0;
      }
    },
    {
      name: 'Tables API',
      test: async () => {
        const response = await axios.get(`${API_BASE}/api/tables`);
        return response.data.success && response.data.data.length > 0;
      }
    },
    {
      name: 'Authentication',
      test: async () => {
        const response = await axios.post(`${API_BASE}/api/auth/login`, {
          username: 'admin',
          password: 'admin123'
        });
        return response.data.success && response.data.data.accessToken;
      }
    }
  ];

  let passed = 0;
  let failed = 0;

  for (const test of tests) {
    try {
      const result = await test.test();
      if (result) {
        console.log(`✅ ${test.name}: PASSED`);
        passed++;
      } else {
        console.log(`❌ ${test.name}: FAILED`);
        failed++;
      }
    } catch (error) {
      console.log(`❌ ${test.name}: FAILED (${error.message})`);
      failed++;
    }
  }

  console.log(`\n📊 Test Results: ${passed} passed, ${failed} failed`);
  
  if (failed === 0) {
    console.log('🎉 All tests passed! POSQ is ready to use.');
    console.log('\n📱 Try these URLs:');
    console.log(`   Customer Menu: ${API_BASE}/menu?table=T01&branch=casa01`);
    console.log(`   Admin Dashboard: ${API_BASE}/admin`);
  } else {
    console.log('⚠️  Some tests failed. Please check the setup.');
    process.exit(1);
  }
}

if (require.main === module) {
  testSetup().catch(console.error);
}

module.exports = { testSetup };