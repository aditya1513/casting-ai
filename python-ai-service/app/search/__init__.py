"""Advanced Semantic Search System for CastMatch."""

from .pinecone_client import PineconeSearchSystem
from .embedding_pipeline import TalentEmbeddingPipeline
from .conversational_search import ConversationalSearch
from .hybrid_search import HybridSearch
from .ranking_engine import SearchRanking
from .index_manager import IndexManager

__all__ = [
    "PineconeSearchSystem",
    "TalentEmbeddingPipeline",
    "ConversationalSearch",
    "HybridSearch",
    "SearchRanking",
    "IndexManager"
]

__version__ = "1.0.0"