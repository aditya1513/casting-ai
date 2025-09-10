-- Advanced Memory System Database Schema
-- Migration: 002_advanced_memory.sql
-- Description: Creates tables for episodic, semantic, and procedural memory systems

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable vector extension for embeddings (requires pgvector)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- =====================================================
-- EPISODIC MEMORY TABLES
-- =====================================================

-- Enhanced Episodic Memory with forgetting curve support
CREATE TABLE IF NOT EXISTS episodic_memories_v2 (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    event_type VARCHAR(50) NOT NULL,
    decision_details JSONB NOT NULL,
    emotional_valence FLOAT CHECK (emotional_valence >= 0 AND emotional_valence <= 1),
    importance_score FLOAT CHECK (importance_score >= 0 AND importance_score <= 1),
    reinforcement_count INTEGER DEFAULT 0,
    last_accessed TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    decay_factor FLOAT DEFAULT 1.0 CHECK (decay_factor >= 0 AND decay_factor <= 2),
    -- context_embedding vector(1536), -- Uncomment when pgvector is available
    context_embedding FLOAT[], -- Fallback to array if pgvector not available
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Indexes for performance
    INDEX idx_episodic_user_id ON episodic_memories_v2(user_id),
    INDEX idx_episodic_event_type ON episodic_memories_v2(event_type),
    INDEX idx_episodic_importance ON episodic_memories_v2(importance_score DESC),
    INDEX idx_episodic_last_accessed ON episodic_memories_v2(last_accessed DESC),
    INDEX idx_episodic_created_at ON episodic_memories_v2(created_at DESC)
);

-- Memory consolidation tracking
CREATE TABLE IF NOT EXISTS memory_consolidations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    consolidation_type VARCHAR(50) NOT NULL,
    source_memory_ids UUID[],
    target_memory_id UUID,
    compression_ratio FLOAT,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_consolidation_type ON memory_consolidations(consolidation_type),
    INDEX idx_consolidation_created ON memory_consolidations(created_at DESC)
);

-- =====================================================
-- SEMANTIC KNOWLEDGE GRAPH TABLES
-- =====================================================

-- Knowledge graph nodes
CREATE TABLE IF NOT EXISTS knowledge_nodes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    node_id VARCHAR(255) UNIQUE NOT NULL,
    node_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    attributes JSONB,
    confidence FLOAT DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_node_type ON knowledge_nodes(node_type),
    INDEX idx_node_name ON knowledge_nodes(name),
    INDEX idx_node_confidence ON knowledge_nodes(confidence DESC)
);

-- Knowledge graph edges (relationships)
CREATE TABLE IF NOT EXISTS knowledge_graph (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    subject_id VARCHAR(255) NOT NULL,
    predicate VARCHAR(100) NOT NULL,
    object_id VARCHAR(255) NOT NULL,
    confidence FLOAT DEFAULT 1.0 CHECK (confidence >= 0 AND confidence <= 1),
    evidence_count INTEGER DEFAULT 1,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Unique constraint for relationships
    UNIQUE(subject_id, predicate, object_id),
    
    -- Indexes for graph traversal
    INDEX idx_graph_subject ON knowledge_graph(subject_id),
    INDEX idx_graph_object ON knowledge_graph(object_id),
    INDEX idx_graph_predicate ON knowledge_graph(predicate),
    INDEX idx_graph_confidence ON knowledge_graph(confidence DESC)
);

-- User preferences extracted from knowledge graph
CREATE TABLE IF NOT EXISTS user_preferences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL,
    preference_type VARCHAR(50) NOT NULL,
    preference_value VARCHAR(255) NOT NULL,
    confidence FLOAT DEFAULT 0.5,
    frequency INTEGER DEFAULT 1,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    
    UNIQUE(user_id, preference_type, preference_value),
    INDEX idx_pref_user ON user_preferences(user_id),
    INDEX idx_pref_type ON user_preferences(preference_type)
);

-- =====================================================
-- PROCEDURAL MEMORY TABLES
-- =====================================================

-- Procedural patterns and workflows
CREATE TABLE IF NOT EXISTS procedural_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    workflow_name VARCHAR(255) NOT NULL,
    action_sequence JSONB NOT NULL,
    success_rate FLOAT DEFAULT 0.0 CHECK (success_rate >= 0 AND success_rate <= 1),
    execution_count INTEGER DEFAULT 0,
    average_time_seconds INTEGER,
    optimization_suggestions JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_proc_user ON procedural_patterns(user_id),
    INDEX idx_proc_workflow ON procedural_patterns(workflow_name),
    INDEX idx_proc_success ON procedural_patterns(success_rate DESC),
    INDEX idx_proc_count ON procedural_patterns(execution_count DESC)
);

-- Workflow execution history
CREATE TABLE IF NOT EXISTS workflow_executions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_id UUID REFERENCES procedural_patterns(id),
    user_id UUID,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    duration_seconds INTEGER,
    success BOOLEAN DEFAULT false,
    error_message TEXT,
    context JSONB,
    
    INDEX idx_exec_pattern ON workflow_executions(pattern_id),
    INDEX idx_exec_user ON workflow_executions(user_id),
    INDEX idx_exec_start ON workflow_executions(start_time DESC)
);

-- Learned best practices
CREATE TABLE IF NOT EXISTS best_practices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    practice_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    description TEXT,
    success_rate FLOAT,
    adoption_rate FLOAT,
    evidence_count INTEGER DEFAULT 1,
    practice_details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_practice_category ON best_practices(category),
    INDEX idx_practice_success ON best_practices(success_rate DESC)
);

