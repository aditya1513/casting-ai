/**
 * Artillery Performance Test Processor
 * Custom functions and data generators for load testing
 */

const faker = require('@faker-js/faker').faker;
const crypto = require('crypto');

// Store generated data for consistency
const generatedUsers = new Map();
const existingEmails = [
  'testuser@castmatch.com',
  'director@castmatch.com',
  'producer@castmatch.com',
  'actor1@castmatch.com',
  'actor2@castmatch.com',
];

const talentIds = [
  'talent_001',
  'talent_002',
  'talent_003',
  'talent_004',
  'talent_005',
];

// Casting queries for realistic AI chat testing
const castingQueries = [
  'Find me a young romantic lead for a Bollywood movie',
  'I need experienced action heroes age 30-40',
  'Looking for child actors age 8-12 for commercial',
  'Need supporting actors for period drama',
  'Find dancers who can also act',
  'Looking for comedic actors for web series',
  'Need villain character for action film',
  'Find fresh faces for debut movie',
  'Looking for theater actors for indie film',
  'Need actors who can speak multiple languages',
];

// Search queries for talent search
const searchQueries = [
  'action hero',
  'romantic lead',
  'comedy actor',
  'classical dancer',
  'method actor',
  'villain roles',
  'child artist',
  'senior actor',
  'fresh talent',
  'theater background',
];

// Script content templates
const scriptTemplates = [
  `FADE IN:\n\nINT. COFFEE SHOP - DAY\n\nA romantic scene unfolds...`,
  `EXT. CITY STREET - NIGHT\n\nAction sequence begins...`,
  `INT. OFFICE - MORNING\n\nComedy scene with multiple characters...`,
  `EXT. VILLAGE - SUNSET\n\nDramatic confrontation...`,
];

/**
 * Generate a random email address
 */
function $randomEmail(context, events, done) {
  const email = faker.internet.email().toLowerCase();
  context.vars.email = email;
  generatedUsers.set(email, {
    password: 'TestUser123!',
    created: Date.now(),
  });
  return done();
}

/**
 * Generate a random string
 */
function $randomString(context, events, done) {
  context.vars.randomString = faker.string.alphanumeric(8);
  return done();
}

/**
 * Get a random existing email
 */
function $randomExistingEmail(context, events, done) {
  const index = Math.floor(Math.random() * existingEmails.length);
  context.vars.existingEmail = existingEmails[index];
  return done();
}

/**
 * Generate a random casting query
 */
function $randomCastingQuery(context, events, done) {
  const index = Math.floor(Math.random() * castingQueries.length);
  context.vars.castingQuery = castingQueries[index];
  return done();
}

/**
 * Generate a random search query
 */
function $randomSearchQuery(context, events, done) {
  const index = Math.floor(Math.random() * searchQueries.length);
  context.vars.searchQuery = searchQueries[index];
  return done();
}

/**
 * Get a random talent ID
 */
function $randomTalentId(context, events, done) {
  const index = Math.floor(Math.random() * talentIds.length);
  context.vars.talentId = talentIds[index];
  return done();
}

/**
 * Generate random script content
 */
function $randomScriptContent(context, events, done) {
  const index = Math.floor(Math.random() * scriptTemplates.length);
  let script = scriptTemplates[index];
  
  // Add some random content
  script += `\n\nCHARACTER ${faker.person.firstName().toUpperCase()}\n`;
  script += faker.lorem.paragraph();
  
  context.vars.scriptContent = script;
  return done();
}

/**
 * Before request hook - add correlation IDs
 */
function beforeRequest(requestParams, context, ee, next) {
  // Add correlation ID for tracking
  requestParams.headers = requestParams.headers || {};
  requestParams.headers['X-Correlation-ID'] = crypto.randomUUID();
  requestParams.headers['X-Load-Test'] = 'true';
  
  // Add timestamp for latency measurement
  context.vars.requestStartTime = Date.now();
  
  return next();
}

/**
 * After response hook - collect metrics
 */
