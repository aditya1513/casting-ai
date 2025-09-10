-- Migration: Create search-related tables for CastMatch
-- Version: 003
-- Date: 2025-09-04
-- Description: Add tables for talent search metadata, analytics, and saved searches

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable vector extension for embeddings (if available)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- Talent Search Metadata Table
-- =====================================================
CREATE TABLE IF NOT EXISTS talent_search_metadata (
    talent_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_text TEXT NOT NULL,
    embedding_version INT DEFAULT 1,
    last_indexed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    search_boost_factor FLOAT DEFAULT 1.0,
    popularity_score FLOAT DEFAULT 0.0,
    availability_status VARCHAR(50) DEFAULT 'available',
    
    -- Searchable attributes
    name VARCHAR(255),
    age INT,
    gender VARCHAR(20),
    location VARCHAR(255),
    languages TEXT[], -- Array of languages
    skills TEXT[], -- Array of skills
    genres TEXT[], -- Array of genres
    
    -- Physical attributes
    height_cm INT,
    weight_kg INT,
    eye_color VARCHAR(50),
    hair_color VARCHAR(50),
    
    -- Experience and performance
    experience_years INT DEFAULT 0,
    project_count INT DEFAULT 0,
    average_rating FLOAT,
    recent_box_office BIGINT,
    awards_count INT DEFAULT 0,
    
    -- Industry specific
    film_school VARCHAR(255),
    union_member BOOLEAN DEFAULT FALSE,
    production_houses TEXT[], -- Array of associated production houses
    is_star_kid BOOLEAN DEFAULT FALSE,
    
    -- Budget and availability
    budget_min DECIMAL(12, 2),
    budget_max DECIMAL(12, 2),
    available_from DATE,
    available_to DATE,
    
    -- Social and popularity metrics
    social_followers INT DEFAULT 0,
    media_mentions INT DEFAULT 0,
    fan_rating FLOAT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Embedding vector (commented out - use Pinecone instead)
    -- embedding vector(1536),
    
    -- Indexes
    CONSTRAINT check_age CHECK (age >= 0 AND age <= 120),
    CONSTRAINT check_rating CHECK (average_rating >= 0 AND average_rating <= 10),
    CONSTRAINT check_boost CHECK (search_boost_factor >= 0 AND search_boost_factor <= 10)
);

-- Create indexes for faster searches
CREATE INDEX idx_talent_search_name ON talent_search_metadata(name);
CREATE INDEX idx_talent_search_location ON talent_search_metadata(location);
CREATE INDEX idx_talent_search_age ON talent_search_metadata(age);
CREATE INDEX idx_talent_search_gender ON talent_search_metadata(gender);
CREATE INDEX idx_talent_search_availability ON talent_search_metadata(availability_status);
CREATE INDEX idx_talent_search_budget ON talent_search_metadata(budget_min, budget_max);
CREATE INDEX idx_talent_search_popularity ON talent_search_metadata(popularity_score DESC);
CREATE INDEX idx_talent_search_updated ON talent_search_metadata(updated_at DESC);
CREATE INDEX idx_talent_search_languages ON talent_search_metadata USING GIN(languages);
CREATE INDEX idx_talent_search_skills ON talent_search_metadata USING GIN(skills);
CREATE INDEX idx_talent_search_genres ON talent_search_metadata USING GIN(genres);

-- =====================================================
-- Search Analytics Table
-- =====================================================
CREATE TABLE IF NOT EXISTS search_analytics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    session_id VARCHAR(255),
    query TEXT NOT NULL,
    query_type VARCHAR(50), -- 'semantic', 'similar', 'filters', 'natural'
    
    -- Query parameters
    filters JSONB,
    top_k INT DEFAULT 20,
    
    -- Results
    results_count INT DEFAULT 0,
    clicked_results JSONB, -- Array of clicked result IDs with positions
    selected_talents JSONB, -- Array of finally selected talent IDs
    
    -- Performance metrics
    search_time_ms INT,
    embedding_time_ms INT,
    ranking_time_ms INT,
    
    -- User behavior
    refinements_count INT DEFAULT 0,
    time_to_first_click INT, -- Milliseconds
    time_on_results_page INT, -- Milliseconds
    
    -- Feedback
    user_satisfaction INT, -- 1-5 rating
    feedback_text TEXT,
    
    -- Context
    project_id UUID,
    casting_role VARCHAR(255),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Embedding for query analysis (commented out - use Pinecone)
    -- query_embedding vector(1536),
    
    CONSTRAINT check_satisfaction CHECK (user_satisfaction >= 1 AND user_satisfaction <= 5)
);

