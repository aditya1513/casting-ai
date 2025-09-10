"""API routes for talent matching and script analysis."""

from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from typing import Dict, Any, Optional, List
from loguru import logger
from app.services.ai_service import ai_service
from app.services.vector_service import vector_service
from app.services.script_analysis_service import script_analysis_service
from app.schemas.talent import TalentSearchCriteria
from pydantic import BaseModel


router = APIRouter(prefix="/api/v1/matching", tags=["Talent Matching"])


class ScriptAnalysisRequest(BaseModel):
    """Request model for script analysis."""
    script_text: str
    extract_requirements: bool = True
    find_talents: bool = False


class SemanticSearchRequest(BaseModel):
    """Request model for semantic search."""
    query: str
    filters: Optional[Dict[str, Any]] = None
    top_k: int = 10


class RoleMatchRequest(BaseModel):
    """Request model for role matching."""
    role_description: str
    requirements: Optional[Dict[str, Any]] = None
    top_k: int = 10


@router.post("/semantic-search")
async def semantic_search(request: SemanticSearchRequest) -> Dict[str, Any]:
    """
    Perform semantic search for talents using vector embeddings.
    
    This endpoint uses advanced NLP to understand the search query and find
    the most relevant talents based on semantic similarity.
    """
    try:
        logger.info(f"Performing semantic search: {request.query}")
        
        # Ensure services are initialized
        await vector_service.initialize()
        
        # Perform semantic search
        results = await vector_service.search_similar_talents(
            query=request.query,
            filters=request.filters,
            top_k=request.top_k
        )
        
        return {
            "status": "success",
            "query": request.query,
            "results": results,
            "total_results": len(results),
            "search_type": "semantic",
            "filters_applied": request.filters
        }
        
    except Exception as e:
        logger.error(f"Error in semantic search: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-script")
async def analyze_script(request: ScriptAnalysisRequest) -> Dict[str, Any]:
    """
    Analyze a script to extract character information and casting requirements.
    
    This endpoint uses NLP to:
    - Extract character names and descriptions
    - Identify character traits and emotions
    - Determine age ranges and gender
    - Extract relationships between characters
    - Generate casting requirements
    """
    try:
        logger.info("Analyzing script for character extraction")
        
        # Ensure services are initialized
        await script_analysis_service.initialize()
        
        # Analyze the script
        analysis = await script_analysis_service.analyze_script(request.script_text)
        
        # Optionally find matching talents
        casting_suggestions = []
        if request.find_talents:
            for req in analysis.get('casting_requirements', []):
                talents = await vector_service.find_talents_for_role(
                    role_description=f"{req['character_name']}: {req.get('description', '')}",
                    requirements={
                        'skills': req.get('required_skills', []),
                        'gender': req.get('gender'),
                        'min_age': req.get('age_range', [20, 50])[0],
                        'max_age': req.get('age_range', [20, 50])[1],
                        'languages': req.get('language_requirements', [])
                    },
                    top_k=5
                )
                
                casting_suggestions.append({
                    'character': req['character_name'],
                    'suggested_talents': talents
                })
        
        return {
            "status": "success",
            "analysis": analysis,
            "casting_suggestions": casting_suggestions if casting_suggestions else None
        }
        
    except Exception as e:
        logger.error(f"Error analyzing script: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-script-file")
async def analyze_script_file(
    file: UploadFile = File(...),
    find_talents: bool = Form(False)
) -> Dict[str, Any]:
    """
    Analyze an uploaded script file.
    
    Accepts PDF, TXT, or other text formats.
    """
    try:
        # Read file content
        content = await file.read()
        
        # Convert to text based on file type
        if file.filename.endswith('.pdf'):
            # TODO: Add PDF parsing
            script_text = content.decode('utf-8', errors='ignore')
        else:
            script_text = content.decode('utf-8')
        
        # Process as regular script analysis
        request = ScriptAnalysisRequest(
            script_text=script_text,
            find_talents=find_talents
        )
        
        return await analyze_script(request)
        
    except Exception as e:
        logger.error(f"Error analyzing script file: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/match-role")
async def match_role_to_talents(request: RoleMatchRequest) -> Dict[str, Any]:
    """
    Find talents matching a specific role description.
    
    This endpoint:
    - Analyzes the role requirements
    - Performs semantic search for matching talents
    - Scores and ranks candidates
    - Provides match reasoning
    """
    try:
        logger.info(f"Finding talents for role: {request.role_description[:100]}...")
        
        # Ensure services are initialized
        await vector_service.initialize()
        
        # Find matching talents
        results = await vector_service.find_talents_for_role(
            role_description=request.role_description,
            requirements=request.requirements,
            top_k=request.top_k
        )
        
        # Extract role requirements from description
        role_requirements = await script_analysis_service.extract_role_requirements(
            request.role_description
        )
        
        return {
            "status": "success",
            "role_description": request.role_description,
            "extracted_requirements": role_requirements,
            "matching_talents": results,
            "total_matches": len(results)
        }
        
    except Exception as e:
        logger.error(f"Error matching role to talents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/index-talent/{talent_id}")
