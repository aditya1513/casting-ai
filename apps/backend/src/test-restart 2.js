
console.log('Testing restart...');
const http = require('http');
const server = http.createServer((req, res) => {
  res.end('Test server restarted');
});
server.listen(5002, () => console.log('Server running on 5002'));