-- Create indexes for analytics
CREATE INDEX idx_search_analytics_user ON search_analytics(user_id);
CREATE INDEX idx_search_analytics_created ON search_analytics(created_at DESC);
CREATE INDEX idx_search_analytics_query_type ON search_analytics(query_type);
CREATE INDEX idx_search_analytics_results_count ON search_analytics(results_count);
CREATE INDEX idx_search_analytics_search_time ON search_analytics(search_time_ms);

-- =====================================================
-- Saved Searches Table
-- =====================================================
CREATE TABLE IF NOT EXISTS saved_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    search_name VARCHAR(255) NOT NULL,
    query TEXT NOT NULL,
    query_params JSONB,
    
    -- Alert settings
    alert_enabled BOOLEAN DEFAULT FALSE,
    alert_frequency VARCHAR(50) DEFAULT 'daily', -- 'immediate', 'daily', 'weekly'
    last_alert_sent TIMESTAMP WITH TIME ZONE,
    
    -- Search metadata
    search_type VARCHAR(50),
    filters JSONB,
    sort_order VARCHAR(50),
    
    -- Usage tracking
    use_count INT DEFAULT 0,
    last_used TIMESTAMP WITH TIME ZONE,
    
    -- Sharing
    is_public BOOLEAN DEFAULT FALSE,
    share_token VARCHAR(255) UNIQUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_user_search_name UNIQUE (user_id, search_name)
);

-- Create indexes for saved searches
CREATE INDEX idx_saved_searches_user ON saved_searches(user_id);
CREATE INDEX idx_saved_searches_alert ON saved_searches(alert_enabled) WHERE alert_enabled = TRUE;
CREATE INDEX idx_saved_searches_public ON saved_searches(is_public) WHERE is_public = TRUE;
CREATE INDEX idx_saved_searches_share_token ON saved_searches(share_token) WHERE share_token IS NOT NULL;

-- =====================================================
-- Search Suggestions Table (for autocomplete)
-- =====================================================
CREATE TABLE IF NOT EXISTS search_suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    suggestion_text VARCHAR(255) NOT NULL UNIQUE,
    suggestion_type VARCHAR(50), -- 'query', 'talent', 'skill', 'location'
    popularity_count INT DEFAULT 0,
    click_through_rate FLOAT DEFAULT 0.0,
    
    -- Metadata
    related_terms TEXT[],
    category VARCHAR(100),
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT check_ctr CHECK (click_through_rate >= 0 AND click_through_rate <= 1)
);

-- Create indexes for suggestions
CREATE INDEX idx_search_suggestions_text ON search_suggestions(suggestion_text);
CREATE INDEX idx_search_suggestions_type ON search_suggestions(suggestion_type);
CREATE INDEX idx_search_suggestions_popularity ON search_suggestions(popularity_count DESC);

-- =====================================================
-- Talent Chemistry Matrix (for compatibility scores)
-- =====================================================
CREATE TABLE IF NOT EXISTS talent_chemistry (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    talent1_id UUID NOT NULL,
    talent2_id UUID NOT NULL,
    chemistry_score FLOAT NOT NULL,
    
    -- Collaboration history
    projects_together INT DEFAULT 0,
    last_collaboration DATE,
    
    -- Performance metrics
    box_office_average BIGINT,
    audience_rating_average FLOAT,
    critical_rating_average FLOAT,
    
    -- Chemistry factors
    on_screen_chemistry FLOAT,
    off_screen_compatibility FLOAT,
    genre_compatibility JSONB, -- Scores per genre
    
    -- Timestamps
    calculated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_talent_pair UNIQUE (talent1_id, talent2_id),
    CONSTRAINT check_chemistry_score CHECK (chemistry_score >= 0 AND chemistry_score <= 1),
    CONSTRAINT check_different_talents CHECK (talent1_id != talent2_id)
);

-- Create indexes for chemistry queries
CREATE INDEX idx_talent_chemistry_talent1 ON talent_chemistry(talent1_id);
CREATE INDEX idx_talent_chemistry_talent2 ON talent_chemistry(talent2_id);
CREATE INDEX idx_talent_chemistry_score ON talent_chemistry(chemistry_score DESC);