async def index_talent_profile(talent_id: str) -> Dict[str, Any]:
    """
    Index a talent profile in the vector database for semantic search.
    
    This should be called when:
    - A new talent profile is created
    - A talent profile is significantly updated
    - Rebuilding the search index
    """
    try:
        logger.info(f"Indexing talent profile: {talent_id}")
        
        # Fetch talent data from database
        from app.database.connection import async_db
        
        query = """
            SELECT 
                t.*,
                pa.*
            FROM talents t
            LEFT JOIN physical_attributes pa ON pa."talentId" = t.id
            WHERE t.id = $1
        """
        
        result = await async_db.fetch_one(query, talent_id)
        
        if not result:
            raise HTTPException(status_code=404, detail="Talent not found")
        
        # Prepare talent data for indexing
        talent_data = {
            'id': result['id'],
            'name': f"{result.get('firstName', '')} {result.get('lastName', '')}",
            'bio': result.get('bio', ''),
            'skills': result.get('actingSkills', []),
            'experience': result.get('experienceLevel', ''),
            'location': f"{result.get('currentCity', '')}, {result.get('currentState', '')}",
            'languages': result.get('languages', []),
            'gender': result.get('gender', ''),
            'age': result.get('age', 0),
            'height': result.get('height', '')
        }
        
        # Index in vector database
        await vector_service.initialize()
        success = await vector_service.index_talent(talent_data)
        
        if success:
            return {
                "status": "success",
                "message": f"Talent {talent_id} indexed successfully",
                "talent_id": talent_id
            }
        else:
            raise HTTPException(status_code=500, detail="Failed to index talent")
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error indexing talent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/batch-index-talents")
async def batch_index_talents(talent_ids: List[str] = None) -> Dict[str, Any]:
    """
    Batch index multiple talent profiles.
    
    If no talent_ids provided, indexes all talents in the database.
    """
    try:
        from app.database.connection import async_db
        
        # Build query
        if talent_ids:
            id_placeholders = ', '.join([f'${i+1}' for i in range(len(talent_ids))])
            query = f"""
                SELECT 
                    t.id,
                    t."firstName",
                    t."lastName",
                    t.bio,
                    t."actingSkills",
                    t."experienceLevel",
                    t."currentCity",
                    t."currentState",
                    t.languages,
                    t.gender,
                    DATE_PART('year', AGE(t."dateOfBirth")) as age
                FROM talents t
                WHERE t.id IN ({id_placeholders})
            """
            rows = await async_db.fetch_all(query, *talent_ids)
        else:
            query = """
                SELECT 
                    t.id,
                    t."firstName",
                    t."lastName",
                    t.bio,
                    t."actingSkills",
                    t."experienceLevel",
                    t."currentCity",
                    t."currentState",
                    t.languages,
                    t.gender,
                    DATE_PART('year', AGE(t."dateOfBirth")) as age
                FROM talents t
                LIMIT 100
            """
            rows = await async_db.fetch_all(query)
        
        # Prepare talent data
        talents = []
        for row in rows:
            talents.append({
                'id': row['id'],
                'name': f"{row.get('firstName', '')} {row.get('lastName', '')}",
                'bio': row.get('bio', ''),
                'skills': row.get('actingSkills', []),
                'experience': row.get('experienceLevel', ''),
                'location': f"{row.get('currentCity', '')}, {row.get('currentState', '')}",
                'languages': row.get('languages', []),
                'gender': row.get('gender', ''),
                'age': int(row.get('age', 0)) if row.get('age') else 0
            })
        
        # Batch index
        await vector_service.initialize()
        indexed_count = await vector_service.batch_index_talents(talents)
        
        return {
            "status": "success",
            "message": f"Indexed {indexed_count} out of {len(talents)} talents",
            "total_processed": len(talents),
            "successfully_indexed": indexed_count
        }
        
    except Exception as e:
        logger.error(f"Error batch indexing talents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/vector-search-status")
async def get_vector_search_status() -> Dict[str, Any]:
    """Get the status of the vector search service."""
    try:
        await vector_service.initialize()
        
        pinecone_status = "connected" if vector_service.index else "not configured"
        embedding_status = "loaded" if vector_service.embedding_model else "not loaded"
        
        return {
            "status": "success",
            "vector_service": {
                "pinecone": pinecone_status,
                "embedding_model": embedding_status,
                "dimension": vector_service.dimension
            },
            "script_service": {
                "nlp_model": "loaded" if script_analysis_service.nlp else "not loaded",
                "openai": "configured" if script_analysis_service.openai_client else "not configured"
            }
        }
        
    except Exception as e:
        logger.error(f"Error getting vector search status: {e}")
        return {
            "status": "error",
            "error": str(e)
        }