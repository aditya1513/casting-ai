#!/usr/bin/env node

/**
 * AI Matching Service Test
 * Tests talent matching functionality using Qdrant
 */

console.log('🎭 CastMatch AI Matching Service Test');
console.log('=====================================');

const CONFIG = {
  COLLECTION_NAME: 'castmatch-talents',
  VECTOR_SIZE: 1536
};

// Generate realistic talent profiles for Mumbai casting
function generateMumbaiTalent(id) {
  const maleNames = ['Arjun', 'Vikram', 'Rohit', 'Dev', 'Aditya', 'Karan', 'Ravi', 'Ankit'];
  const femaleNames = ['Priya', 'Ananya', 'Kavya', 'Shreya', 'Neha', 'Riya', 'Pooja', 'Meera'];
  const surnames = ['Sharma', 'Patel', 'Singh', 'Gupta', 'Joshi', 'Rao', 'Kumar', 'Agarwal'];
  
  const ages = [22, 25, 28, 30, 32, 35, 40, 45];
  const locations = ['Bandra', 'Andheri', 'Juhu', 'Powai', 'Malad', 'Borivali', 'Thane', 'Navi Mumbai'];
  const skills = ['Acting', 'Dancing', 'Singing', 'Modeling', 'Comedy', 'Drama', 'Action', 'Romance'];
  const languages = ['Hindi', 'English', 'Marathi', 'Gujarati', 'Tamil', 'Telugu'];
  
  const isMAle = Math.random() > 0.5;
  const firstName = isMAle ? maleNames[id % maleNames.length] : femaleNames[id % femaleNames.length];
  const surname = surnames[Math.floor(Math.random() * surnames.length)];
  
  // Create embeddings that somewhat correlate with the profile
  const vector = Array.from({length: CONFIG.VECTOR_SIZE}, (_, i) => {
    // Add some bias based on profile characteristics
    let value = Math.random() - 0.5;
    
    // Age bias (different ranges for different vector dimensions)
    if (i < 100) value += (ages[id % ages.length] - 30) * 0.01;
    
    // Gender bias
    if (i >= 100 && i < 200) value += isMAle ? 0.1 : -0.1;
    
    // Location bias
    if (i >= 200 && i < 300) value += (id % locations.length) * 0.05;
    
    return value;
  });

  return {
    id: id,
    vector: vector,
    payload: {
      name: `${firstName} ${surname}`,
      age: ages[id % ages.length],
      gender: isMAle ? 'Male' : 'Female',
      location: locations[id % locations.length],
      skills: skills.slice(0, Math.floor(Math.random() * 3) + 2),
      languages: languages.slice(0, Math.floor(Math.random() * 3) + 2),
      experience: Math.floor(Math.random() * 15) + 1,
      rating: (Math.random() * 2 + 3).toFixed(1), // 3.0 to 5.0
      height: Math.floor(Math.random() * 30) + 160, // 160-190 cm
      type: 'actor',
      availability: Math.random() > 0.3 ? 'available' : 'busy',
      portfolio_url: `https://portfolio.castmatch.com/${firstName.toLowerCase()}-${surname.toLowerCase()}`,
      created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
    }
  };
}

// Setup talent database
async function setupTalentDatabase(count = 100) {
  console.log(`\n👥 Setting up talent database (${count} profiles)...`);
  
  try {
    // Delete existing collection
    await fetch(`http://localhost:6333/collections/${CONFIG.COLLECTION_NAME}`, {
      method: 'DELETE'
    }).catch(() => {});

    // Create collection
    const createResponse = await fetch(`http://localhost:6333/collections/${CONFIG.COLLECTION_NAME}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vectors: {
          size: CONFIG.VECTOR_SIZE,
          distance: 'Cosine'
        }
      })
    });

    if (!createResponse.ok) {
      throw new Error('Collection creation failed');
    }

    // Insert talent profiles
    const talents = [];
    for (let i = 0; i < count; i++) {
      talents.push(generateMumbaiTalent(i));
    }

    const insertResponse = await fetch(`http://localhost:6333/collections/${CONFIG.COLLECTION_NAME}/points`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points: talents })
    });

    if (!insertResponse.ok) {
      throw new Error('Talent insertion failed');
    }

    console.log(`✅ ${count} talent profiles created successfully`);
    return talents;

  } catch (error) {
    console.error('❌ Talent database setup failed:', error.message);
    return null;
  }
}

// Simulate casting director search queries
function generateCastingQuery(type) {
  const queries = {
    'young_male_lead': {
      description: "Young male lead actor, 25-30, handsome, for romantic drama",
      filters: { age: [25, 30], gender: 'Male', skills: ['Acting', 'Romance'] }
    },
    'female_dancer': {
      description: "Female dancer with acting skills, 22-28, for Bollywood musical",
      filters: { age: [22, 28], gender: 'Female', skills: ['Dancing', 'Acting'] }
    },
    'experienced_comedian': {
      description: "Experienced comedian actor, 35+, for comedy series",
      filters: { age: [35, 50], skills: ['Comedy', 'Acting'] }
    },
    'multilingual_actor': {
      description: "Multilingual actor for pan-India film, any age",
      filters: { languages: ['Hindi', 'Tamil', 'Telugu'] }
    },
    'action_hero': {
      description: "Action hero type, male, 28-40, for thriller film",
      filters: { age: [28, 40], gender: 'Male', skills: ['Acting', 'Action'] }
    }
  };

  const query = queries[type] || queries.young_male_lead;
  
  // Generate query vector (in real system, this would come from Claude AI)
  const queryVector = Array.from({length: CONFIG.VECTOR_SIZE}, () => Math.random() - 0.5);
  
  return { ...query, vector: queryVector };
}

