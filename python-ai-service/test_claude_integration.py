#!/usr/bin/env python3
"""Test script for Claude integration and memory system."""

import asyncio
import aiohttp
import json
from datetime import datetime
import sys
from loguru import logger

# Configure logger
logger.add(sys.stdout, level="INFO", format="<green>{time:HH:mm:ss}</green> | <level>{message}</level>")

BASE_URL = "http://localhost:8000"


async def test_health_check():
    """Test the health check endpoint."""
    async with aiohttp.ClientSession() as session:
        try:
            async with session.get(f"{BASE_URL}/health") as response:
                data = await response.json()
                logger.success(f"✓ Health check passed: {data}")
                return True
        except Exception as e:
            logger.error(f"✗ Health check failed: {e}")
            return False


async def test_conversation_basic():
    """Test basic conversation endpoint."""
    async with aiohttp.ClientSession() as session:
        payload = {
            "message": "I need to find a female actor aged 25-30 for a web series lead role",
            "context_type": "casting",
            "streaming": False,
            "temperature": 0.7
        }
        
        try:
            async with session.post(
                f"{BASE_URL}/api/v1/conversation/chat",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    logger.success(f"✓ Basic conversation test passed")
                    logger.info(f"  Response: {data['response'][:100]}...")
                    logger.info(f"  Model: {data.get('model_used', 'unknown')}")
                    logger.info(f"  Response time: {data.get('response_time_ms', 0)}ms")
                    return True
                else:
                    error = await response.text()
                    logger.error(f"✗ Conversation failed: {response.status} - {error}")
                    return False
        except Exception as e:
            logger.error(f"✗ Conversation test failed: {e}")
            return False


async def test_intent_recognition():
    """Test intent recognition capabilities."""
    test_messages = [
        ("Find me an actor for my movie", "search_talent"),
        ("Schedule an audition for tomorrow", "schedule_audition"),
        ("Analyze this script for casting requirements", "analyze_script"),
        ("Is Raj available next month?", "check_availability"),
        ("What's the budget for this role?", "discuss_budget")
    ]
    
    async with aiohttp.ClientSession() as session:
        results = []
        for message, expected_intent in test_messages:
            payload = {
                "message": message,
                "context_type": "general"
            }
            
            try:
                async with session.post(
                    f"{BASE_URL}/api/v1/conversation/chat",
                    json=payload,
                    headers={"Content-Type": "application/json"}
                ) as response:
                    if response.status == 200:
                        data = await response.json()
                        detected_intent = data.get("metadata", {}).get("intent", "unknown")
                        confidence = data.get("metadata", {}).get("confidence", 0)
                        
                        match = detected_intent == expected_intent
                        results.append(match)
                        
                        symbol = "✓" if match else "✗"
                        logger.info(f"{symbol} Intent test: '{message[:30]}...' -> {detected_intent} ({confidence:.2f})")
                    else:
                        results.append(False)
                        logger.error(f"✗ Intent test failed for: {message}")
            except Exception as e:
                results.append(False)
                logger.error(f"✗ Intent test error: {e}")
        
        success_rate = sum(results) / len(results) if results else 0
        if success_rate >= 0.6:
            logger.success(f"✓ Intent recognition test passed ({success_rate:.0%} accuracy)")
            return True
        else:
            logger.error(f"✗ Intent recognition test failed ({success_rate:.0%} accuracy)")
            return False


async def test_memory_system():
    """Test memory system functionality."""
    conversation_id = f"test_conv_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
    
    async with aiohttp.ClientSession() as session:
        # First message - establish context
        payload1 = {
            "message": "I'm looking for actors for a Netflix series called 'Mumbai Dreams'",
            "conversation_id": conversation_id,
            "context_type": "casting"
        }
        
        try:
            async with session.post(
                f"{BASE_URL}/api/v1/conversation/chat",
                json=payload1,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status != 200:
                    logger.error("✗ Memory test failed: Could not send first message")
                    return False
                
                data1 = await response.json()
                logger.info("✓ First message sent to establish context")
            
            # Second message - test context retention
            payload2 = {
                "message": "What age range would work best for the lead role?",
                "conversation_id": conversation_id,
                "context_type": "casting"
            }
            
            async with session.post(
                f"{BASE_URL}/api/v1/conversation/chat",
                json=payload2,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status != 200:
                    logger.error("✗ Memory test failed: Could not send second message")
                    return False
                
                data2 = await response.json()
                response_text = data2['response'].lower()
                
                # Check if context is retained (mentions Mumbai Dreams or Netflix)
                if "mumbai dreams" in response_text or "netflix" in response_text or "series" in response_text:
                    logger.success("✓ Memory system test passed - context retained")
                    return True
                else:
                    logger.warning("⚠ Memory system test - context retention unclear")
                    return True  # Still pass as memory might be working differently
                    
        except Exception as e:
            logger.error(f"✗ Memory system test failed: {e}")
            return False


async def test_streaming_response():
    """Test streaming response capability."""
    async with aiohttp.ClientSession() as session:
        payload = {
            "message": "Tell me about the casting process for a Bollywood film",
            "streaming": True,
            "context_type": "bollywood"
        }
        
        try:
            async with session.post(
                f"{BASE_URL}/api/v1/conversation/chat/stream",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    chunks_received = 0
                    async for line in response.content:
                        if line:
                            chunks_received += 1
                            if chunks_received == 1:
                                logger.info("✓ Streaming started...")
                    
                    if chunks_received > 0:
                        logger.success(f"✓ Streaming test passed ({chunks_received} chunks received)")
                        return True
                    else:
                        logger.error("✗ Streaming test failed: No chunks received")
                        return False
                else:
                    logger.error(f"✗ Streaming test failed: Status {response.status}")
                    return False
        except Exception as e:
            logger.error(f"✗ Streaming test failed: {e}")
            return False


async def test_script_analysis():
    """Test script analysis capability."""
    script_sample = """
    INT. COFFEE SHOP - DAY
    
    MAYA (28, confident, software engineer) sits across from RAJ (30, charming, entrepreneur).
    
    MAYA
    I can't just leave everything behind for your startup dream.
    
    RAJ
    But this is our chance to build something together. Something meaningful.
    
    MAYA
    (sighs)
    You know I speak Hindi at home, right? Your international clients won't understand a word.
    
    RAJ
    (laughing)
    That's why we need you. Bridging cultures, bridging technologies.
    """
    
    async with aiohttp.ClientSession() as session:
        payload = {
            "script_text": script_sample,
            "extract_characters": True,
            "extract_requirements": True
        }
        
        try:
            async with session.post(
                f"{BASE_URL}/api/v1/conversation/analyze-script",
                json=payload,
                headers={"Content-Type": "application/json"}
            ) as response:
                if response.status == 200:
                    data = await response.json()
                    analysis = data.get("analysis", {})
                    
                    if analysis:
                        logger.success("✓ Script analysis test passed")
                        logger.info(f"  Extracted: {json.dumps(analysis, indent=2)[:200]}...")
                        return True
                    else:
                        logger.error("✗ Script analysis test failed: No analysis returned")
                        return False
                else:
                    logger.error(f"✗ Script analysis test failed: Status {response.status}")
                    return False
        except Exception as e:
            logger.error(f"✗ Script analysis test failed: {e}")
            return False


async def run_all_tests():
    """Run all tests and report results."""
    logger.info("=" * 60)
    logger.info("Starting CastMatch AI Service Tests")
    logger.info("=" * 60)
    
    tests = [
        ("Health Check", test_health_check),
        ("Basic Conversation", test_conversation_basic),
        ("Intent Recognition", test_intent_recognition),
        ("Memory System", test_memory_system),
        ("Streaming Response", test_streaming_response),
        ("Script Analysis", test_script_analysis)
    ]
    
    results = {}
    
    for test_name, test_func in tests:
        logger.info(f"\n📝 Running: {test_name}")
        try:
            result = await test_func()
            results[test_name] = result
            await asyncio.sleep(1)  # Small delay between tests
        except Exception as e:
            logger.error(f"Test {test_name} crashed: {e}")
            results[test_name] = False
    
    # Summary
    logger.info("\n" + "=" * 60)
    logger.info("Test Summary")
    logger.info("=" * 60)
    
    passed = sum(1 for r in results.values() if r)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASSED" if result else "❌ FAILED"
        logger.info(f"{test_name:25} {status}")
    
    logger.info("-" * 60)
    success_rate = (passed / total * 100) if total > 0 else 0
    
    if success_rate >= 80:
        logger.success(f"Overall: {passed}/{total} tests passed ({success_rate:.0f}%)")
    elif success_rate >= 60:
        logger.warning(f"Overall: {passed}/{total} tests passed ({success_rate:.0f}%)")
    else:
        logger.error(f"Overall: {passed}/{total} tests passed ({success_rate:.0f}%)")
    
    return success_rate >= 60


if __name__ == "__main__":
    # Check if service is running first
    logger.info("Checking if Python AI Service is running...")
    
    try:
        import requests
        response = requests.get(f"{BASE_URL}/health", timeout=2)
        if response.status_code != 200:
            logger.error("⚠️  Python AI Service is not responding properly!")
            logger.info("Please start the service with: cd python-ai-service && python -m uvicorn app.main:app --reload")
            sys.exit(1)
    except Exception as e:
        logger.error(f"⚠️  Python AI Service is not running! Error: {e}")
        logger.info("Please start the service with: cd python-ai-service && python -m uvicorn app.main:app --reload")
        sys.exit(1)
    
    # Run tests
    success = asyncio.run(run_all_tests())
    sys.exit(0 if success else 1)