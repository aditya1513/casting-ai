-- Memory System Database Schema for CastMatch AI
-- This migration creates tables for the Long-Term Memory (LTM) system

-- Create enum types for memory classification
CREATE TYPE memory_type AS ENUM ('episodic', 'semantic', 'procedural');
CREATE TYPE importance_level AS ENUM ('critical', 'high', 'medium', 'low', 'trivial');

-- Table for storing long-term episodic memories (events and interactions)
CREATE TABLE IF NOT EXISTS long_term_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_type memory_type NOT NULL,
    content JSONB NOT NULL,
    importance_score INTEGER CHECK (importance_score >= 1 AND importance_score <= 10),
    conversation_id VARCHAR(255),
    user_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    embedding vector(1536), -- For similarity search
    
    -- Indexes
    INDEX idx_ltm_conversation_id (conversation_id),
    INDEX idx_ltm_user_id (user_id),
    INDEX idx_ltm_created_at (created_at),
    INDEX idx_ltm_importance (importance_score),
    INDEX idx_ltm_memory_type (memory_type)
);

-- Table for storing semantic facts and knowledge
CREATE TABLE IF NOT EXISTS semantic_facts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fact_hash VARCHAR(64) UNIQUE NOT NULL, -- MD5 hash for deduplication
    content JSONB NOT NULL,
    relationships TEXT[] DEFAULT '{}', -- Related concepts/entities
    category VARCHAR(100),
    confidence_score FLOAT DEFAULT 1.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    access_count INTEGER DEFAULT 0,
    source_references TEXT[],
    embedding vector(1536),
    
    -- Indexes
    INDEX idx_facts_hash (fact_hash),
    INDEX idx_facts_category (category),
    INDEX idx_facts_relationships (relationships) USING GIN,
    INDEX idx_facts_confidence (confidence_score)
);

-- Table for storing procedural memories (workflows and patterns)
CREATE TABLE IF NOT EXISTS procedural_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_name VARCHAR(255) UNIQUE NOT NULL,
    action_sequence JSONB NOT NULL, -- Ordered list of actions
    success_rate FLOAT DEFAULT 1.0,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used TIMESTAMP WITH TIME ZONE,
    category VARCHAR(100),
    prerequisites TEXT[],
    outcomes JSONB,
    
    -- Indexes
    INDEX idx_procedures_name (workflow_name),
    INDEX idx_procedures_success_rate (success_rate),
    INDEX idx_procedures_usage (usage_count),
    INDEX idx_procedures_category (category)
);

-- Table for memory associations and relationships
CREATE TABLE IF NOT EXISTS memory_associations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_memory_id UUID NOT NULL,
    target_memory_id UUID NOT NULL,
    association_type VARCHAR(50) NOT NULL, -- causal, temporal, semantic, etc.
    strength FLOAT DEFAULT 1.0 CHECK (strength >= 0 AND strength <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign keys
    CONSTRAINT fk_source_memory FOREIGN KEY (source_memory_id) 
        REFERENCES long_term_memories(id) ON DELETE CASCADE,
    CONSTRAINT fk_target_memory FOREIGN KEY (target_memory_id) 
        REFERENCES long_term_memories(id) ON DELETE CASCADE,
    
    -- Prevent self-associations
    CONSTRAINT check_different_memories CHECK (source_memory_id != target_memory_id),
    
    -- Unique association between two memories
    CONSTRAINT unique_association UNIQUE (source_memory_id, target_memory_id, association_type),
    
    -- Indexes
    INDEX idx_associations_source (source_memory_id),
    INDEX idx_associations_target (target_memory_id),
    INDEX idx_associations_type (association_type)
);

-- Table for conversation summaries (for context compression)
CREATE TABLE IF NOT EXISTS conversation_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id VARCHAR(255) UNIQUE NOT NULL,
    summary JSONB NOT NULL,
    key_points TEXT[],
    decisions_made JSONB,
    action_items JSONB,
    participants TEXT[],
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    message_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_summaries_conversation (conversation_id),
    INDEX idx_summaries_created (created_at)
);

-- Table for tracking memory consolidation jobs
CREATE TABLE IF NOT EXISTS memory_consolidation_jobs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending', -- pending, processing, completed, failed
    memories_processed INTEGER DEFAULT 0,
    episodic_created INTEGER DEFAULT 0,
    semantic_created INTEGER DEFAULT 0,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes
    INDEX idx_consolidation_conversation (conversation_id),
    INDEX idx_consolidation_status (status),
    INDEX idx_consolidation_created (created_at)
);

-- Function to update last_accessed timestamp
CREATE OR REPLACE FUNCTION update_last_accessed()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_accessed = CURRENT_TIMESTAMP;
    NEW.access_count = COALESCE(OLD.access_count, 0) + 1;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for automatic timestamp updates
CREATE TRIGGER update_ltm_last_accessed
    BEFORE UPDATE ON long_term_memories
    FOR EACH ROW
    EXECUTE FUNCTION update_last_accessed();

CREATE TRIGGER update_facts_last_accessed
    BEFORE UPDATE ON semantic_facts
    FOR EACH ROW
    EXECUTE FUNCTION update_last_accessed();

-- Function to apply forgetting curve
CREATE OR REPLACE FUNCTION apply_forgetting_curve()
RETURNS INTEGER AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE long_term_memories
    SET importance_score = GREATEST(1, importance_score * 0.9)
    WHERE last_accessed < (CURRENT_TIMESTAMP - INTERVAL '30 days')
    AND importance_score > 1;
    
    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for vector similarity search (if pgvector is installed)
-- CREATE INDEX idx_ltm_embedding ON long_term_memories USING ivfflat (embedding vector_cosine_ops);
-- CREATE INDEX idx_facts_embedding ON semantic_facts USING ivfflat (embedding vector_cosine_ops);

-- Grant permissions (adjust based on your user setup)
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO castmatch_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO castmatch_user;