-- =====================================================
-- Search Performance Tracking Table
-- =====================================================
CREATE TABLE IF NOT EXISTS search_performance (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    hour INT NOT NULL,
    
    -- Volume metrics
    total_searches INT DEFAULT 0,
    unique_users INT DEFAULT 0,
    
    -- Performance metrics
    avg_response_time_ms FLOAT,
    p95_response_time_ms FLOAT,
    p99_response_time_ms FLOAT,
    
    -- Quality metrics
    avg_results_count FLOAT,
    zero_results_rate FLOAT,
    click_through_rate FLOAT,
    conversion_rate FLOAT,
    
    -- Error tracking
    error_count INT DEFAULT 0,
    error_rate FLOAT,
    
    -- System metrics
    cpu_usage_percent FLOAT,
    memory_usage_mb INT,
    index_size_mb INT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT unique_date_hour UNIQUE (date, hour),
    CONSTRAINT check_hour CHECK (hour >= 0 AND hour <= 23)
);

-- Create indexes for performance monitoring
CREATE INDEX idx_search_performance_date ON search_performance(date DESC);
CREATE INDEX idx_search_performance_date_hour ON search_performance(date DESC, hour);

-- =====================================================
-- User Search Preferences Table
-- =====================================================
CREATE TABLE IF NOT EXISTS user_search_preferences (
    user_id UUID PRIMARY KEY,
    
    -- Preferred search criteria
    preferred_genres TEXT[],
    preferred_age_range INT[],
    preferred_locations TEXT[],
    preferred_languages TEXT[],
    preferred_budget_range DECIMAL[],
    
    -- Search behavior
    average_results_viewed INT DEFAULT 10,
    typical_search_depth INT DEFAULT 1,
    uses_filters_frequently BOOLEAN DEFAULT FALSE,
    
    -- Interaction history
    liked_talents UUID[],
    disliked_talents UUID[],
    frequently_searched_terms TEXT[],
    
    -- Display preferences
    results_per_page INT DEFAULT 20,
    sort_preference VARCHAR(50) DEFAULT 'relevance',
    show_explanations BOOLEAN DEFAULT TRUE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- Trigger for updating timestamps
-- =====================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_talent_search_metadata_updated_at 
    BEFORE UPDATE ON talent_search_metadata 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_saved_searches_updated_at 
    BEFORE UPDATE ON saved_searches 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_talent_chemistry_updated_at 
    BEFORE UPDATE ON talent_chemistry 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_search_preferences_updated_at 
    BEFORE UPDATE ON user_search_preferences 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Sample data insertion (optional, for testing)
-- =====================================================
-- Uncomment the following lines to insert sample data

/*
-- Sample talent search metadata
INSERT INTO talent_search_metadata (
    name, age, gender, location, languages, skills, genres,
    experience_years, popularity_score, budget_min, budget_max
) VALUES 
    ('Aarav Sharma', 28, 'male', 'Mumbai', ARRAY['Hindi', 'English'], 
     ARRAY['Acting', 'Dancing', 'Martial Arts'], ARRAY['Action', 'Drama'],
     5, 7.5, 500000, 2000000),
    ('Priya Patel', 25, 'female', 'Mumbai', ARRAY['Hindi', 'English', 'Gujarati'],
     ARRAY['Acting', 'Singing', 'Classical Dance'], ARRAY['Romance', 'Drama', 'Musical'],
     3, 8.2, 300000, 1500000),
    ('Rahul Verma', 32, 'male', 'Delhi', ARRAY['Hindi', 'English', 'Punjabi'],
     ARRAY['Acting', 'Comedy', 'Mimicry'], ARRAY['Comedy', 'Drama'],
     8, 6.8, 700000, 2500000);

-- Sample search suggestions
INSERT INTO search_suggestions (suggestion_text, suggestion_type, popularity_count)
VALUES 
    ('young actors for romantic lead', 'query', 150),
    ('theater trained actors', 'query', 120),
    ('Shah Rukh Khan', 'talent', 500),
    ('Mumbai', 'location', 300),
    ('dancing', 'skill', 200);
*/

-- =====================================================
-- Grants (adjust based on your user roles)
-- =====================================================
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO castmatch_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO castmatch_app;

-- =====================================================
-- Migration completion message
-- =====================================================
DO $$ 
BEGIN 
    RAISE NOTICE 'Search tables migration completed successfully';
END $$;