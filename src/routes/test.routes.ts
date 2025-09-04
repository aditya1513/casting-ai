import { Router } from 'express';
import { Client } from 'pg';

const router = Router();

// Direct database connection for testing
const dbConfig = {
  host: 'localhost',
  port: 5432,
  user: 'castmatch_user',
  password: 'castmatch_pass',
  database: 'castmatch_db'
};

// Test endpoint to get talents directly
router.get('/talents', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    
    const query = `
      SELECT 
        t.id, 
        t."firstName", 
        t."lastName", 
        t."currentCity",
        t."yearsOfExperience",
        t.bio,
        t.rating,
        u.email
      FROM talents t
      LEFT JOIN users u ON t."userId" = u.id
      LIMIT 10
    `;
    
    const result = await client.query(query);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rowCount
    });
    
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    await client.end();
  }
});

// Test endpoint to search talents by city
router.get('/talents/search', async (req, res) => {
  const client = new Client(dbConfig);
  const { city } = req.query;
  
  try {
    await client.connect();
    
    let query = `
      SELECT 
        t.id, 
        t."firstName", 
        t."lastName", 
        t."currentCity",
        t."yearsOfExperience",
        t.bio,
        t.rating,
        u.email
      FROM talents t
      LEFT JOIN users u ON t."userId" = u.id
    `;
    
    const params: any[] = [];
    
    if (city) {
      query += ` WHERE t."currentCity" = $1`;
      params.push(city);
    }
    
    query += ` LIMIT 10`;
    
    const result = await client.query(query, params);
    
    res.json({
      success: true,
      data: result.rows,
      total: result.rowCount
    });
    
  } catch (error: any) {
    console.error('Database error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    await client.end();
  }
});

// Test database connection
router.get('/db-test', async (req, res) => {
  const client = new Client(dbConfig);
  
  try {
    await client.connect();
    const result = await client.query('SELECT NOW()');
    
    res.json({
      success: true,
      message: 'Database connected successfully',
      timestamp: result.rows[0].now
    });
    
  } catch (error: any) {
    console.error('Database connection error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  } finally {
    await client.end();
  }
});

export default router;