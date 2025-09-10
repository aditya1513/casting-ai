#!/usr/bin/env node

/**
 * Direct Qdrant Migration Test Script
 * Tests Qdrant functionality and migration readiness without starting full backend
 */

console.log('🚀 CastMatch Qdrant Migration Test');
console.log('=====================================');

// Test 1: Qdrant Health Check
async function testQdrantHealth() {
  console.log('\n1. Testing Qdrant Health...');
  try {
    const response = await fetch('http://localhost:6333/');
    const data = await response.json();
    console.log('✅ Qdrant Status:', data);
    return true;
  } catch (error) {
    console.error('❌ Qdrant Health Check Failed:', error.message);
    return false;
  }
}

// Test 2: Create Test Collection
async function createTestCollection() {
  console.log('\n2. Creating Test Collection...');
  try {
    const response = await fetch('http://localhost:6333/collections/test-migration', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vectors: {
          size: 1536,
          distance: 'Cosine'
        }
      })
    });
    
    if (response.ok) {
      console.log('✅ Test collection created successfully');
      return true;
    } else {
      const error = await response.text();
      console.log('⚠️ Collection might already exist or creation failed:', error);
      return false;
    }
  } catch (error) {
    console.error('❌ Collection Creation Failed:', error.message);
    return false;
  }
}

// Test 3: Insert Test Vectors
async function insertTestVectors() {
  console.log('\n3. Inserting Test Vectors...');
  try {
    const testPoints = [
      {
        id: 1,
        vector: Array.from({length: 1536}, () => Math.random()),
        payload: { name: 'Test Actor 1', age: 25, location: 'Mumbai' }
      },
      {
        id: 2, 
        vector: Array.from({length: 1536}, () => Math.random()),
        payload: { name: 'Test Actor 2', age: 30, location: 'Mumbai' }
      }
    ];

    const response = await fetch('http://localhost:6333/collections/test-migration/points', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        points: testPoints
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Test vectors inserted:', result);
      return true;
    } else {
      const error = await response.text();
      console.error('❌ Vector insertion failed:', error);
      return false;
    }
  } catch (error) {
    console.error('❌ Vector Insertion Failed:', error.message);
    return false;
  }
}

// Test 4: Search Test
async function testVectorSearch() {
  console.log('\n4. Testing Vector Search...');
  try {
    const searchVector = Array.from({length: 1536}, () => Math.random());
    
    const response = await fetch('http://localhost:6333/collections/test-migration/points/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector: searchVector,
        limit: 2,
        with_payload: true
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Vector search successful:');
      result.result.forEach(hit => {
        console.log(`  - ${hit.payload.name} (score: ${hit.score})`);
      });
      return true;
    } else {
      const error = await response.text();
      console.error('❌ Vector search failed:', error);
      return false;
    }
  } catch (error) {
    console.error('❌ Vector Search Failed:', error.message);
    return false;
  }
}

// Test 5: Performance Benchmark
async function benchmarkSearch(iterations = 10) {
  console.log(`\n5. Performance Benchmark (${iterations} searches)...`);
  
  const times = [];
  for (let i = 0; i < iterations; i++) {
    const start = Date.now();
    const searchVector = Array.from({length: 1536}, () => Math.random());
    
    try {
      const response = await fetch('http://localhost:6333/collections/test-migration/points/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vector: searchVector,
          limit: 5
        })
      });
      
      if (response.ok) {
        const end = Date.now();
        times.push(end - start);
      }
    } catch (error) {
      console.error(`Search ${i + 1} failed:`, error.message);
    }
  }

  if (times.length > 0) {
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log('✅ Performance Results:');
    console.log(`  - Average: ${avgTime.toFixed(2)}ms`);
    console.log(`  - Min: ${minTime}ms`);
    console.log(`  - Max: ${maxTime}ms`);
    console.log(`  - Success Rate: ${(times.length / iterations * 100).toFixed(1)}%`);
    
    return { avgTime, minTime, maxTime, successRate: times.length / iterations };
  } else {
    console.error('❌ All benchmark searches failed');
    return null;
  }
}

// Test 6: Cleanup
async function cleanup() {
  console.log('\n6. Cleaning up test collection...');
  try {
    const response = await fetch('http://localhost:6333/collections/test-migration', {
      method: 'DELETE'
    });
    
    if (response.ok) {
      console.log('✅ Test collection cleaned up');
    } else {
      console.log('⚠️ Cleanup warning (collection might not exist)');
    }
  } catch (error) {
    console.log('⚠️ Cleanup error (non-critical):', error.message);
  }
}

// Main Test Runner
async function runMigrationTests() {
  console.log('\n🧪 Starting Qdrant Migration Tests...\n');
  
  const results = {
    healthCheck: false,
    collectionCreation: false,
    vectorInsertion: false,
    searchTest: false,
    performance: null
  };

  // Run all tests
  results.healthCheck = await testQdrantHealth();
  if (results.healthCheck) {
    results.collectionCreation = await createTestCollection();
    if (results.collectionCreation || true) { // Continue even if collection exists
      results.vectorInsertion = await insertTestVectors();
      if (results.vectorInsertion) {
        results.searchTest = await testVectorSearch();
        if (results.searchTest) {
          results.performance = await benchmarkSearch(10);
        }
      }
    }
  }

  // Cleanup
  await cleanup();

  // Summary
  console.log('\n📊 Migration Test Summary');
  console.log('==========================');
  console.log(`✅ Qdrant Health: ${results.healthCheck ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Collection Management: ${results.collectionCreation ? 'PASS' : 'PARTIAL'}`);
  console.log(`✅ Vector Operations: ${results.vectorInsertion ? 'PASS' : 'FAIL'}`);
  console.log(`✅ Search Functionality: ${results.searchTest ? 'PASS' : 'FAIL'}`);
  
  if (results.performance) {
    console.log(`✅ Performance: ${results.performance.avgTime.toFixed(2)}ms avg (${(results.performance.successRate * 100).toFixed(1)}% success)`);
  } else {
    console.log(`❌ Performance: FAIL`);
  }

  // Migration Readiness Assessment
  const migrationReady = results.healthCheck && results.vectorInsertion && results.searchTest;
  console.log('\n🎯 Migration Readiness Assessment');
  console.log('===================================');
  if (migrationReady) {
    console.log('✅ READY FOR MIGRATION');
    console.log('   - Qdrant service is operational');
    console.log('   - Vector operations working correctly');
    console.log('   - Search functionality verified');
    
    if (results.performance && results.performance.avgTime < 100) {
      console.log('   - Performance metrics are good (<100ms avg)');
    } else if (results.performance) {
      console.log(`   - Performance: ${results.performance.avgTime.toFixed(2)}ms (acceptable for development)`);
    }
  } else {
    console.log('❌ NOT READY FOR MIGRATION');
    console.log('   - Issues found that need to be resolved first');
  }

  return results;
}

// Run the tests
runMigrationTests()
  .then(results => {
    console.log('\n🏁 Migration test completed!');
    process.exit(results.healthCheck && results.searchTest ? 0 : 1);
  })
  .catch(error => {
    console.error('\n💥 Migration test failed:', error);
    process.exit(1);
  });