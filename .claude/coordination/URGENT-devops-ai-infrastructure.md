# URGENT: AI Infrastructure Setup Required

## @devops-infrastructure-developer - IMMEDIATE ACTION

### CRITICAL BLOCKER ALERT
AI/ML team is BLOCKED at 20% progress waiting for GPU resources and vector database.

### IMMEDIATE ACTIONS (Complete within 30 minutes):

## 1. CUDA Container Setup (Priority 1)

Add to `docker-compose.yml`:

```yaml
  ai-service:
    image: nvidia/cuda:11.8.0-runtime-ubuntu22.04
    container_name: castmatch-ai
    runtime: nvidia
    environment:
      - NVIDIA_VISIBLE_DEVICES=all
      - NVIDIA_DRIVER_CAPABILITIES=compute,utility
      - CUDA_VISIBLE_DEVICES=0
    volumes:
      - ./models:/models
      - ./lib/ai:/app
    networks:
      - castmatch-network
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

## 2. Vector Database Setup (Priority 2)

Choose ONE and implement immediately:

### Option A: Weaviate (Recommended)
```yaml
  weaviate:
    image: semitechnologies/weaviate:latest
    container_name: castmatch-vectordb
    ports:
      - "8080:8080"
    environment:
      - AUTHENTICATION_ANONYMOUS_ACCESS_ENABLED=true
      - PERSISTENCE_DATA_PATH=/var/lib/weaviate
      - DEFAULT_VECTORIZER_MODULE=text2vec-transformers
      - ENABLE_MODULES=text2vec-transformers
      - TRANSFORMERS_INFERENCE_API=http://t2v-transformers:8080
    volumes:
      - weaviate_data:/var/lib/weaviate
    networks:
      - castmatch-network
```

### Option B: Pinecone (Cloud-based)
```yaml
  # Add to .env file instead:
  # PINECONE_API_KEY=your-api-key
  # PINECONE_ENVIRONMENT=us-west1-gcp
  # PINECONE_INDEX_NAME=castmatch-talents
```

## 3. Environment Variables

Create `.env.ai` file:

```bash
# Vector Database
VECTOR_DB_TYPE=weaviate
VECTOR_DB_URL=http://localhost:8080
VECTOR_DB_API_KEY=

# GPU Configuration
CUDA_DEVICE_ORDER=PCI_BUS_ID
CUDA_VISIBLE_DEVICES=0

# Model Configuration
MODEL_CACHE_DIR=/models
EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
```

## 4. Verification Commands

Run these to verify setup:

```bash
# Check GPU availability
docker run --rm --gpus all nvidia/cuda:11.8.0-base-ubuntu22.04 nvidia-smi

# Test Weaviate connection
curl http://localhost:8080/v1/.well-known/ready

# Verify containers
docker-compose ps
```

## 5. Share with AI/ML Developer

Once complete, provide:

```typescript
// Connection configuration for AI team
export const aiConfig = {
  vectorDB: {
    type: 'weaviate',
    url: process.env.VECTOR_DB_URL || 'http://localhost:8080',
    apiKey: process.env.VECTOR_DB_API_KEY
  },
  gpu: {
    available: true,
    device: 0,
    memory: '8GB'  // Update based on actual GPU
  },
  models: {
    embedding: 'sentence-transformers/all-MiniLM-L6-v2',
    cachePath: '/models'
  }
};
```

## Timeline:
- **NOW**: Start CUDA container setup
- **+10 min**: Add vector database configuration
- **+20 min**: Test GPU passthrough
- **+25 min**: Verify all connections
- **+30 min**: Share config with AI team

## Success Criteria:
- [ ] GPU accessible in container (nvidia-smi works)
- [ ] Vector database running and accessible
- [ ] Environment variables configured
- [ ] Connection details shared with AI team
- [ ] AI team unblocked

## Resource Optimization Note:
Current CPU at 77% - after GPU setup, offload compute to GPU to reduce CPU load.

---
**Coordination Time**: 03:53 AM
**Expected Completion**: 04:23 AM
**AI Team Unblocked By**: 04:25 AM