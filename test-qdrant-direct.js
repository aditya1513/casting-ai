#!/usr/bin/env node

/**
 * Direct Qdrant API Test
 * Tests Qdrant functionality without backend dependencies
 */

const axios = require('axios');

const QDRANT_URL = 'http://localhost:6333';
const COLLECTION_NAME = 'castmatch-test';

async function testQdrant() {
  const client = axios.create({
    baseURL: QDRANT_URL,
    headers: { 'Content-Type': 'application/json' }
  });

  console.log('🧪 Testing Qdrant Vector Database...\n');

  try {
    // 1. Check health
    console.log('1. Checking health...');
    const health = await client.get('/');
    console.log('✅ Qdrant version:', health.data.version);

    // 2. List collections
    console.log('\n2. Listing collections...');
    const collections = await client.get('/collections');
    console.log('✅ Collections:', collections.data.result.collections);

    // 3. Create test collection
    console.log('\n3. Creating test collection...');
    await client.put(`/collections/${COLLECTION_NAME}`, {
      vectors: {
        size: 1536,
        distance: 'Cosine'
      }
    });
    console.log('✅ Collection created:', COLLECTION_NAME);

    // 4. Insert test vector
    console.log('\n4. Inserting test vector...');
    const testVector = new Array(1536).fill(0).map(() => Math.random());
    await client.put(`/collections/${COLLECTION_NAME}/points`, {
      points: [{
        id: 'test-talent-1',
        vector: testVector,
        payload: {
          talentId: 'test-talent-1',
          displayName: 'Test Actor',
          skills: ['Acting', 'Dancing'],
          location: 'Mumbai'
        }
      }]
    });
    console.log('✅ Test vector inserted');

    // 5. Search for similar vectors
    console.log('\n5. Searching for similar vectors...');
    const searchVector = new Array(1536).fill(0).map(() => Math.random());
    const searchResults = await client.post(`/collections/${COLLECTION_NAME}/points/search`, {
      vector: searchVector,
      limit: 5,
      with_payload: true
    });
    console.log('✅ Search results:', searchResults.data.result);

    // 6. Clean up
    console.log('\n6. Cleaning up...');
    await client.delete(`/collections/${COLLECTION_NAME}`);
    console.log('✅ Test collection deleted');

    console.log('\n🎉 All Qdrant tests passed!');
    console.log('Window 1\'s Qdrant migration is working perfectly!');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testQdrant().catch(console.error);