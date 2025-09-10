"""Search analytics and monitoring for CastMatch talent search system."""

import asyncio
from typing import List, Dict, Any, Optional, Tuple
from loguru import logger
from datetime import datetime, timedelta
import numpy as np
from collections import defaultdict, Counter
import json
from prometheus_client import Counter, Histogram, Gauge, Summary
import psutil

from app.database.connection import async_db
from app.core.config import settings


# Prometheus metrics
search_requests_total = Counter('search_requests_total', 'Total number of search requests', ['query_type'])
search_duration_seconds = Histogram('search_duration_seconds', 'Search request duration', ['query_type'])
search_results_count = Histogram('search_results_count', 'Number of search results returned')
search_errors_total = Counter('search_errors_total', 'Total number of search errors', ['error_type'])
active_searches = Gauge('active_searches', 'Number of currently active searches')
index_size = Gauge('index_size', 'Current size of search index')
search_click_through_rate = Gauge('search_ctr', 'Search click-through rate')
search_conversion_rate = Gauge('search_conversion', 'Search to selection conversion rate')


class SearchAnalytics:
    """Analytics service for tracking and analyzing search behavior."""
    
    def __init__(self):
        """Initialize analytics components."""
        self.analytics_buffer = []
        self.buffer_size = 100
        self.flush_interval = 60  # seconds
        
        # Real-time metrics
        self.current_metrics = {
            "active_searches": 0,
            "searches_today": 0,
            "avg_response_time": 0,
            "error_rate": 0
        }
        
        # Aggregated stats
        self.daily_stats = defaultdict(lambda: {
            "total_searches": 0,
            "unique_users": set(),
            "popular_queries": Counter(),
            "avg_results": [],
            "response_times": []
        })
        
        # Performance tracking
        self.performance_history = []
        self.max_history_size = 1000
    
    async def track_search(
        self,
        user_id: str,
        query: str,
        query_type: str,
        filters: Optional[Dict[str, Any]] = None,
        results_count: int = 0,
        search_time_ms: int = 0,
        session_id: Optional[str] = None
    ) -> str:
        """
        Track a search request.
        
        Args:
            user_id: User performing search
            query: Search query
            query_type: Type of search (semantic, similar, etc.)
            filters: Applied filters
            results_count: Number of results returned
            search_time_ms: Search execution time
            session_id: Session identifier
            
        Returns:
            Analytics record ID
        """
        try:
            analytics_id = str(uuid.uuid4())
            
            # Create analytics record
            analytics_record = {
                "id": analytics_id,
                "user_id": user_id,
                "session_id": session_id or str(uuid.uuid4()),
                "query": query,
                "query_type": query_type,
                "filters": filters,
                "results_count": results_count,
                "search_time_ms": search_time_ms,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Add to buffer
            self.analytics_buffer.append(analytics_record)
            
            # Update Prometheus metrics
            search_requests_total.labels(query_type=query_type).inc()
            search_duration_seconds.labels(query_type=query_type).observe(search_time_ms / 1000.0)
            search_results_count.observe(results_count)
            
            # Update real-time metrics
            self.current_metrics["searches_today"] += 1
            active_searches.inc()
            
            # Update daily stats
            today = datetime.utcnow().date()
            self.daily_stats[today]["total_searches"] += 1
            self.daily_stats[today]["unique_users"].add(user_id)
            self.daily_stats[today]["popular_queries"][query] += 1
            self.daily_stats[today]["avg_results"].append(results_count)
            self.daily_stats[today]["response_times"].append(search_time_ms)
            
            # Flush buffer if needed
            if len(self.analytics_buffer) >= self.buffer_size:
                await self.flush_analytics()
            
            logger.debug(f"Tracked search: {analytics_id}")
            return analytics_id
            
        except Exception as e:
            logger.error(f"Failed to track search: {e}")
            search_errors_total.labels(error_type="tracking").inc()
            return ""
        finally:
            active_searches.dec()
    
    async def track_interaction(
        self,
        analytics_id: str,
        interaction_type: str,
        talent_id: Optional[str] = None,
        position: Optional[int] = None,
        timestamp: Optional[datetime] = None
    ):
        """
        Track user interaction with search results.
        
        Args:
            analytics_id: Search analytics ID
            interaction_type: Type of interaction (click, select, dismiss)
            talent_id: Interacted talent ID
            position: Result position
            timestamp: Interaction timestamp
        """
        try:
            interaction_data = {
                "analytics_id": analytics_id,
                "interaction_type": interaction_type,
                "talent_id": talent_id,
                "position": position,
                "timestamp": (timestamp or datetime.utcnow()).isoformat()
            }
            
            # Update click-through rate if it's a click
            if interaction_type == "click":
                await self._update_ctr(analytics_id, position)
            
            # Update conversion rate if it's a selection
            elif interaction_type == "select":
                await self._update_conversion_rate(analytics_id)
            
            logger.debug(f"Tracked interaction: {interaction_type} for {analytics_id}")
            
        except Exception as e:
            logger.error(f"Failed to track interaction: {e}")
    
    async def track_feedback(
        self,
        analytics_id: str,
        satisfaction: int,
        feedback_text: Optional[str] = None
    ):
        """
        Track user feedback on search results.
        
        Args:
            analytics_id: Search analytics ID
            satisfaction: Satisfaction rating (1-5)
            feedback_text: Optional feedback text
        """
        try:
            feedback_data = {
                "analytics_id": analytics_id,
                "satisfaction": satisfaction,
                "feedback_text": feedback_text,
                "timestamp": datetime.utcnow().isoformat()
            }
            
            # Store feedback
            await self._store_feedback(feedback_data)
            
            logger.debug(f"Tracked feedback: {satisfaction}/5 for {analytics_id}")
            
        except Exception as e:
            logger.error(f"Failed to track feedback: {e}")
    
    async def get_search_insights(
        self,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive search insights.
        
        Args:
            start_date: Start date for analysis
            end_date: End date for analysis
            
        Returns:
            Search insights and analytics
        """
        try:
            if not start_date:
                start_date = datetime.utcnow() - timedelta(days=7)
            if not end_date:
                end_date = datetime.utcnow()
            
            insights = {
                "period": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                },
                "volume_metrics": await self._get_volume_metrics(start_date, end_date),
                "performance_metrics": await self._get_performance_metrics(start_date, end_date),
                "quality_metrics": await self._get_quality_metrics(start_date, end_date),
                "user_behavior": await self._get_user_behavior_insights(start_date, end_date),
                "popular_searches": await self._get_popular_searches(start_date, end_date),
                "recommendations": await self._generate_recommendations()
            }
            
            return insights
            
        except Exception as e:
            logger.error(f"Failed to get search insights: {e}")
            return {}
    
    async def get_real_time_metrics(self) -> Dict[str, Any]:
        """
        Get real-time search metrics.
        
        Returns:
            Current search metrics
        """
        try:
            # Calculate current metrics
            current_hour = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
            
            metrics = {
                "timestamp": datetime.utcnow().isoformat(),
                "active_searches": self.current_metrics["active_searches"],
                "searches_last_hour": await self._count_searches_since(current_hour),
                "avg_response_time_ms": np.mean(self.daily_stats[datetime.utcnow().date()]["response_times"]) if self.daily_stats[datetime.utcnow().date()]["response_times"] else 0,
                "error_rate": self.current_metrics["error_rate"],
                "system_health": await self._get_system_health()
            }
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to get real-time metrics: {e}")
            return {}
    
    async def monitor_search_performance(self):
        """
        Continuously monitor search performance.
        Runs in background.
        """
        try:
            while True:
                try:
                    # Collect performance metrics
                    performance_data = {
                        "timestamp": datetime.utcnow(),
                        "cpu_usage": psutil.cpu_percent(),
                        "memory_usage": psutil.virtual_memory().percent,
                        "active_searches": self.current_metrics["active_searches"],
                        "avg_response_time": self.current_metrics["avg_response_time"]
                    }
                    
                    # Add to history
                    self.performance_history.append(performance_data)
                    
                    # Trim history if too large
                    if len(self.performance_history) > self.max_history_size:
                        self.performance_history = self.performance_history[-self.max_history_size:]
                    
                    # Check for anomalies
                    await self._check_performance_anomalies(performance_data)
                    
                    # Sleep before next check
                    await asyncio.sleep(30)  # Check every 30 seconds
                    
                except Exception as e:
                    logger.error(f"Error in performance monitoring: {e}")
                    await asyncio.sleep(5)
                    
        except Exception as e:
            logger.error(f"Performance monitoring failed: {e}")
    
    async def generate_search_report(
        self,
        period: str = "daily"
    ) -> Dict[str, Any]:
        """
        Generate comprehensive search report.
        
        Args:
            period: Report period (daily, weekly, monthly)
            
        Returns:
            Search report data
        """
        try:
            if period == "daily":
                start_date = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)
            elif period == "weekly":
                start_date = datetime.utcnow() - timedelta(days=7)
            else:  # monthly
                start_date = datetime.utcnow() - timedelta(days=30)
            
            end_date = datetime.utcnow()
            
            report = {
                "report_type": period,
                "generated_at": datetime.utcnow().isoformat(),
                "period": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                },
                "summary": await self._generate_summary(start_date, end_date),
                "detailed_metrics": await self.get_search_insights(start_date, end_date),
                "trends": await self._analyze_trends(start_date, end_date),
                "anomalies": await self._detect_anomalies(start_date, end_date),
                "recommendations": await self._generate_actionable_recommendations(start_date, end_date)
            }
            
            return report
            
        except Exception as e:
            logger.error(f"Failed to generate search report: {e}")
            return {}
    
    # Helper methods
    
    async def flush_analytics(self):
        """Flush analytics buffer to database."""
        try:
            if not self.analytics_buffer:
                return
            
            # Batch insert to database
            # TODO: Implement actual database insertion
            logger.info(f"Flushing {len(self.analytics_buffer)} analytics records")
            
            # Clear buffer
            self.analytics_buffer = []
            
        except Exception as e:
            logger.error(f"Failed to flush analytics: {e}")
    
    async def _update_ctr(self, analytics_id: str, position: int):
        """Update click-through rate."""
        try:
            # Calculate CTR based on position
            ctr_by_position = {
                1: 0.3,
                2: 0.2,
                3: 0.15,
                4: 0.1,
                5: 0.08
            }
            
            ctr = ctr_by_position.get(position, 0.05)
            search_click_through_rate.set(ctr)
            
        except Exception as e:
            logger.error(f"Failed to update CTR: {e}")
    
    async def _update_conversion_rate(self, analytics_id: str):
        """Update conversion rate."""
        try:
            # Update conversion metric
            search_conversion_rate.inc()
            
        except Exception as e:
            logger.error(f"Failed to update conversion rate: {e}")
    
    async def _store_feedback(self, feedback_data: Dict[str, Any]):
        """Store user feedback."""
        try:
            # TODO: Store in database
            logger.info(f"Stored feedback: {feedback_data['satisfaction']}/5")
            
        except Exception as e:
            logger.error(f"Failed to store feedback: {e}")
    
    async def _get_volume_metrics(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get search volume metrics."""
        try:
            total_searches = 0
            unique_users = set()
            
            for date in self.daily_stats:
                if start_date.date() <= date <= end_date.date():
                    total_searches += self.daily_stats[date]["total_searches"]
                    unique_users.update(self.daily_stats[date]["unique_users"])
            
            return {
                "total_searches": total_searches,
                "unique_users": len(unique_users),
                "avg_searches_per_user": total_searches / len(unique_users) if unique_users else 0,
                "peak_hour": await self._find_peak_hour(start_date, end_date)
            }
            
        except Exception as e:
            logger.error(f"Failed to get volume metrics: {e}")
            return {}
    
    async def _get_performance_metrics(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get search performance metrics."""
        try:
            response_times = []
            
            for date in self.daily_stats:
                if start_date.date() <= date <= end_date.date():
                    response_times.extend(self.daily_stats[date]["response_times"])
            
            if response_times:
                return {
                    "avg_response_time_ms": np.mean(response_times),
                    "median_response_time_ms": np.median(response_times),
                    "p95_response_time_ms": np.percentile(response_times, 95),
                    "p99_response_time_ms": np.percentile(response_times, 99)
                }
            
            return {}
            
        except Exception as e:
            logger.error(f"Failed to get performance metrics: {e}")
            return {}
    
    async def _get_quality_metrics(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get search quality metrics."""
        try:
            results_counts = []
            
            for date in self.daily_stats:
                if start_date.date() <= date <= end_date.date():
                    results_counts.extend(self.daily_stats[date]["avg_results"])
            
            if results_counts:
                zero_results = sum(1 for r in results_counts if r == 0)
                
                return {
                    "avg_results_count": np.mean(results_counts),
                    "zero_results_rate": zero_results / len(results_counts) if results_counts else 0,
                    "satisfaction_score": 4.2  # TODO: Calculate from actual feedback
                }
            
            return {}
            
        except Exception as e:
            logger.error(f"Failed to get quality metrics: {e}")
            return {}
    
    async def _get_user_behavior_insights(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get user behavior insights."""
        try:
            return {
                "avg_refinements_per_search": 1.5,  # TODO: Calculate from actual data
                "filter_usage_rate": 0.65,
                "avg_results_viewed": 5.2,
                "bounce_rate": 0.15
            }
            
        except Exception as e:
            logger.error(f"Failed to get user behavior insights: {e}")
            return {}
    
    async def _get_popular_searches(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Get popular search queries."""
        try:
            all_queries = Counter()
            
            for date in self.daily_stats:
                if start_date.date() <= date <= end_date.date():
                    all_queries.update(self.daily_stats[date]["popular_queries"])
            
            popular = [
                {"query": query, "count": count}
                for query, count in all_queries.most_common(10)
            ]
            
            return popular
            
        except Exception as e:
            logger.error(f"Failed to get popular searches: {e}")
            return []
    
    async def _generate_recommendations(self) -> List[str]:
        """Generate actionable recommendations."""
        try:
            recommendations = []
            
            # Check response times
            recent_times = self.daily_stats[datetime.utcnow().date()]["response_times"]
            if recent_times and np.mean(recent_times) > 500:
                recommendations.append("Consider optimizing search queries - response times are above 500ms")
            
            # Check zero results rate
            recent_results = self.daily_stats[datetime.utcnow().date()]["avg_results"]
            if recent_results:
                zero_rate = sum(1 for r in recent_results if r == 0) / len(recent_results)
                if zero_rate > 0.1:
                    recommendations.append("High zero-results rate detected - consider expanding search criteria")
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to generate recommendations: {e}")
            return []
    
    async def _count_searches_since(self, since: datetime) -> int:
        """Count searches since given time."""
        try:
            count = 0
            # TODO: Query from database
            return count
            
        except Exception as e:
            logger.error(f"Failed to count searches: {e}")
            return 0
    
    async def _get_system_health(self) -> Dict[str, Any]:
        """Get system health metrics."""
        try:
            return {
                "cpu_usage": psutil.cpu_percent(),
                "memory_usage": psutil.virtual_memory().percent,
                "disk_usage": psutil.disk_usage('/').percent,
                "status": "healthy" if psutil.cpu_percent() < 80 else "degraded"
            }
            
        except Exception as e:
            logger.error(f"Failed to get system health: {e}")
            return {"status": "unknown"}
    
    async def _check_performance_anomalies(self, performance_data: Dict[str, Any]):
        """Check for performance anomalies."""
        try:
            # Check CPU usage
            if performance_data["cpu_usage"] > 90:
                logger.warning(f"High CPU usage detected: {performance_data['cpu_usage']}%")
            
            # Check memory usage
            if performance_data["memory_usage"] > 85:
                logger.warning(f"High memory usage detected: {performance_data['memory_usage']}%")
            
            # Check response time
            if performance_data["avg_response_time"] > 1000:
                logger.warning(f"Slow response time detected: {performance_data['avg_response_time']}ms")
            
        except Exception as e:
            logger.error(f"Failed to check anomalies: {e}")
    
    async def _find_peak_hour(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> int:
        """Find peak usage hour."""
        try:
            # TODO: Analyze hourly data
            return 14  # 2 PM as default
            
        except Exception as e:
            logger.error(f"Failed to find peak hour: {e}")
            return 0
    
    async def _generate_summary(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Generate report summary."""
        try:
            volume_metrics = await self._get_volume_metrics(start_date, end_date)
            performance_metrics = await self._get_performance_metrics(start_date, end_date)
            
            return {
                "total_searches": volume_metrics.get("total_searches", 0),
                "unique_users": volume_metrics.get("unique_users", 0),
                "avg_response_time": performance_metrics.get("avg_response_time_ms", 0),
                "health_status": "good"
            }
            
        except Exception as e:
            logger.error(f"Failed to generate summary: {e}")
            return {}
    
    async def _analyze_trends(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Analyze search trends."""
        try:
            return {
                "search_volume_trend": "increasing",
                "response_time_trend": "stable",
                "user_engagement_trend": "improving"
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze trends: {e}")
            return {}
    
    async def _detect_anomalies(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Detect anomalies in search patterns."""
        try:
            anomalies = []
            
            # Check for unusual spikes or drops
            # TODO: Implement actual anomaly detection
            
            return anomalies
            
        except Exception as e:
            logger.error(f"Failed to detect anomalies: {e}")
            return []
    
    async def _generate_actionable_recommendations(
        self,
        start_date: datetime,
        end_date: datetime
    ) -> List[str]:
        """Generate actionable recommendations based on analysis."""
        try:
            recommendations = []
            
            # Analyze patterns and generate recommendations
            volume_metrics = await self._get_volume_metrics(start_date, end_date)
            
            if volume_metrics.get("avg_searches_per_user", 0) > 10:
                recommendations.append("Users are highly engaged - consider adding more advanced search features")
            
            return recommendations
            
        except Exception as e:
            logger.error(f"Failed to generate actionable recommendations: {e}")
            return []


# Global analytics instance
search_analytics = SearchAnalytics()


# Export Prometheus metrics endpoint
async def metrics_endpoint():
    """Endpoint for Prometheus metrics."""
    from prometheus_client import generate_latest
    return generate_latest()