/**
 * Simple Pinecone connection test
 */

import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

async function testPineconeConnection() {
  try {
    console.log('Testing Pinecone connection...');
    
    if (!process.env.PINECONE_API_KEY) {
      throw new Error('PINECONE_API_KEY not found in environment variables');
    }
    
    console.log('✓ API Key found');
    
    // Initialize Pinecone
    const pinecone = new Pinecone({
      apiKey: process.env.PINECONE_API_KEY,
    });
    
    console.log('✓ Pinecone client initialized');
    
    // List existing indexes with retry
    console.log('Fetching existing indexes...');
    let indexList;
    let retries = 3;
    
    while (retries > 0) {
      try {
        indexList = await pinecone.listIndexes();
        console.log('✓ Successfully connected to Pinecone!');
        break;
      } catch (error) {
        retries--;
        if (retries === 0) throw error;
        console.log(`Retry ${3 - retries}/3 - waiting 2 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }
    console.log('Existing indexes:', indexList?.indexes?.map(idx => ({
      name: idx.name,
      dimension: idx.dimension,
      metric: idx.metric,
      status: idx.status
    })) || 'None');
    
    // Test a simple operation
    if (indexList && indexList.indexes && indexList.indexes.length > 0) {
      const firstIndex = indexList.indexes[0];
      if (firstIndex && firstIndex.name) {
        console.log(`\nTesting index operations on: ${firstIndex.name}`);
        
        const index = pinecone.index(firstIndex.name);
        const stats = await index.describeIndexStats();
        console.log('✓ Index stats retrieved:', {
          totalRecordCount: stats.totalRecordCount,
          dimension: stats.dimension
        });
      }
    }
    
    console.log('\n🎉 Pinecone connection test completed successfully!');
    
  } catch (error) {
    console.error('❌ Pinecone connection failed:', error);
    process.exit(1);
  }
}

// Run the test
testPineconeConnection();