-- =====================================================
-- MEMORY ANALYTICS TABLES
-- =====================================================

-- Memory usage statistics
CREATE TABLE IF NOT EXISTS memory_statistics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    memory_type VARCHAR(50) NOT NULL,
    total_count INTEGER,
    active_count INTEGER,
    avg_importance FLOAT,
    avg_retention FLOAT,
    storage_bytes BIGINT,
    metadata JSONB,
    
    INDEX idx_stats_timestamp ON memory_statistics(timestamp DESC),
    INDEX idx_stats_type ON memory_statistics(memory_type)
);

-- Memory access patterns
CREATE TABLE IF NOT EXISTS memory_access_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    memory_id UUID NOT NULL,
    memory_type VARCHAR(50) NOT NULL,
    access_type VARCHAR(50), -- read, write, update, consolidate
    user_id UUID,
    session_id VARCHAR(255),
    response_time_ms INTEGER,
    success BOOLEAN DEFAULT true,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_access_memory ON memory_access_log(memory_id),
    INDEX idx_access_user ON memory_access_log(user_id),
    INDEX idx_access_time ON memory_access_log(timestamp DESC)
);

-- =====================================================
-- PATTERN MINING RESULTS
-- =====================================================

-- Discovered sequential patterns
CREATE TABLE IF NOT EXISTS discovered_patterns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    pattern_type VARCHAR(50) NOT NULL, -- sequential, parallel, conditional, cyclic, hierarchical
    pattern_sequence TEXT[] NOT NULL,
    support FLOAT CHECK (support >= 0 AND support <= 1),
    confidence FLOAT CHECK (confidence >= 0 AND confidence <= 1),
    lift FLOAT,
    frequency INTEGER DEFAULT 1,
    metadata JSONB,
    discovered_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_seen TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_pattern_type ON discovered_patterns(pattern_type),
    INDEX idx_pattern_support ON discovered_patterns(support DESC),
    INDEX idx_pattern_confidence ON discovered_patterns(confidence DESC)
);

-- =====================================================
-- MEMORY INSIGHTS
-- =====================================================

-- Generated insights from memory analysis
CREATE TABLE IF NOT EXISTS memory_insights (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    insight_type VARCHAR(100) NOT NULL,
    insight_text TEXT NOT NULL,
    confidence FLOAT DEFAULT 0.5,
    impact_score FLOAT,
    applicable_users UUID[],
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP WITH TIME ZONE,
    
    INDEX idx_insight_type ON memory_insights(insight_type),
    INDEX idx_insight_created ON memory_insights(created_at DESC),
    INDEX idx_insight_impact ON memory_insights(impact_score DESC)
);

-- =====================================================
-- FUNCTIONS AND TRIGGERS
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_episodic_memories_updated_at BEFORE UPDATE
    ON episodic_memories_v2 FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_nodes_updated_at BEFORE UPDATE
    ON knowledge_nodes FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_knowledge_graph_updated_at BEFORE UPDATE
    ON knowledge_graph FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_procedural_patterns_updated_at BEFORE UPDATE
    ON procedural_patterns FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to calculate memory decay
CREATE OR REPLACE FUNCTION calculate_memory_decay(
    last_accessed TIMESTAMP WITH TIME ZONE,
    importance FLOAT,
    reinforcement_count INTEGER
) RETURNS FLOAT AS $$
DECLARE
    hours_elapsed FLOAT;
    base_decay FLOAT;
    stability FLOAT;
BEGIN
    hours_elapsed := EXTRACT(EPOCH FROM (CURRENT_TIMESTAMP - last_accessed)) / 3600;
    stability := 1 + (reinforcement_count * 0.5) + (importance * 0.3);
    base_decay := EXP(-0.5 * hours_elapsed / stability);
    RETURN GREATEST(0.0, LEAST(1.0, base_decay));
END;
$$ LANGUAGE plpgsql;

-- Function to find similar memories (requires pgvector)
-- CREATE OR REPLACE FUNCTION find_similar_memories(
--     query_embedding vector(1536),
--     limit_count INTEGER DEFAULT 10
-- ) RETURNS TABLE (
--     memory_id UUID,
--     similarity FLOAT,
--     decision_details JSONB
-- ) AS $$
-- BEGIN
--     RETURN QUERY
--     SELECT 
--         id as memory_id,
--         1 - (context_embedding <=> query_embedding) as similarity,
--         decision_details
--     FROM episodic_memories_v2
--     WHERE 1 - (context_embedding <=> query_embedding) > 0.7
--     ORDER BY context_embedding <=> query_embedding
--     LIMIT limit_count;
-- END;
-- $$ LANGUAGE plpgsql;

-- =====================================================
-- INITIAL DATA AND INDEXES
-- =====================================================

-- Create partial indexes for better performance
CREATE INDEX idx_episodic_recent_important ON episodic_memories_v2(importance_score, created_at DESC)
    WHERE importance_score > 0.7;

CREATE INDEX idx_patterns_successful ON procedural_patterns(success_rate, execution_count)
    WHERE success_rate > 0.8 AND execution_count > 5;

CREATE INDEX idx_graph_high_confidence ON knowledge_graph(confidence, evidence_count)
    WHERE confidence > 0.8;

-- =====================================================
-- PERMISSIONS (adjust as needed)
-- =====================================================

-- Grant permissions to the application user
-- GRANT ALL ON ALL TABLES IN SCHEMA public TO castmatch_user;
-- GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO castmatch_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO castmatch_user;