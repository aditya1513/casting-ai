/**
 * Simple script to create sample user and talent data in PostgreSQL
 * Uses proper Drizzle schema structure with users and talent_profiles tables
 */

const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5433,
  user: 'postgres',
  password: 'castmatch123',
  database: 'castmatch_db',
});

const sampleUsers = [
  {
    email: 'priya.sharma@email.com',
    firstName: 'Priya',
    lastName: 'Sharma',
    role: 'actor',
    phoneNumber: '+91-9876543210',
    bio: 'Passionate actress with theater background and film experience in Bollywood.',
    emailVerified: true,
    isActive: true,
    gender: 'Female',
    location: 'Mumbai, Maharashtra',
  },
  {
    email: 'arjun.mehta@email.com',
    firstName: 'Arjun',
    lastName: 'Mehta',
    role: 'actor',
    phoneNumber: '+91-9876543211',
    bio: 'Professional actor with extensive Bollywood and television experience.',
    emailVerified: true,
    isActive: true,
    gender: 'Male',
    location: 'Mumbai, Maharashtra',
  },
  {
    email: 'kavya.patel@email.com',
    firstName: 'Kavya',
    lastName: 'Patel',
    role: 'actor',
    phoneNumber: '+91-9876543212',
    bio: 'Fresh talent with strong theater foundation and classical dance training.',
    emailVerified: false,
    isActive: true,
    gender: 'Female',
    location: 'Pune, Maharashtra',
  },
  {
    email: 'rohan.singh@email.com',
    firstName: 'Rohan',
    lastName: 'Singh',
    role: 'actor',
    phoneNumber: '+91-9876543213',
    bio: 'Versatile actor with strong presence in web series and digital content.',
    emailVerified: true,
    isActive: true,
    gender: 'Male',
    location: 'Delhi, Delhi',
  },
  {
    email: 'ananya.gupta@email.com',
    firstName: 'Ananya',
    lastName: 'Gupta',
    role: 'actor',
    phoneNumber: '+91-9876543214',
    bio: 'Multi-lingual actress specializing in South Indian and Bollywood films.',
    emailVerified: true,
    isActive: true,
    gender: 'Female',
    location: 'Bangalore, Karnataka',
  },
  {
    email: 'rajesh.director@email.com',
    firstName: 'Rajesh',
    lastName: 'Kumar',
    role: 'casting_director',
    phoneNumber: '+91-9876543215',
    bio: 'Experienced casting director with 10+ years in Mumbai film industry.',
    emailVerified: true,
    isActive: true,
    gender: 'Male',
    location: 'Mumbai, Maharashtra',
  }
];

