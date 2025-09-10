# CastMatch Database Seeding Guide

## Overview
The database seeding script (`seed-database.ts`) populates the CastMatch platform with realistic sample data from Mumbai's casting industry. This script creates a complete dataset including users, talent profiles, projects, applications, auditions, and more.

## Running the Seed Script

### Quick Start
```bash
# From the project root directory
bun run db:seed
```

### Alternative Methods
```bash
# Direct execution
bun run scripts/seed-database.ts

# From anywhere in the project
cd /Users/Aditya/Desktop/casting-ai
bun run db:seed
```

## What Gets Created

The script creates the following sample data:

### Users (14 total)
- **2 Casting Directors**: Mukesh Chhabra, Shanoo Sharma
- **2 Producers**: Karan Johar, Ritesh Sidhwani  
- **8 Actors**: Various talent profiles with diverse backgrounds
- **1 Assistant**: Rohit Kumar (Casting Assistant)
- **1 Admin**: System Administrator

### Talent Profiles (8 total)
Complete profiles for all actor users including:
- Physical attributes (height, weight, eye color, hair color)
- Skills and languages
- Professional experience and training
- Portfolio items and demo reels
- Location preferences (Mumbai areas)
- Budget expectations

### Projects (5 total)
1. **Mumbai Monsoon** - Romantic drama film
2. **Gully Boys - The Series** - Web series about hip-hop culture
3. **Diwali Commercial** - Traditional wear advertisement
4. **Crime Patrol Mumbai** - Crime series
5. **The Great Indian Family** - Family entertainer film

### Project Roles (10 total)
Various roles across projects including:
- Lead actors and actresses
- Supporting characters
- Commercial roles
- Character actors
- Age-specific roles (teenager, elderly)

### Applications (20 total)
- Actors applying to various roles
- Different application statuses (pending, shortlisted, selected, rejected)
- Cover letters and proposed budgets
- Review notes and ratings

### Auditions (11 total)
- Scheduled and completed auditions
- Online and offline formats
- Feedback and evaluations
- Recording URLs

### Notifications (36 total)
- Welcome notifications for all users
- Application status updates
- Audition scheduling alerts
- System notifications

### Conversations & Messages (3 conversations, 9 messages)
- AI assistant conversations with actors
- Career guidance discussions
- Role recommendation queries

### Memory Entries (9 total)
- User preferences (preferred roles, genres)
- Location preferences
- Recent search context
- Short-term and long-term memories

## Sample Login Credentials

After seeding, you can log in with these credentials:

| Role | Email | Password |
|------|-------|----------|
| **Casting Director** | mukesh.chhabra@castmatch.com | Password123! |
| **Producer** | karan.johar@castmatch.com | Password123! |
| **Actor** | arjun.mehta@castmatch.com | Password123! |
| **Admin** | admin@castmatch.com | Password123! |

## Mumbai-Specific Data

The script includes authentic Mumbai locations and industry details:

### Locations
- Bandra West
- Andheri West
- Juhu
- Versova
- Goregaon East
- Malad West
- Powai
- Khar West
- Santacruz West
- Lower Parel
- Worli
- Fort
- Colaba
- Dadar West
- Chembur

### Production Houses
- Yash Raj Films
- Dharma Productions
- Red Chillies Entertainment
- Excel Entertainment
- Balaji Motion Pictures
- And 10+ more authentic production companies

### Skills & Languages
- Languages: Hindi, English, Marathi, Gujarati, Punjabi
- Acting skills: Method Acting, Improvisation, Voice Modulation
- Dance styles: Classical, Contemporary, Bollywood
- Additional: Action sequences, Comedy timing, Singing

## Database Reset

The script automatically clears existing data before seeding, ensuring a clean state. This means:
- All existing records are deleted
- Fresh data is inserted
- Foreign key relationships are properly maintained
- No duplicate data issues

## Configuration

The script uses environment variables from:
```
/Users/Aditya/Desktop/casting-ai/apps/backend/.env
```

Default database connection (if DATABASE_URL not set):
```
postgresql://castmatch:castmatch123@localhost:5432/castmatch_db
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env file
   - Verify database credentials

2. **Permission Denied**
   - Make sure the database user has proper permissions
   - Check if the database exists

3. **Module Not Found**
   - Run `bun install` to ensure all dependencies are installed
   - Specifically needs: bcryptjs, drizzle-orm, pg, dotenv

### Verification

To verify the seed was successful:
1. Check the console output for record counts
2. Try logging in with sample credentials
3. Use `bun run db:studio` to view data in Drizzle Studio

## Development Tips

- Run the seed script whenever you need fresh test data
- The script is idempotent - safe to run multiple times
- Modify the script to add more specific test scenarios
- All passwords are hashed using bcrypt for security

## Support

For issues or questions about the seeding process, check:
- The main project README
- Database schema at `/apps/backend/src/models/schema.ts`
- Database configuration at `/apps/backend/src/config/database.ts`