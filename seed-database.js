const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'castmatch_db'
});

async function seedDatabase() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Create test users
    const userResult = await client.query(`
      INSERT INTO users (id, email, password, role, "isEmailVerified", "isActive", "createdAt", "updatedAt")
      VALUES 
        ('user-1', 'priya@test.com', '$2b$12$dummy.hash', 'TALENT', true, true, NOW(), NOW()),
        ('user-2', 'rahul@test.com', '$2b$12$dummy.hash', 'TALENT', true, true, NOW(), NOW()),
        ('user-3', 'ananya@test.com', '$2b$12$dummy.hash', 'TALENT', true, true, NOW(), NOW()),
        ('user-4', 'arjun@test.com', '$2b$12$dummy.hash', 'TALENT', true, true, NOW(), NOW()),
        ('user-5', 'director@test.com', '$2b$12$dummy.hash', 'CASTING_DIRECTOR', true, true, NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
      RETURNING id;
    `);
    console.log(`Created ${userResult.rowCount} users`);

    // Create test talents
    const talentResult = await client.query(`
      INSERT INTO talents (
        id, "userId", "firstName", "lastName", "dateOfBirth", gender, nationality,
        "primaryPhone", email, "currentCity", "currentState", "createdAt", "updatedAt"
      )
      VALUES 
        ('talent-1', 'user-1', 'Priya', 'Sharma', '1999-05-15', 'FEMALE', 'Indian', 
         '+919876543210', 'priya@test.com', 'Mumbai', 'Maharashtra', NOW(), NOW()),
        ('talent-2', 'user-2', 'Rahul', 'Verma', '1997-08-22', 'MALE', 'Indian',
         '+919876543211', 'rahul@test.com', 'Mumbai', 'Maharashtra', NOW(), NOW()),
        ('talent-3', 'user-3', 'Ananya', 'Kapoor', '2000-03-10', 'FEMALE', 'Indian',
         '+919876543212', 'ananya@test.com', 'Delhi', 'Delhi', NOW(), NOW()),
        ('talent-4', 'user-4', 'Arjun', 'Singh', '1995-11-30', 'MALE', 'Indian',
         '+919876543213', 'arjun@test.com', 'Bangalore', 'Karnataka', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING
      RETURNING id;
    `);
    console.log(`Created ${talentResult.rowCount} talents`);

    // Update talents with additional fields
    await client.query(`
      UPDATE talents SET
        "yearsOfExperience" = CASE 
          WHEN id = 'talent-1' THEN 3
          WHEN id = 'talent-2' THEN 5
          WHEN id = 'talent-3' THEN 2
          WHEN id = 'talent-4' THEN 7
          ELSE 0
        END,
        "actingSkills" = ARRAY['Method Acting', 'Improvisation', 'Theatre'],
        languages = ARRAY['Hindi', 'English', 'Marathi'],
        rating = CASE
          WHEN id = 'talent-1' THEN 4.5
          WHEN id = 'talent-2' THEN 4.2
          WHEN id = 'talent-3' THEN 4.8
          WHEN id = 'talent-4' THEN 4.0
          ELSE 0
        END,
        bio = CASE
          WHEN id = 'talent-1' THEN 'Versatile actress with experience in TV and film'
          WHEN id = 'talent-2' THEN 'Theatre background with strong dramatic skills'
          WHEN id = 'talent-3' THEN 'Fresh talent with dance and singing abilities'
          WHEN id = 'talent-4' THEN 'Experienced actor specializing in action roles'
          ELSE 'Talented performer'
        END
      WHERE id IN ('talent-1', 'talent-2', 'talent-3', 'talent-4');
    `);
    console.log('Updated talent details');

    // Create casting director
    await client.query(`
      INSERT INTO casting_directors (
        id, "userId", "companyName", "designation", "yearsOfExperience",
        specialization, "isVerified", "createdAt", "updatedAt"
      )
      VALUES (
        'cd-1', 'user-5', 'Mumbai Casting Co', 'Senior Casting Director', 10,
        ARRAY['Film', 'TV', 'Web Series'], true, NOW(), NOW()
      )
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('Created casting director');

    // Create sample projects
    await client.query(`
      INSERT INTO projects (
        id, title, type, genre, language, budget, description,
        status, "startDate", "endDate", location, "createdBy",
        "createdAt", "updatedAt"
      )
      VALUES 
        ('proj-1', 'Mumbai Dreams', 'FILM', 'Drama', 'Hindi', 50000000,
         'A story about aspiring actors in Mumbai', 'CASTING', 
         '2025-10-01', '2026-03-01', 'Mumbai', 'cd-1', NOW(), NOW()),
        ('proj-2', 'City Lights Web Series', 'WEB_SERIES', 'Thriller', 'Hindi', 20000000,
         'Crime thriller set in modern Mumbai', 'CASTING',
         '2025-09-15', '2025-12-15', 'Mumbai', 'cd-1', NOW(), NOW())
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('Created sample projects');

    console.log('Database seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
  } finally {
    await client.end();
  }
}

seedDatabase();