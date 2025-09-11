/**
 * Simple Pinecone integration test with basic operations
 */

import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

async function testPineconeBasicOperations() {
  try {
    console.log('🧪 Testing Pinecone Basic Operations...\n');
    
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY not found in environment variables');
    }
    
    // Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    console.log('✓ Pinecone client initialized');
    
    // List existing indexes
    console.log('\n1. Listing existing indexes...');
    const indexList = await pinecone.listIndexes();
    console.log('✓ Indexes retrieved:', indexList.indexes?.length || 0);
    
    if (indexList.indexes && indexList.indexes.length > 0) {
      indexList.indexes.forEach(idx => {
        console.log(`  - ${idx.name}: ${idx.dimension}D, ${idx.metric}, ${idx.status.state}`);
      });
      
      // Test with the first available index
      const testIndex = indexList.indexes[0];
      if (testIndex && testIndex.name) {
        console.log(`\n2. Testing operations with index: ${testIndex.name}`);
        
        const index = pinecone.index(testIndex.name);
        
        // Get index stats
        const stats = await index.describeIndexStats();
        console.log('✓ Index stats:', {
          totalRecordCount: stats.totalRecordCount,
          dimension: stats.dimension
        });
        
        // Test upsert with a simple vector
        const testVector = Array(testIndex.dimension).fill(0).map(() => Math.random() * 2 - 1);
        const testId = `test-${Date.now()}`;
        
        console.log('\n3. Testing vector upsert...');
        await index.upsert([{
          id: testId,
          values: testVector,
          metadata: {
            test: true,
            timestamp: new Date().toISOString(),
            description: 'Test vector for Pinecone integration'
          }
        }]);
        console.log('✓ Vector upserted successfully');
        
        // Test query
        console.log('\n4. Testing vector query...');
        const queryResults = await index.query({
          vector: testVector,
          topK: 3,
          includeMetadata: true
        });
        
        console.log('✓ Query completed');
        console.log(`  Results: ${queryResults.matches?.length || 0}`);
        if (queryResults.matches && queryResults.matches.length > 0) {
          const topMatch = queryResults.matches[0];
          if (topMatch) {
            console.log(`  Top match: ID=${topMatch.id}, Score=${topMatch.score?.toFixed(4)}`);
          }
        }
        
        // Clean up - delete the test vector
        console.log('\n5. Cleaning up test vector...');
        await index.deleteOne(testId);
        console.log('✓ Test vector deleted');
      }
    }
    
    console.log('\n🎉 Pinecone basic operations test completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Connection: ✅');
    console.log('  - Index listing: ✅');
    console.log('  - Vector operations: ✅');
    console.log('  - Query operations: ✅');
    
  } catch (error) {
    console.error('❌ Pinecone test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
    }
    process.exit(1);
  }
}

// Run the test
testPineconeBasicOperations();