# CastMatch AI Service - Python Implementation

A high-performance AI-powered talent search and recommendation service built with FastAPI and Pydantic for the CastMatch platform.

## Features

- **AI-Powered Talent Search**: Intelligent search with natural language processing
- **Structured Responses**: Type-safe responses using Pydantic models
- **Smart Recommendations**: AI-driven talent recommendations based on role requirements
- **Chat Interface**: Interactive AI assistant for casting guidance
- **Real-time Database Integration**: Direct PostgreSQL connectivity with async support
- **RESTful API**: Well-documented endpoints with automatic Swagger UI
- **High Performance**: Async/await patterns for optimal performance
- **Comprehensive Logging**: Structured logging with Loguru

## Tech Stack

- **Framework**: FastAPI (latest)
- **Type Safety**: Pydantic v2
- **Database**: PostgreSQL with asyncpg
- **AI Models**: OpenAI GPT-4 & Anthropic Claude
- **Server**: Uvicorn with auto-reload
- **Python**: 3.11+

## Installation

### Prerequisites

- Python 3.11 or higher
- PostgreSQL database running
- OpenAI/Anthropic API keys (optional for AI features)

### Setup

1. Navigate to the service directory:
```bash
cd /Users/Aditya/Desktop/casting-ai/python-ai-service
```

2. Create and activate virtual environment:
```bash
python3 -m venv venv
source venv/bin/activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Configure environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

## Running the Service

### Development Mode
```bash
./run.sh
# Or directly:
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### Production Mode
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## API Endpoints

### Core Endpoints

- `GET /` - Welcome message and service info
- `GET /health` - Health check with database status
- `GET /docs` - Interactive Swagger UI documentation
- `GET /redoc` - Alternative API documentation

### Talent Management

- `POST /api/v1/talents/search` - Search talents with filters
- `GET /api/v1/talents/{talent_id}` - Get talent details
- `POST /api/v1/talents/recommend` - Get AI recommendations
- `POST /api/v1/talents/analyze-compatibility` - Analyze talent-role fit
- `POST /api/v1/talents/batch-search` - Batch search operations

### AI Chat

- `POST /api/v1/chat` - Interactive AI chat for casting assistance

## API Usage Examples

### Search Talents
```python
import httpx

search_criteria = {
    "gender": "FEMALE",
    "age_min": 25,
    "age_max": 30,
    "city": "Mumbai",
    "languages": ["Hindi", "English"],
    "limit": 10
}

async with httpx.AsyncClient() as client:
    response = await client.post(
        "http://localhost:8000/api/v1/talents/search",
        json=search_criteria
    )
    talents = response.json()
```

### Get AI Recommendations
```python
request_data = {
    "role_description": "Lead female role for romantic web series",
    "criteria": {
        "gender": "FEMALE",
        "age_min": 25,
        "age_max": 30
    }
}

response = await client.post(
    "http://localhost:8000/api/v1/talents/recommend",
    json=request_data
)
```

### Chat with AI
```python
chat_request = {
    "messages": [
        {
            "role": "user",
            "content": "Find me a male actor in Mumbai for an action role"
        }
    ],
    "temperature": 0.7
}

response = await client.post(
    "http://localhost:8000/api/v1/chat",
    json=chat_request
)
```

## Data Models

### TalentSearchCriteria
- `query`: Free text search
- `gender`: MALE, FEMALE, OTHER
- `age_min/age_max`: Age range
- `city/state`: Location filters
- `languages`: List of required languages
- `skills`: Required skills
- `experience_level`: FRESHER to VETERAN
- `availability_status`: Current availability

### TalentSummary
- Basic talent information
- Profile image URL
- Rating and verification status
- Key skills and languages
- Match score (when AI-powered)

### ChatRequest
- `messages`: Conversation history
- `context`: Additional context
- `search_criteria`: Optional search filters
- `temperature`: AI creativity (0-1)
- `max_tokens`: Response length limit

## Testing

Run the test suite:
```bash
python test_service.py
```

Run specific tests:
```bash
pytest tests/test_search.py -v
```

## Performance Optimization

- **Connection Pooling**: Async PostgreSQL connections
- **Caching**: Redis integration ready
- **Pagination**: Default 20 items, max 100
- **Async Operations**: Non-blocking I/O throughout
- **Background Tasks**: For heavy computations

## Error Handling

The service implements comprehensive error handling:
- Structured error responses
- Detailed logging
- Graceful degradation
- Retry mechanisms for external services

## Monitoring

- Health endpoint at `/health`
- Structured JSON logging
- Request/response logging
- Performance metrics ready

## Security

- CORS configuration
- JWT authentication ready
- Input validation with Pydantic
- SQL injection prevention
- Rate limiting support

## Directory Structure

```
python-ai-service/
├── app/
│   ├── __init__.py
│   ├── main.py              # FastAPI application
│   ├── core/
│   │   ├── __init__.py
│   │   └── config.py        # Configuration management
│   ├── database/
│   │   ├── __init__.py
│   │   └── connection.py    # Database connections
│   ├── schemas/
│   │   ├── __init__.py
│   │   └── talent.py        # Pydantic models
│   ├── services/
│   │   ├── __init__.py
│   │   └── ai_service.py    # AI business logic
│   └── utils/
│       └── __init__.py
├── logs/                     # Application logs
├── tests/                    # Test suite
├── requirements.txt          # Python dependencies
├── .env                      # Environment variables
├── run.sh                    # Startup script
├── test_service.py          # Service tests
└── README.md                # This file
```

## Environment Variables

```env
# Database
DATABASE_URL=postgresql://username@localhost:5432/castmatch_db

# Server
HOST=0.0.0.0
PORT=8000
DEBUG=True

# AI Services
OPENAI_API_KEY=your-key-here
ANTHROPIC_API_KEY=your-key-here

# Redis (Optional)
REDIS_URL=redis://localhost:6379
```

## Troubleshooting

### Database Connection Issues
- Ensure PostgreSQL is running
- Check DATABASE_URL in .env
- Verify user permissions

### Port Already in Use
```bash
lsof -i :8000
kill -9 <PID>
```

### Module Import Errors
```bash
pip install -r requirements.txt --upgrade
```

## Contributing

1. Create feature branch
2. Make changes with tests
3. Run test suite
4. Submit pull request

## License

Proprietary - CastMatch Platform

## Support

For issues or questions, contact the development team.

---

**Service Status**: ✅ Running on http://localhost:8000
**API Docs**: http://localhost:8000/docs
**Health Check**: http://localhost:8000/health