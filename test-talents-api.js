// Quick test for the talents API endpoint
const testTalentsAPI = async () => {
  console.log('🧪 Testing /api/talents endpoint...\n');
  
  try {
    // Test 1: Basic GET request
    console.log('Test 1: GET /api/talents');
    const response = await fetch('http://localhost:3000/api/talents?page=1&limit=5', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const data = await response.json();
    console.log('✅ Response status:', response.status);
    console.log('✅ Response data:', JSON.stringify(data, null, 2));
    
    if (data.success) {
      console.log('\n✅ API ENDPOINT IS WORKING!');
      console.log(`Found ${data.pagination?.total || 0} talents`);
    } else {
      console.log('⚠️ API returned success: false');
    }
    
    // Test 2: With search parameters
    console.log('\nTest 2: GET /api/talents with search');
    const searchResponse = await fetch('http://localhost:3000/api/talents?search=actor&location=mumbai', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    const searchData = await searchResponse.json();
    console.log('✅ Search response status:', searchResponse.status);
    console.log('✅ Results with search:', searchData.data?.length || 0, 'talents found');
    
  } catch (error) {
    console.error('❌ Error testing API:', error.message);
    console.log('\n⚠️ Make sure the Next.js server is running on port 3000');
  }
};

// Run the test
testTalentsAPI();