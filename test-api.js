const http = require('http');

// Test endpoints
const endpoints = [
  { path: '/api/health', method: 'GET', name: 'Health Check' },
  { path: '/api/talents-direct/list', method: 'GET', name: 'Direct Talents List' },
  { path: '/api/talents/search?city=Mumbai', method: 'GET', name: 'Talents Search' },
];

console.log('Testing CastMatch API endpoints...\n');

endpoints.forEach((endpoint, index) => {
  setTimeout(() => {
    const options = {
      hostname: 'localhost',
      port: 5002,
      path: endpoint.path,
      method: endpoint.method,
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        console.log(`${endpoint.name}:`);
        console.log(`Status: ${res.statusCode}`);
        try {
          const parsed = JSON.parse(data);
          console.log('Response:', JSON.stringify(parsed, null, 2));
        } catch (e) {
          console.log('Response:', data);
        }
        console.log('---\n');
      });
    });

    req.on('error', (error) => {
      console.error(`${endpoint.name}: ERROR - ${error.message}\n`);
    });

    req.end();
  }, index * 500); // Stagger requests
});