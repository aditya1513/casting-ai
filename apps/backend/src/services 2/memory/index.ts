/**
 * Memory System Index
 * Exports all memory services and provides unified memory interface
 */

// Import services only (not TypeScript interfaces)
import { episodicMemoryService } from './episodic-memory.service';
import { semanticMemoryService } from './semantic-memory.service';
import { proceduralMemoryService } from './procedural-memory.service';
import { memoryConsolidationService } from './consolidation.service';

// Export services only - interfaces must be imported directly from their source files
export { episodicMemoryService };
export { semanticMemoryService };
export { proceduralMemoryService };
export { memoryConsolidationService };

// Re-export types via type-only exports for TypeScript compatibility
export type { EpisodicMemory, EpisodicMemoryQuery } from './episodic-memory.service';
export type { SemanticEntity, SemanticRelation, KnowledgeGraph } from './semantic-memory.service';
export type { ProceduralPattern, WorkflowExecution } from './procedural-memory.service';

// Unified memory interface
export interface UnifiedMemory {
  episodic: typeof episodicMemoryService;
  semantic: typeof semanticMemoryService;
  procedural: typeof proceduralMemoryService;
  consolidation: typeof memoryConsolidationService;
}

// Export unified memory system
export const memorySystem: UnifiedMemory = {
  episodic: episodicMemoryService,
  semantic: semanticMemoryService,
  procedural: proceduralMemoryService,
  consolidation: memoryConsolidationService,
};