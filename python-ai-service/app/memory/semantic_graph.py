"""Semantic Knowledge Graph System for CastMatch."""

import uuid
import json
import networkx as nx
from typing import List, Dict, Any, Optional, Tuple, Set
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import asyncpg
from loguru import logger
import numpy as np
from collections import defaultdict

from app.database.connection import async_db
from app.core.config import settings


class RelationType(Enum):
    """Types of relationships in the knowledge graph."""
    WORKED_WITH = "worked_with"
    SIMILAR_TO = "similar_to"
    BELONGS_TO = "belongs_to"
    PREFERS = "prefers"
    SPECIALIZES_IN = "specializes_in"
    RECOMMENDED_BY = "recommended_by"
    COMPETED_WITH = "competed_with"
    MENTORED_BY = "mentored_by"


class NodeType(Enum):
    """Types of nodes in the knowledge graph."""
    ACTOR = "actor"
    DIRECTOR = "director"
    PRODUCER = "producer"
    PROJECT = "project"
    GENRE = "genre"
    SKILL = "skill"
    PLATFORM = "platform"
    AGENCY = "agency"
    LOCATION = "location"


@dataclass
class KnowledgeNode:
    """Node in the semantic knowledge graph."""
    node_id: str
    node_type: NodeType
    name: str
    attributes: Dict[str, Any]
    confidence: float
    created_at: datetime
    updated_at: datetime


@dataclass
class KnowledgeEdge:
    """Edge in the semantic knowledge graph."""
    subject_id: str
    predicate: RelationType
    object_id: str
    confidence: float
    evidence_count: int
    metadata: Dict[str, Any]
    created_at: datetime