function afterResponse(requestParams, response, context, ee, next) {
  // Calculate custom latency
  const latency = Date.now() - context.vars.requestStartTime;
  
  // Emit custom metrics
  ee.emit('customStat', 'request.latency', latency);
  
  // Track error rates by endpoint
  if (response.statusCode >= 400) {
    const endpoint = requestParams.url || requestParams.uri;
    ee.emit('customStat', `errors.${endpoint}`, 1);
  }
  
  // Track cache hits
  if (response.headers && response.headers['x-cache-hit'] === 'true') {
    ee.emit('customStat', 'cache.hits', 1);
  } else if (response.headers && response.headers['x-cache-hit'] === 'false') {
    ee.emit('customStat', 'cache.misses', 1);
  }
  
  return next();
}

/**
 * Custom validator for response time SLA
 */
function validateResponseTime(requestParams, response, context, ee, next) {
  const endpoint = requestParams.url || requestParams.uri;
  const responseTime = Date.now() - context.vars.requestStartTime;
  
  // Define SLAs for different endpoints
  const slas = {
    '/api/auth/login': 500,
    '/api/auth/register': 1000,
    '/api/chat/messages': 2000,
    '/api/talent/search': 1500,
    '/api/ai/analyze-script': 5000,
  };
  
  const sla = slas[endpoint] || 1000; // Default SLA
  
  if (responseTime > sla) {
    ee.emit('customStat', `sla.violations.${endpoint}`, 1);
    console.log(`SLA violation: ${endpoint} took ${responseTime}ms (SLA: ${sla}ms)`);
  }
  
  return next();
}

/**
 * Generate realistic user behavior patterns
 */
function generateUserBehavior(userContext, events, done) {
  // Simulate different user types
  const userTypes = ['casual', 'power', 'new'];
  const userType = userTypes[Math.floor(Math.random() * userTypes.length)];
  
  switch(userType) {
    case 'casual':
      // Casual users - slower interactions
      userContext.vars.thinkTime = Math.random() * 10 + 5; // 5-15 seconds
      userContext.vars.messageCount = Math.floor(Math.random() * 3) + 1; // 1-3 messages
      break;
    
    case 'power':
      // Power users - rapid interactions
      userContext.vars.thinkTime = Math.random() * 3 + 1; // 1-4 seconds
      userContext.vars.messageCount = Math.floor(Math.random() * 10) + 5; // 5-15 messages
      break;
    
    case 'new':
      // New users - exploratory behavior
      userContext.vars.thinkTime = Math.random() * 15 + 10; // 10-25 seconds
      userContext.vars.messageCount = Math.floor(Math.random() * 5) + 2; // 2-7 messages
      break;
  }
  
  userContext.vars.userType = userType;
  return done();
}

/**
 * Cleanup function
 */
function cleanup(context, events, done) {
  // Clean up old generated users to prevent memory leaks
  const now = Date.now();
  const oneHourAgo = now - (60 * 60 * 1000);
  
  for (const [email, data] of generatedUsers.entries()) {
    if (data.created < oneHourAgo) {
      generatedUsers.delete(email);
    }
  }
  
  return done();
}

/**
 * Custom metrics aggregator
 */
function aggregateMetrics(statsObject) {
  // Calculate cache hit rate
  if (statsObject['cache.hits'] && statsObject['cache.misses']) {
    const hits = statsObject['cache.hits'];
    const total = hits + statsObject['cache.misses'];
    statsObject['cache.hitRate'] = (hits / total * 100).toFixed(2) + '%';
  }
  
  // Calculate error rate
  const totalRequests = statsObject['http.requests'] || 0;
  const totalErrors = statsObject['http.codes.4xx'] + statsObject['http.codes.5xx'] || 0;
  if (totalRequests > 0) {
    statsObject['error.rate'] = (totalErrors / totalRequests * 100).toFixed(2) + '%';
  }
  
  return statsObject;
}

module.exports = {
  $randomEmail,
  $randomString,
  $randomExistingEmail,
  $randomCastingQuery,
  $randomSearchQuery,
  $randomTalentId,
  $randomScriptContent,
  beforeRequest,
  afterResponse,
  validateResponseTime,
  generateUserBehavior,
  cleanup,
  aggregateMetrics,
};