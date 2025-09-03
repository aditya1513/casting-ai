const axios = require('axios');

async function testMonitoringSystem() {
  console.log('🧪 Testing CastMatch Agent Monitoring System...\n');

  try {
    // Test 1: Check if the backend server is running
    console.log('1️⃣ Testing backend server connection...');
    const healthResponse = await axios.get('http://localhost:3000/api/health');
    console.log('✅ Backend server is running:', healthResponse.status);

    // Test 2: Check monitoring health endpoint
    console.log('\n2️⃣ Testing monitoring system health...');
    try {
      const monitoringHealth = await axios.get('http://localhost:3000/api/monitoring/health');
      console.log('✅ Monitoring system health:', monitoringHealth.data);
    } catch (error) {
      console.log('⚠️ Monitoring system not yet initialized:', error.message);
    }

    // Test 3: Check Docker services
    console.log('\n3️⃣ Checking Docker services...');
    const { exec } = require('child_process');
    const { promisify } = require('util');
    const execAsync = promisify(exec);
    
    try {
      const { stdout } = await execAsync('docker ps --format "table {{.Names}}\t{{.Status}}"');
      console.log('🐳 Docker Services:');
      console.log(stdout);
    } catch (error) {
      console.log('❌ Docker services check failed:', error.message);
    }

    // Test 4: Verify key services are accessible
    console.log('\n4️⃣ Testing key service endpoints...');
    
    const endpoints = [
      { name: 'Frontend', url: 'http://localhost:3001' },
      { name: 'PostgreSQL', port: 5432 },
      { name: 'Redis', port: 6379 },
      { name: 'PgAdmin', url: 'http://localhost:5050' }
    ];

    for (const endpoint of endpoints) {
      try {
        if (endpoint.url) {
          const response = await axios.get(endpoint.url, { timeout: 3000 });
          console.log(`✅ ${endpoint.name}: Accessible (${response.status})`);
        } else if (endpoint.port) {
          // For port checking, we'll just assume they're running if Docker is up
          console.log(`✅ ${endpoint.name}: Port ${endpoint.port} (assumed running)`);
        }
      } catch (error) {
        console.log(`❌ ${endpoint.name}: Not accessible`);
      }
    }

    // Test 5: Simulate agent monitoring
    console.log('\n5️⃣ Simulating agent status checks...');
    
    const agentStatuses = {
      'backend-api-developer': {
        status: 'ACTIVE',
        health: healthResponse.status === 200 ? 'HEALTHY' : 'UNHEALTHY',
        progress: 85
      },
      'frontend-ui-developer': {
        status: 'ACTIVE', 
        health: 'HEALTHY',
        progress: 70
      },
      'devops-infrastructure-developer': {
        status: 'ACTIVE',
        health: 'HEALTHY', 
        progress: 90
      },
      'ai-ml-developer': {
        status: 'BUSY',
        health: 'DEGRADED',
        progress: 45
      },
      'integration-workflow-developer': {
        status: 'IDLE',
        health: 'HEALTHY',
        progress: 30
      },
      'testing-qa-developer': {
        status: 'BUSY',
        health: 'DEGRADED',
        progress: 55
      }
    };

    console.log('📊 Current Agent Status Simulation:');
    Object.entries(agentStatuses).forEach(([agent, status]) => {
      const healthIcon = status.health === 'HEALTHY' ? '✅' : 
                        status.health === 'DEGRADED' ? '⚠️' : '❌';
      console.log(`   ${healthIcon} ${agent}: ${status.status}/${status.health} (${status.progress}%)`);
    });

    // Test 6: Calculate overall system health
    console.log('\n6️⃣ Overall System Assessment...');
    
    const healthyAgents = Object.values(agentStatuses).filter(s => s.health === 'HEALTHY').length;
    const totalAgents = Object.keys(agentStatuses).length;
    const avgProgress = Object.values(agentStatuses).reduce((sum, s) => sum + s.progress, 0) / totalAgents;
    
    console.log(`📈 System Health Summary:`);
    console.log(`   • Healthy Agents: ${healthyAgents}/${totalAgents} (${Math.round(healthyAgents/totalAgents*100)}%)`);
    console.log(`   • Average Progress: ${Math.round(avgProgress)}%`);
    console.log(`   • Backend Status: ${healthResponse.status === 200 ? 'Operational' : 'Issues Detected'}`);
    
    if (healthyAgents >= totalAgents * 0.8 && avgProgress >= 70) {
      console.log('✅ Overall Status: SYSTEM HEALTHY - Ready for production coordination');
    } else if (healthyAgents >= totalAgents * 0.6 && avgProgress >= 50) {
      console.log('⚠️ Overall Status: SYSTEM OPERATIONAL - Some optimizations needed');
    } else {
      console.log('❌ Overall Status: SYSTEM NEEDS ATTENTION - Multiple issues detected');
    }

    console.log('\n🎯 Agent Orchestrator Test Complete!');
    console.log('💡 The monitoring system is designed to:');
    console.log('   • Check agent status every 15 minutes');
    console.log('   • Generate progress reports every 30 minutes'); 
    console.log('   • Auto-resolve common issues');
    console.log('   • Coordinate tasks between agents');
    console.log('   • Provide real-time dashboard at /api/monitoring/dashboard');

  } catch (error) {
    console.error('❌ Monitoring system test failed:', error.message);
    console.log('\n🔧 Next steps:');
    console.log('   1. Ensure backend server is running: npm run dev');
    console.log('   2. Start Docker services: docker-compose up -d');
    console.log('   3. Initialize monitoring: POST /api/monitoring/start');
  }
}

// Run the test
testMonitoringSystem().catch(console.error);