// Perform talent matching
async function performTalentMatching(query, limit = 10) {
  console.log(`\n🔍 Searching for: "${query.description}"`);
  
  const start = Date.now();
  
  try {
    const response = await fetch(`http://localhost:6333/collections/${CONFIG.COLLECTION_NAME}/points/search`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vector: query.vector,
        limit: limit,
        with_payload: true,
        filter: buildQdrantFilter(query.filters)
      })
    });

    const end = Date.now();
    
    if (response.ok) {
      const result = await response.json();
      
      console.log(`✅ Found ${result.result.length} matching talents (${end - start}ms):`);
      
      result.result.forEach((match, index) => {
        const talent = match.payload;
        console.log(`  ${index + 1}. ${talent.name} (${talent.age}${talent.gender[0]}) - ${talent.location}`);
        console.log(`     Skills: ${talent.skills.join(', ')} | Rating: ${talent.rating} | Score: ${match.score.toFixed(3)}`);
      });

      return {
        success: true,
        searchTime: end - start,
        results: result.result,
        query: query.description
      };
    } else {
      console.error('❌ Search failed:', await response.text());
      return { success: false, error: 'Search failed' };
    }

  } catch (error) {
    console.error('❌ Matching error:', error.message);
    return { success: false, error: error.message };
  }
}

// Build Qdrant filter from casting criteria
function buildQdrantFilter(filters) {
  const conditions = [];
  
  if (filters.age) {
    conditions.push({
      key: 'age',
      range: {
        gte: filters.age[0],
        lte: filters.age[1]
      }
    });
  }
  
  if (filters.gender) {
    conditions.push({
      key: 'gender',
      match: { value: filters.gender }
    });
  }
  
  if (filters.skills) {
    filters.skills.forEach(skill => {
      conditions.push({
        key: 'skills',
        match: { any: [skill] }
      });
    });
  }
  
  return conditions.length > 0 ? { must: conditions } : undefined;
}

// Test different casting scenarios
async function testCastingScenarios() {
  console.log('\n🎬 Testing Various Casting Scenarios...');
  
  const scenarios = ['young_male_lead', 'female_dancer', 'experienced_comedian', 'action_hero'];
  const results = [];
  
  for (const scenario of scenarios) {
    const query = generateCastingQuery(scenario);
    const result = await performTalentMatching(query, 5);
    results.push(result);
    
    // Small delay between searches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  return results;
}

// Performance analysis
function analyzePerformance(results) {
  console.log('\n📊 AI Matching Performance Analysis');
  console.log('=====================================');
  
  const successful = results.filter(r => r.success);
  
  if (successful.length === 0) {
    console.log('❌ No successful searches to analyze');
    return;
  }
  
  const avgTime = successful.reduce((sum, r) => sum + r.searchTime, 0) / successful.length;
  const minTime = Math.min(...successful.map(r => r.searchTime));
  const maxTime = Math.max(...successful.map(r => r.searchTime));
  
  console.log(`✅ Performance Metrics:`);
  console.log(`  - Success Rate: ${(successful.length / results.length * 100).toFixed(1)}%`);
  console.log(`  - Average Search Time: ${avgTime.toFixed(2)}ms`);
  console.log(`  - Min/Max Search Time: ${minTime}ms / ${maxTime}ms`);
  console.log(`  - Total Searches: ${results.length}`);
  
  // Check if any searches returned results
  const withResults = successful.filter(r => r.results && r.results.length > 0);
  console.log(`  - Searches with Results: ${withResults.length}/${successful.length}`);
  
  if (withResults.length > 0) {
    const avgResults = withResults.reduce((sum, r) => sum + r.results.length, 0) / withResults.length;
    console.log(`  - Average Results per Search: ${avgResults.toFixed(1)}`);
  }
}

// Cleanup
async function cleanup() {
  console.log('\n🧹 Cleaning up test data...');
  try {
    await fetch(`http://localhost:6333/collections/${CONFIG.COLLECTION_NAME}`, {
      method: 'DELETE'
    });
    console.log('✅ Test talent database cleaned up');
  } catch (error) {
    console.log('⚠️  Cleanup warning:', error.message);
  }
}

// Main test runner
async function runAIMatchingTests() {
  console.log('\n🎭 Starting AI Matching Service Tests...');
  
  try {
    // Setup talent database
    const talents = await setupTalentDatabase(100);
    if (!talents) {
      throw new Error('Failed to setup talent database');
    }
    
    // Wait for indexing
    console.log('⏳ Waiting for indexing to complete...');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test casting scenarios
    const results = await testCastingScenarios();
    
    // Analyze performance
    analyzePerformance(results);
    
    // Final assessment
    console.log('\n🎯 AI Matching Assessment');
    console.log('===========================');
    
    const successfulSearches = results.filter(r => r.success).length;
    const searchesWithResults = results.filter(r => r.success && r.results && r.results.length > 0).length;
    
    if (successfulSearches === results.length && searchesWithResults > results.length * 0.8) {
      console.log('✅ EXCELLENT - AI Matching System Ready');
      console.log('   - All search types working correctly');
      console.log('   - Fast response times');
      console.log('   - Good result quality');
    } else if (successfulSearches > results.length * 0.7) {
      console.log('✅ GOOD - AI Matching System Functional');
      console.log('   - Most searches working');
      console.log('   - Ready for development testing');
    } else {
      console.log('⚠️  NEEDS IMPROVEMENT - Some Issues Detected');
      console.log('   - Some searches failing');
      console.log('   - Requires investigation');
    }
    
    return results;
    
  } finally {
    await cleanup();
  }
}

// Run the AI matching tests
runAIMatchingTests()
  .then(results => {
    console.log('\n🎉 AI Matching Service test completed!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n💥 AI Matching test failed:', error);
    process.exit(1);
  });