class SemanticKnowledge:
    """Semantic knowledge graph for industry relationships and patterns."""
    
    def __init__(self):
        self.db = async_db
        self.graph = nx.DiGraph()
        self.confidence_threshold = 0.6
        self.min_evidence_count = 2
        
    async def initialize(self):
        """Initialize the knowledge graph from database."""
        try:
            # Load existing knowledge from database
            await self._load_graph_from_db()
            logger.info(f"Initialized knowledge graph with {self.graph.number_of_nodes()} nodes")
            
        except Exception as e:
            logger.error(f"Error initializing knowledge graph: {e}")
    
    async def build_actor_network(
        self,
        relationships: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Build a network of actor relationships and collaborations.
        
        Args:
            relationships: List of relationship data
            
        Returns:
            Network statistics and key connections
        """
        try:
            nodes_added = 0
            edges_added = 0
            
            for rel in relationships:
                # Add actors as nodes
                actor1_id = rel.get("actor1_id")
                actor2_id = rel.get("actor2_id")
                
                if actor1_id:
                    self._add_node(
                        actor1_id,
                        NodeType.ACTOR,
                        rel.get("actor1_name", "Unknown"),
                        rel.get("actor1_attributes", {})
                    )
                    nodes_added += 1
                
                if actor2_id:
                    self._add_node(
                        actor2_id,
                        NodeType.ACTOR,
                        rel.get("actor2_name", "Unknown"),
                        rel.get("actor2_attributes", {})
                    )
                    nodes_added += 1
                
                # Add relationship edge
                if actor1_id and actor2_id:
                    await self._add_edge(
                        actor1_id,
                        RelationType.WORKED_WITH,
                        actor2_id,
                        rel.get("confidence", 0.8),
                        rel.get("project_count", 1),
                        rel.get("metadata", {})
                    )
                    edges_added += 1
            
            # Calculate network metrics
            metrics = self._calculate_network_metrics()
            
            # Find key influencers (high centrality)
            influencers = self._find_influencers(top_k=10)
            
            # Find tight-knit groups (communities)
            communities = self._detect_communities()
            
            result = {
                "nodes_added": nodes_added,
                "edges_added": edges_added,
                "total_nodes": self.graph.number_of_nodes(),
                "total_edges": self.graph.number_of_edges(),
                "metrics": metrics,
                "influencers": influencers,
                "communities": communities
            }
            
            logger.info(f"Built actor network: {result}")
            return result
            
        except Exception as e:
            logger.error(f"Error building actor network: {e}")
            return {"error": str(e)}
    
    async def track_genre_preferences(
        self,
        user_id: str,
        patterns: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Track and analyze genre preferences for a user.
        
        Args:
            user_id: User identifier
            patterns: List of preference patterns
            
        Returns:
            Preference analysis and recommendations
        """
        try:
            # Create user node if not exists
            self._add_node(
                user_id,
                NodeType.PRODUCER,
                f"User_{user_id}",
                {"type": "casting_director"}
            )
            
            genre_scores = defaultdict(float)
            platform_scores = defaultdict(float)
            
            for pattern in patterns:
                genre = pattern.get("genre")
                platform = pattern.get("platform")
                success_rate = pattern.get("success_rate", 0.5)
                frequency = pattern.get("frequency", 1)
                
                if genre:
                    # Add genre node
                    genre_id = f"genre_{genre}"
                    self._add_node(
                        genre_id,
                        NodeType.GENRE,
                        genre,
                        {"category": pattern.get("category", "general")}
                    )
                    
                    # Add preference edge
                    await self._add_edge(
                        user_id,
                        RelationType.PREFERS,
                        genre_id,
                        success_rate,
                        frequency,
                        {"last_updated": datetime.utcnow().isoformat()}
                    )
                    
                    genre_scores[genre] = success_rate * frequency
                
                if platform:
                    # Add platform node
                    platform_id = f"platform_{platform}"
                    self._add_node(
                        platform_id,
                        NodeType.PLATFORM,
                        platform,
                        {"type": pattern.get("platform_type", "streaming")}
                    )
                    
                    # Add preference edge
                    await self._add_edge(
                        user_id,
                        RelationType.PREFERS,
                        platform_id,
                        success_rate,
                        frequency,
                        {"last_updated": datetime.utcnow().isoformat()}
                    )
                    
                    platform_scores[platform] = success_rate * frequency
            
            # Calculate preference profile
            top_genres = sorted(
                genre_scores.items(),
                key=lambda x: x[1],
                reverse=True
            )[:5]
            
            top_platforms = sorted(
                platform_scores.items(),
                key=lambda x: x[1],
                reverse=True
            )[:3]
            
            # Generate recommendations based on preferences
            recommendations = await self._generate_preference_recommendations(
                user_id,
                top_genres,
                top_platforms
            )
            
            result = {
                "user_id": user_id,
                "top_genres": top_genres,
                "top_platforms": top_platforms,
                "preference_strength": np.mean(list(genre_scores.values())),
                "recommendations": recommendations
            }
            
            logger.debug(f"Tracked preferences for user {user_id}")
            return result
            
        except Exception as e:
            logger.error(f"Error tracking genre preferences: {e}")
            return {"error": str(e)}
    
    async def extract_industry_trends(
        self,
        decisions: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Extract industry trends from casting decisions.
        
        Args:
            decisions: List of casting decisions
            
        Returns:
            Trend analysis and insights
        """
        try:
            trends = {
                "genre_popularity": defaultdict(int),
                "skill_demand": defaultdict(int),
                "platform_growth": defaultdict(list),
                "collaboration_patterns": [],
                "emerging_talents": []
            }
            
            for decision in decisions:
                # Track genre trends
                genre = decision.get("genre")
                if genre:
                    trends["genre_popularity"][genre] += 1
                
                # Track skill demand
                required_skills = decision.get("required_skills", [])
                for skill in required_skills:
                    trends["skill_demand"][skill] += 1
                    
                    # Add skill node
                    skill_id = f"skill_{skill}"
                    self._add_node(
                        skill_id,
                        NodeType.SKILL,
                        skill,
                        {"category": decision.get("skill_category", "general")}
                    )
                
                # Track platform trends
                platform = decision.get("platform")
                if platform:
                    trends["platform_growth"][platform].append(
                        decision.get("timestamp", datetime.utcnow().isoformat())
                    )
            
            # Analyze collaboration patterns
            collab_patterns = self._analyze_collaboration_patterns()
            trends["collaboration_patterns"] = collab_patterns
            
            # Identify emerging talents
            emerging = await self._identify_emerging_talents()
            trends["emerging_talents"] = emerging
            
            # Calculate trend scores
            trend_analysis = {
                "hot_genres": sorted(
                    trends["genre_popularity"].items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:5],
                "in_demand_skills": sorted(
                    trends["skill_demand"].items(),
                    key=lambda x: x[1],
                    reverse=True
                )[:10],
                "platform_momentum": self._calculate_platform_momentum(
                    trends["platform_growth"]
                ),
                "collaboration_insights": collab_patterns[:5],
                "rising_stars": emerging[:10],
                "trend_timestamp": datetime.utcnow().isoformat()
            }
            
            logger.info("Extracted industry trends from decisions")
            return trend_analysis
            
        except Exception as e:
            logger.error(f"Error extracting industry trends: {e}")
            return {"error": str(e)}
    
    async def create_concept_map(
        self,
        domain_knowledge: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Create a concept map from domain knowledge.
        
        Args:
            domain_knowledge: Domain-specific knowledge
            
        Returns:
            Concept map structure
        """
        try:
            concepts = []
            relationships = []
            
            # Extract concepts
            for category, items in domain_knowledge.items():
                category_id = f"concept_{category}"
                
                # Add category as parent concept
                self._add_node(
                    category_id,
                    NodeType.SKILL,
                    category,
                    {"type": "category", "level": 0}
                )
                concepts.append(category_id)
                
                if isinstance(items, list):
                    for item in items:
                        item_id = f"concept_{category}_{item}"
                        
                        # Add item as child concept
                        self._add_node(
                            item_id,
                            NodeType.SKILL,
                            str(item),
                            {"type": "item", "level": 1}
                        )
                        concepts.append(item_id)
                        
                        # Link to parent category
                        await self._add_edge(
                            item_id,
                            RelationType.BELONGS_TO,
                            category_id,
                            1.0,
                            1,
                            {}
                        )
                        relationships.append({
                            "from": item_id,
                            "to": category_id,
                            "type": "belongs_to"
                        })
            
            # Find concept connections
            connections = self._find_concept_connections(concepts)
            
            concept_map = {
                "concepts": concepts,
                "relationships": relationships + connections,
                "hierarchy_depth": self._calculate_hierarchy_depth(),
                "central_concepts": self._find_central_concepts(concepts),
                "created_at": datetime.utcnow().isoformat()
            }
            
            logger.debug(f"Created concept map with {len(concepts)} concepts")
            return concept_map
            
        except Exception as e:
            logger.error(f"Error creating concept map: {e}")
            return {"error": str(e)}
    
    async def query_knowledge_graph(
        self,
        sparql_query: str
    ) -> List[Dict[str, Any]]:
        """
        Query the knowledge graph using SPARQL-like syntax.
        
        Args:
            sparql_query: SPARQL-like query string
            
        Returns:
            Query results
        """
        try:
            # Parse simple SPARQL-like queries
            # Format: "SELECT ?actor WHERE worked_with 'Shah Rukh Khan'"
            
            results = []
            
            # Simple pattern matching for demonstration
            if "worked_with" in sparql_query.lower():
                # Find all actors who worked with specified actor
                target = self._extract_quoted_string(sparql_query)
                if target:
                    target_nodes = [
                        n for n, d in self.graph.nodes(data=True)
                        if d.get('name', '').lower() == target.lower()
                    ]
                    
                    for node in target_nodes:
                        neighbors = list(self.graph.neighbors(node))
                        for neighbor in neighbors:
                            edge_data = self.graph.get_edge_data(node, neighbor)
                            if edge_data and edge_data.get('predicate') == RelationType.WORKED_WITH:
                                neighbor_data = self.graph.nodes[neighbor]
                                results.append({
                                    "actor": neighbor_data.get('name'),
                                    "confidence": edge_data.get('confidence', 0),
                                    "evidence_count": edge_data.get('evidence_count', 0)
                                })
            
            elif "prefers" in sparql_query.lower():
                # Find preferences for a user
                user_pattern = self._extract_pattern(sparql_query, "user")
                if user_pattern:
                    user_nodes = [
                        n for n, d in self.graph.nodes(data=True)
                        if user_pattern in n
                    ]
                    
                    for node in user_nodes:
                        edges = self.graph.out_edges(node, data=True)
                        for _, target, data in edges:
                            if data.get('predicate') == RelationType.PREFERS:
                                target_data = self.graph.nodes[target]
                                results.append({
                                    "preference": target_data.get('name'),
                                    "type": target_data.get('node_type'),
                                    "confidence": data.get('confidence', 0)
                                })
            
            # Sort by confidence
            results.sort(key=lambda x: x.get('confidence', 0), reverse=True)
            
            logger.debug(f"Query returned {len(results)} results")
            return results[:50]  # Limit to 50 results
            
        except Exception as e:
            logger.error(f"Error querying knowledge graph: {e}")
            return []
    
    async def update_knowledge_weights(
        self,
        feedback: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Update knowledge graph weights based on feedback.
        
        Args:
            feedback: User feedback on recommendations
            
        Returns:
            Update statistics
        """
        try:
            updates = {
                "edges_updated": 0,
                "confidence_increased": 0,
                "confidence_decreased": 0,
                "new_evidence": 0
            }
            
            for item in feedback.get("items", []):
                subject = item.get("subject")
                predicate = item.get("predicate")
                object_id = item.get("object")
                is_correct = item.get("correct", True)
                
                if subject and object_id:
                    # Find edge in graph
                    if self.graph.has_edge(subject, object_id):
                        edge_data = self.graph.get_edge_data(subject, object_id)
                        
                        # Update confidence based on feedback
                        current_confidence = edge_data.get('confidence', 0.5)
                        if is_correct:
                            new_confidence = min(1.0, current_confidence * 1.1)
                            updates["confidence_increased"] += 1
                        else:
                            new_confidence = max(0.1, current_confidence * 0.9)
                            updates["confidence_decreased"] += 1
                        
                        # Update edge
                        self.graph[subject][object_id]['confidence'] = new_confidence
                        self.graph[subject][object_id]['evidence_count'] += 1
                        self.graph[subject][object_id]['last_updated'] = datetime.utcnow()
                        
                        updates["edges_updated"] += 1
                        updates["new_evidence"] += 1
                        
                        # Persist to database
                        await self._update_edge_in_db(
                            subject,
                            predicate,
                            object_id,
                            new_confidence,
                            edge_data.get('evidence_count', 0) + 1
                        )
            
            logger.info(f"Updated knowledge weights: {updates}")
            return updates
            
        except Exception as e:
            logger.error(f"Error updating knowledge weights: {e}")
            return {"error": str(e)}
    
    def _add_node(
        self,
        node_id: str,
        node_type: NodeType,
        name: str,
        attributes: Dict[str, Any]
    ):
        """Add a node to the graph."""
        self.graph.add_node(
            node_id,
            node_type=node_type,
            name=name,
            attributes=attributes,
            created_at=datetime.utcnow()
        )
    
    async def _add_edge(
        self,
        subject: str,
        predicate: RelationType,
        object_id: str,
        confidence: float,
        evidence_count: int,
        metadata: Dict[str, Any]
    ):
        """Add an edge to the graph and persist to database."""
        try:
            # Add to in-memory graph
            self.graph.add_edge(
                subject,
                object_id,
                predicate=predicate,
                confidence=confidence,
                evidence_count=evidence_count,
                metadata=metadata,
                created_at=datetime.utcnow()
            )
            
            # Persist to database
            query = """
                INSERT INTO knowledge_graph (
                    id, subject_id, predicate, object_id,
                    confidence, evidence_count, metadata, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (subject_id, predicate, object_id)
                DO UPDATE SET
                    confidence = EXCLUDED.confidence,
                    evidence_count = EXCLUDED.evidence_count,
                    metadata = EXCLUDED.metadata
            """
            
            await self.db.execute(
                query,
                str(uuid.uuid4()),
                subject,
                predicate.value,
                object_id,
                confidence,
                evidence_count,
                json.dumps(metadata),
                datetime.utcnow()
            )
            
        except Exception as e:
            logger.error(f"Error adding edge: {e}")
    
    async def _load_graph_from_db(self):
        """Load existing knowledge graph from database."""
        try:
            query = """
                SELECT subject_id, predicate, object_id, confidence,
                       evidence_count, metadata
                FROM knowledge_graph
                WHERE confidence >= $1
            """
            
            rows = await self.db.fetch(query, self.confidence_threshold)
            
            for row in rows:
                # Add nodes if not exist
                if not self.graph.has_node(row['subject_id']):
                    self._add_node(
                        row['subject_id'],
                        NodeType.ACTOR,  # Default type
                        row['subject_id'],
                        {}
                    )
                
                if not self.graph.has_node(row['object_id']):
                    self._add_node(
                        row['object_id'],
                        NodeType.ACTOR,  # Default type
                        row['object_id'],
                        {}
                    )
                
                # Add edge
                self.graph.add_edge(
                    row['subject_id'],
                    row['object_id'],
                    predicate=RelationType(row['predicate']),
                    confidence=float(row['confidence']),
                    evidence_count=int(row['evidence_count']),
                    metadata=json.loads(row['metadata']) if row['metadata'] else {}
                )
            
            logger.info(f"Loaded {len(rows)} edges from database")
            
        except Exception as e:
            logger.error(f"Error loading graph from database: {e}")
    
    def _calculate_network_metrics(self) -> Dict[str, Any]:
        """Calculate network analysis metrics."""
        try:
            metrics = {
                "density": nx.density(self.graph),
                "avg_clustering": nx.average_clustering(self.graph.to_undirected()),
                "connected_components": nx.number_weakly_connected_components(self.graph),
                "avg_degree": np.mean([d for n, d in self.graph.degree()])
            }
            return metrics
        except:
            return {}
    
    def _find_influencers(self, top_k: int = 10) -> List[Dict[str, Any]]:
        """Find most influential nodes in the network."""
        try:
            # Calculate PageRank
            pagerank = nx.pagerank(self.graph, alpha=0.85)
            
            # Sort by PageRank score
            sorted_nodes = sorted(
                pagerank.items(),
                key=lambda x: x[1],
                reverse=True
            )[:top_k]
            
            influencers = []
            for node_id, score in sorted_nodes:
                node_data = self.graph.nodes[node_id]
                influencers.append({
                    "id": node_id,
                    "name": node_data.get('name'),
                    "type": node_data.get('node_type'),
                    "influence_score": score
                })
            
            return influencers
            
        except Exception as e:
            logger.error(f"Error finding influencers: {e}")
            return []
    
    def _detect_communities(self) -> List[Dict[str, Any]]:
        """Detect communities in the network."""
        try:
            # Use Louvain method for community detection
            import community.community_louvain as community_louvain
            
            # Convert to undirected for community detection
            undirected = self.graph.to_undirected()
            
            # Detect communities
            partition = community_louvain.best_partition(undirected)
            
            # Group nodes by community
            communities = defaultdict(list)
            for node, comm_id in partition.items():
                communities[comm_id].append(node)
            
            # Format results
            result = []
            for comm_id, nodes in communities.items():
                result.append({
                    "community_id": comm_id,
                    "size": len(nodes),
                    "members": nodes[:10]  # Limit to 10 members
                })
            
            return sorted(result, key=lambda x: x['size'], reverse=True)
            
        except Exception as e:
            logger.debug(f"Community detection not available: {e}")
            return []
    
    async def _generate_preference_recommendations(
        self,
        user_id: str,
        top_genres: List[Tuple[str, float]],
        top_platforms: List[Tuple[str, float]]
    ) -> List[Dict[str, Any]]:
        """Generate recommendations based on preferences."""
        recommendations = []
        
        # Find actors who work in preferred genres
        for genre, score in top_genres[:3]:
            genre_id = f"genre_{genre}"
            
            if self.graph.has_node(genre_id):
                # Find actors connected to this genre
                for node in self.graph.predecessors(genre_id):
                    node_data = self.graph.nodes[node]
                    if node_data.get('node_type') == NodeType.ACTOR:
                        recommendations.append({
                            "type": "actor",
                            "name": node_data.get('name'),
                            "reason": f"Specializes in {genre}",
                            "confidence": score
                        })
        
        return recommendations[:10]
    
    def _extract_quoted_string(self, query: str) -> Optional[str]:
        """Extract quoted string from query."""
        import re
        match = re.search(r"'([^']*)'", query)
        return match.group(1) if match else None
    
    def _extract_pattern(self, query: str, pattern: str) -> Optional[str]:
        """Extract pattern from query."""
        if pattern in query.lower():
            parts = query.lower().split(pattern)
            if len(parts) > 1:
                return parts[1].strip().split()[0]
        return None
    
    async def _update_edge_in_db(
        self,
        subject: str,
        predicate: RelationType,
        object_id: str,
        confidence: float,
        evidence_count: int
    ):
        """Update edge in database."""
        try:
            query = """
                UPDATE knowledge_graph
                SET confidence = $1, evidence_count = $2
                WHERE subject_id = $3 AND predicate = $4 AND object_id = $5
            """
            
            await self.db.execute(
                query,
                confidence,
                evidence_count,
                subject,
                predicate.value if isinstance(predicate, RelationType) else predicate,
                object_id
            )
            
        except Exception as e:
            logger.error(f"Error updating edge in database: {e}")
    
    async def _identify_emerging_talents(self) -> List[Dict[str, Any]]:
        """Identify emerging talents based on graph patterns."""
        emerging = []
        
        try:
            # Find actors with rapidly increasing connections
            for node, data in self.graph.nodes(data=True):
                if data.get('node_type') == NodeType.ACTOR:
                    # Check recent edge additions
                    recent_edges = 0
                    for _, _, edge_data in self.graph.edges(node, data=True):
                        if edge_data.get('created_at'):
                            created = edge_data['created_at']
                            if isinstance(created, datetime):
                                if (datetime.utcnow() - created).days < 30:
                                    recent_edges += 1
                    
                    if recent_edges > 3:
                        emerging.append({
                            "id": node,
                            "name": data.get('name'),
                            "recent_connections": recent_edges
                        })
            
            # Sort by recent connections
            emerging.sort(key=lambda x: x['recent_connections'], reverse=True)
            
        except Exception as e:
            logger.error(f"Error identifying emerging talents: {e}")
        
        return emerging[:20]
    
    def _calculate_platform_momentum(
        self,
        platform_growth: Dict[str, List[str]]
    ) -> List[Dict[str, Any]]:
        """Calculate momentum for different platforms."""
        momentum = []
        
        for platform, timestamps in platform_growth.items():
            if len(timestamps) > 1:
                # Calculate growth rate
                recent = len([t for t in timestamps[-10:]])
                older = len(timestamps[:-10]) if len(timestamps) > 10 else 1
                growth_rate = recent / max(older, 1)
                
                momentum.append({
                    "platform": platform,
                    "total_projects": len(timestamps),
                    "recent_projects": recent,
                    "growth_rate": growth_rate
                })
        
        return sorted(momentum, key=lambda x: x['growth_rate'], reverse=True)
    
    def _find_concept_connections(self, concepts: List[str]) -> List[Dict[str, Any]]:
        """Find connections between concepts."""
        connections = []
        
        # Find paths between concepts
        for i, concept1 in enumerate(concepts):
            for concept2 in concepts[i+1:]:
                if self.graph.has_node(concept1) and self.graph.has_node(concept2):
                    try:
                        if nx.has_path(self.graph, concept1, concept2):
                            path_length = nx.shortest_path_length(
                                self.graph, concept1, concept2
                            )
                            if path_length <= 3:  # Only close connections
                                connections.append({
                                    "from": concept1,
                                    "to": concept2,
                                    "type": "related",
                                    "distance": path_length
                                })
                    except:
                        pass
        
        return connections
    
    def _calculate_hierarchy_depth(self) -> int:
        """Calculate maximum depth of concept hierarchy."""
        try:
            # Find longest path in the graph
            longest = 0
            for node in self.graph.nodes():
                try:
                    lengths = nx.single_source_shortest_path_length(self.graph, node)
                    max_length = max(lengths.values())
                    longest = max(longest, max_length)
                except:
                    pass
            return longest
        except:
            return 0
    
    def _find_central_concepts(self, concepts: List[str]) -> List[str]:
        """Find most central concepts in the map."""
        try:
            # Calculate betweenness centrality
            centrality = nx.betweenness_centrality(self.graph)
            
            # Filter to only provided concepts
            concept_centrality = {
                c: centrality.get(c, 0) for c in concepts
                if c in centrality
            }
            
            # Sort by centrality
            sorted_concepts = sorted(
                concept_centrality.items(),
                key=lambda x: x[1],
                reverse=True
            )
            
            return [c[0] for c in sorted_concepts[:5]]
            
        except Exception as e:
            logger.error(f"Error finding central concepts: {e}")
            return []
    
    def _analyze_collaboration_patterns(self) -> List[Dict[str, Any]]:
        """Analyze collaboration patterns in the network."""
        patterns = []
        
        try:
            # Find triangles (3-way collaborations)
            triangles = list(nx.triangles(self.graph.to_undirected()).items())
            
            # Sort by number of triangles
            sorted_triangles = sorted(
                triangles,
                key=lambda x: x[1],
                reverse=True
            )[:10]
            
            for node, count in sorted_triangles:
                node_data = self.graph.nodes[node]
                patterns.append({
                    "node": node,
                    "name": node_data.get('name'),
                    "collaboration_count": count,
                    "type": "frequent_collaborator"
                })
            
        except Exception as e:
            logger.error(f"Error analyzing collaboration patterns: {e}")
        
        return patterns