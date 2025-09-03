/**
 * Test vector database integration with Anthropic embeddings
 */

import { vectorDatabaseService } from './src/services/ai-ml/vectorDatabase.service';
import { embeddingService } from './src/services/ai-ml/embedding.service';
import dotenv from 'dotenv';

dotenv.config();

async function testVectorIntegration() {
  try {
    console.log('🧪 Testing Vector Database Integration...\n');
    
    // Test 1: Health check
    console.log('1. Health check...');
    const healthCheck = await vectorDatabaseService.healthCheck();
    console.log('✓ Health status:', healthCheck.status);
    console.log('  Details:', JSON.stringify(healthCheck.details, null, 2));
    
    // Test 2: Generate an embedding using Anthropic
    console.log('\n2. Testing Anthropic embedding generation...');
    const testText = "Experienced actor from Mumbai with skills in Hindi cinema and theater performance";
    const embedding = await embeddingService.generateEmbedding(testText);
    console.log('✓ Generated embedding');
    console.log('  Text:', testText);
    console.log('  Dimensions:', embedding.length);
    console.log('  Sample values:', embedding.slice(0, 5).map(v => v.toFixed(4)));
    
    // Test 3: Test vector upsert with sample profile
    console.log('\n3. Testing vector upsert...');
    const testProfile = {
      name: "Test Actor",
      skills: ["Acting", "Hindi", "Theater", "Drama"],
      experience: "5 years in Bollywood films and theater",
      bio: "Mumbai-based actor with extensive experience in drama and comedy roles",
      location: "Mumbai, Maharashtra",
      languages: ["Hindi", "English", "Marathi"],
      categories: ["Film", "Theater", "TV"]
    };
    
    const upsertResult = await vectorDatabaseService.upsertUserProfile('test-user-001', testProfile);
    console.log('✓ Profile upserted successfully');
    console.log('  Result:', upsertResult);
    
    // Test 4: Test similarity search
    console.log('\n4. Testing similarity search...');
    const searchQuery = "Mumbai actor with theater experience";
    const searchResults = await vectorDatabaseService.searchSimilarProfiles(searchQuery, {
      topK: 3,
      includeMetadata: true
    });
    console.log('✓ Search completed');
    console.log('  Query:', searchQuery);
    console.log('  Results:', searchResults.length);
    if (searchResults.length > 0) {
      const topResult = searchResults[0];
      if (topResult) {
        console.log('  Top result:', {
          id: topResult.id,
          score: topResult.score.toFixed(4),
          name: topResult.metadata?.name
        });
      }
    }
    
    // Test 5: Get index stats
    console.log('\n5. Getting index statistics...');
    const stats = await vectorDatabaseService.getIndexStats('user-profiles');
    console.log('✓ Index stats retrieved');
    console.log('  Stats:', {
      totalRecordCount: stats.totalRecordCount,
      dimension: stats.dimension
    });
    
    console.log('\n🎉 Vector database integration test completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - Pinecone connection: ✅');
    console.log('  - Anthropic embeddings: ✅');
    console.log('  - Vector storage: ✅');
    console.log('  - Similarity search: ✅');
    
  } catch (error) {
    console.error('❌ Vector integration test failed:', error);
    if (error instanceof Error) {
      console.error('Error details:', error.message);
      console.error('Stack:', error.stack);
    }
    process.exit(1);
  }
}

// Run the test
testVectorIntegration();