async function insertSampleData() {
  try {
    // Clear existing data
    await pool.query('DELETE FROM talent_profiles');
    await pool.query('DELETE FROM users');
    
    console.log('✅ Cleared existing data');

    // Insert sample users and get their IDs
    const userIds = [];
    for (const user of sampleUsers) {
      const result = await pool.query(`
        INSERT INTO users (
          email, "firstName", "lastName", role, "phoneNumber", bio, 
          "emailVerified", "isActive", gender, location
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id
      `, [
        user.email,
        user.firstName,
        user.lastName,
        user.role,
        user.phoneNumber,
        user.bio,
        user.emailVerified,
        user.isActive,
        user.gender,
        user.location
      ]);
      
      userIds.push({
        id: result.rows[0].id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role
      });
    }
    
    console.log(`✅ Inserted ${userIds.length} users`);

    // Create talent profiles for actors only
    const actorProfiles = [
      {
        stage_name: 'Priya Sharma',
        city: 'Mumbai',
        state: 'Maharashtra',
        languages: JSON.stringify(['Hindi', 'English', 'Marathi']),
        experience: JSON.stringify([
          { type: 'Theatre', years: 3 },
          { type: 'Film Acting', years: 2 },
          { type: 'Method Acting', years: 1 }
        ]),
        skills: JSON.stringify(['Dancing', 'Singing']),
        willing_to_travel: true,
        min_budget: 50000,
        max_budget: 200000,
        rating: 4.2
      },
      {
        stage_name: 'Arjun Mehta',
        city: 'Mumbai',
        state: 'Maharashtra',
        languages: JSON.stringify(['Hindi', 'English', 'Gujarati']),
        experience: JSON.stringify([
          { type: 'Film Acting', years: 5 },
          { type: 'TV Acting', years: 3 },
          { type: 'Commercial', years: 4 }
        ]),
        skills: JSON.stringify(['Action Sequences', 'Horse Riding']),
        willing_to_travel: true,
        min_budget: 100000,
        max_budget: 500000,
        rating: 4.5
      },
      {
        stage_name: 'Kavya Patel',
        city: 'Pune',
        state: 'Maharashtra',
        languages: JSON.stringify(['Hindi', 'English', 'Marathi', 'Gujarati']),
        experience: JSON.stringify([
          { type: 'Theatre', years: 2 },
          { type: 'Short Films', years: 1 }
        ]),
        skills: JSON.stringify(['Classical Dance', 'Voice Acting']),
        willing_to_travel: false,
        min_budget: 25000,
        max_budget: 100000,
        rating: 3.8
      },
      {
        stage_name: 'Rohan Singh',
        city: 'Delhi',
        state: 'Delhi',
        languages: JSON.stringify(['Hindi', 'English', 'Punjabi']),
        experience: JSON.stringify([
          { type: 'Film Acting', years: 4 },
          { type: 'TV Acting', years: 3 },
          { type: 'Web Series', years: 2 }
        ]),
        skills: JSON.stringify(['Martial Arts', 'Stand-up Comedy']),
        willing_to_travel: true,
        min_budget: 75000,
        max_budget: 300000,
        rating: 4.1
      },
      {
        stage_name: 'Ananya Gupta',
        city: 'Bangalore',
        state: 'Karnataka',
        languages: JSON.stringify(['Hindi', 'English', 'Kannada', 'Tamil']),
        experience: JSON.stringify([
          { type: 'Film Acting', years: 3 },
          { type: 'Dubbing', years: 2 },
          { type: 'Voice Acting', years: 2 }
        ]),
        skills: JSON.stringify(['Mimicry', 'Multiple Languages']),
        willing_to_travel: true,
        min_budget: 60000,
        max_budget: 250000,
        rating: 4.3
      }
    ];

    // Insert talent profiles for actors only
    let profileIndex = 0;
    for (const user of userIds) {
      if (user.role === 'actor' && profileIndex < actorProfiles.length) {
        const profile = actorProfiles[profileIndex];
        await pool.query(`
          INSERT INTO talent_profiles (
            user_id, stage_name, city, state, languages, experience, skills,
            willing_to_travel, min_budget, max_budget, rating
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        `, [
          user.id,
          profile.stage_name,
          profile.city,
          profile.state,
          profile.languages,
          profile.experience,
          profile.skills,
          profile.willing_to_travel,
          profile.min_budget,
          profile.max_budget,
          profile.rating
        ]);
        profileIndex++;
      }
    }
    
    console.log(`✅ Inserted ${profileIndex} talent profiles`);
    
  } catch (error) {
    console.error('❌ Error inserting sample data:', error);
    throw error;
  }
}

async function verifyData() {
  try {
    const userResult = await pool.query('SELECT COUNT(*) as count FROM users');
    const userCount = parseInt(userResult.rows[0].count);
    
    const talentResult = await pool.query('SELECT COUNT(*) as count FROM talent_profiles');
    const talentCount = parseInt(talentResult.rows[0].count);
    
    console.log(`✅ Database contains ${userCount} users and ${talentCount} talent profiles`);
    
    // Show sample data
    const sampleResult = await pool.query(`
      SELECT u."firstName", u."lastName", u.role, tp.city, tp.rating 
      FROM users u 
      LEFT JOIN talent_profiles tp ON u.id = tp.user_id 
      ORDER BY u.role, u."firstName"
      LIMIT 6
    `);
    
    console.log('\n📋 Sample data:');
    sampleResult.rows.forEach(row => {
      const name = `${row.firstName} ${row.lastName}`;
      const location = row.city || 'N/A';
      const rating = row.rating || 'N/A';
      console.log(`- ${name} (${row.role}) - ${location} - Rating: ${rating}`);
    });
    
    return userCount > 0;
  } catch (error) {
    console.error('❌ Error verifying data:', error);
    return false;
  }
}

async function main() {
  try {
    console.log('🚀 Setting up CastMatch sample data...\n');
    
    await insertSampleData();
    const success = await verifyData();
    
    if (success) {
      console.log('\n✅ Sample data setup complete!');
      console.log('🌐 The talent search API should now return real data');
    } else {
      console.log('\n❌ Setup failed - no data found');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}