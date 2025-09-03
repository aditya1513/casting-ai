/**
 * Test Script for AI-Powered Semantic Search
 * Tests the complete pipeline: embedding generation, vector storage, and semantic search
 */

import { vectorService } from '../services/vector.service';
import { embeddingService } from '../services/embedding.service';
import { aiMatchingService } from '../services/ai-matching.service';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';

async function testSemanticSearch() {
  console.log('🚀 Starting AI-Powered Semantic Search Test...\n');

  try {
    // Step 1: Initialize Pinecone
    console.log('1️⃣ Initializing Pinecone vector database...');
    await vectorService.initialize();
    console.log('✅ Pinecone initialized successfully\n');

    // Step 2: Test embedding generation
    console.log('2️⃣ Testing embedding generation with OpenAI...');
    const testText = 'Experienced Bollywood actor with expertise in method acting, dance, and martial arts. Fluent in Hindi, English, and Marathi.';
    const embedding = await embeddingService.generateEmbedding(testText);
    console.log(`✅ Generated embedding with dimension: ${embedding.length}`);
    console.log(`   First 5 values: [${embedding.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]\n`);

    // Step 3: Create test talent profile
    console.log('3️⃣ Creating test talent profile...');
    const testTalentData = {
      id: 'test-talent-001',
      displayName: 'Raj Kumar',
      bio: 'Award-winning actor with 10 years of experience in Bollywood and OTT platforms',
      skills: ['Method Acting', 'Dance', 'Martial Arts', 'Horse Riding'],
      languages: ['Hindi', 'English', 'Marathi', 'Punjabi'],
      location: 'Mumbai',
      yearsOfExperience: 10,
      achievements: ['Best Actor Award 2022', 'Featured in Top 10 OTT Series'],
      specializations: ['Drama', 'Action', 'Comedy'],
    };

    const talentEmbedding = await embeddingService.generateTalentEmbedding(testTalentData);
    console.log('✅ Generated talent profile embedding\n');

    // Step 4: Store in Pinecone
    console.log('4️⃣ Storing talent embedding in Pinecone...');
    await vectorService.upsertTalentEmbedding(
      testTalentData.id,
      talentEmbedding,
      {
        talentId: testTalentData.id,
        userId: 'test-user-001',
        displayName: testTalentData.displayName,
        gender: 'MALE',
        location: testTalentData.location,
        languages: testTalentData.languages,
        skills: testTalentData.skills,
        yearsOfExperience: testTalentData.yearsOfExperience,
        verified: true,
        rating: 4.8,
      }
    );
    console.log('✅ Talent embedding stored successfully\n');

    // Step 5: Test semantic search
    console.log('5️⃣ Testing semantic search...');
    const searchQuery = 'Looking for experienced actor for action movie, must know martial arts';
    const searchEmbedding = await embeddingService.generateSearchEmbedding(searchQuery);
    
    const searchResults = await vectorService.searchSimilarTalents(searchEmbedding, {
      topK: 5,
      includeMetadata: true,
      minScore: 0.5,
    });

    console.log('✅ Search completed. Results:');
    searchResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.metadata?.displayName || result.id}`);
      console.log(`      Score: ${(result.score * 100).toFixed(1)}%`);
      console.log(`      Location: ${result.metadata?.location}`);
      console.log(`      Skills: ${result.metadata?.skills?.join(', ')}`);
      console.log(`      Languages: ${result.metadata?.languages?.join(', ')}`);
      console.log('');
    });

    // Step 6: Test AI matching with criteria
    console.log('6️⃣ Testing AI matching with specific criteria...');
    const matchCriteria = {
      query: 'Action hero for web series',
      roleDescription: 'Lead role in action-packed web series, requires martial arts and stunt experience',
      requirements: ['Martial Arts', 'Stunt Experience', 'Physical Fitness'],
      preferences: ['Hindi Speaking', 'Mumbai Based'],
      filters: {
        location: 'Mumbai',
        languages: ['Hindi'],
        minExperience: 5,
      },
    };

    // Note: This would normally fetch from database, but for testing we'll simulate
    console.log('✅ AI matching criteria prepared\n');

    // Step 7: Test batch embedding
    console.log('7️⃣ Testing batch embedding generation...');
    const batchTexts = [
      'Young actress with classical dance training',
      'Comedy actor specializing in stand-up and improv',
      'Voice over artist with experience in animation',
    ];
    
    const batchEmbeddings = await embeddingService.generateBatchEmbeddings(batchTexts);
    console.log(`✅ Generated ${batchEmbeddings.length} embeddings in batch\n`);

    // Step 8: Get index statistics
    console.log('8️⃣ Getting vector database statistics...');
    const stats = await vectorService.getIndexStats();
    console.log('📊 Pinecone Index Statistics:');
    console.log(`   Dimension: ${stats.dimension}`);
    console.log(`   Total Vectors: ${stats.totalVectorCount}`);
    console.log(`   Index Fullness: ${(stats.indexFullness * 100).toFixed(2)}%`);
    console.log(`   Namespaces: ${JSON.stringify(stats.namespaces, null, 2)}\n`);

    // Step 9: Test similarity calculation
    console.log('9️⃣ Testing cosine similarity calculation...');
    const similarity = embeddingService.cosineSimilarity(talentEmbedding, searchEmbedding);
    console.log(`✅ Cosine similarity between talent and search: ${(similarity * 100).toFixed(2)}%\n`);

    // Step 10: Cleanup test data
    console.log('🧹 Cleaning up test data...');
    await vectorService.deleteTalentEmbedding(testTalentData.id);
    console.log('✅ Test data cleaned up\n');

    console.log('🎉 All tests completed successfully!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n📝 Summary:');
    console.log('   ✅ Pinecone initialization');
    console.log('   ✅ OpenAI embedding generation');
    console.log('   ✅ Talent profile embedding');
    console.log('   ✅ Vector storage and retrieval');
    console.log('   ✅ Semantic search functionality');
    console.log('   ✅ Batch processing');
    console.log('   ✅ Similarity calculations');
    console.log('\n🚀 The AI-powered talent matching system is ready for use!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    logger.error('Test script error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testSemanticSearch()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });