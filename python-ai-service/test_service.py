"""Test script for the CastMatch AI Service."""

import asyncio
import httpx
import json
from datetime import datetime

# Service configuration
BASE_URL = "http://localhost:8000"
API_PREFIX = "/api/v1"


async def test_health():
    """Test health endpoint."""
    print("\n1. Testing Health Endpoint...")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/health")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200


async def test_root():
    """Test root endpoint."""
    print("\n2. Testing Root Endpoint...")
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{BASE_URL}/")
        print(f"Status: {response.status_code}")
        print(f"Response: {json.dumps(response.json(), indent=2)}")
        return response.status_code == 200


async def test_talent_search():
    """Test talent search endpoint."""
    print("\n3. Testing Talent Search...")
    
    search_criteria = {
        "gender": "FEMALE",
        "age_min": 20,
        "age_max": 30,
        "city": "Mumbai",
        "limit": 5
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}{API_PREFIX}/talents/search",
            json=search_criteria
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Found {data['total_count']} talents")
            if data['talents']:
                print("First talent:", json.dumps(data['talents'][0], indent=2))
        else:
            print(f"Error: {response.text}")
        return response.status_code == 200


async def test_chat():
    """Test AI chat endpoint."""
    print("\n4. Testing AI Chat...")
    
    chat_request = {
        "messages": [
            {
                "role": "user",
                "content": "I need a female actor in Mumbai, age 25-30, for a lead role in a web series."
            }
        ],
        "temperature": 0.7,
        "max_tokens": 500
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}{API_PREFIX}/chat",
            json=chat_request
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"AI Response: {data['message']['content'][:200]}...")
            if data.get('suggested_actions'):
                print(f"Suggested Actions: {data['suggested_actions']}")
        else:
            print(f"Error: {response.text}")
        return response.status_code == 200


async def test_recommendations():
    """Test talent recommendations endpoint."""
    print("\n5. Testing Talent Recommendations...")
    
    role_description = "Lead female role for a romantic web series. Age 25-30, must be fluent in Hindi and English. Dancing skills preferred."
    
    criteria = {
        "gender": "FEMALE",
        "age_min": 25,
        "age_max": 30,
        "languages": ["Hindi", "English"],
        "skills": ["Acting", "Dancing"],
        "limit": 3
    }
    
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{BASE_URL}{API_PREFIX}/talents/recommend",
            json={
                "role_description": role_description,
                "criteria": criteria
            }
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"Found {data['total_recommendations']} recommendations")
            if data['recommendations']:
                rec = data['recommendations'][0]
                print(f"Top Recommendation: {rec['talent']['first_name']} {rec['talent']['last_name']}")
                print(f"Match Score: {rec['match_score']}%")
                print(f"Reasons: {rec['match_reasons']}")
        else:
            print(f"Error: {response.text}")
        return response.status_code == 200


async def main():
    """Run all tests."""
    print("=" * 50)
    print("CastMatch AI Service Test Suite")
    print("=" * 50)
    
    # Wait for service to be ready
    print("\nWaiting for service to start...")
    await asyncio.sleep(2)
    
    # Run tests
    tests = [
        ("Health Check", test_health),
        ("Root Endpoint", test_root),
        ("Talent Search", test_talent_search),
        ("AI Chat", test_chat),
        ("Recommendations", test_recommendations)
    ]
    
    results = []
    for test_name, test_func in tests:
        try:
            success = await test_func()
            results.append((test_name, success))
        except Exception as e:
            print(f"\nError in {test_name}: {e}")
            results.append((test_name, False))
    
    # Print summary
    print("\n" + "=" * 50)
    print("Test Summary")
    print("=" * 50)
    
    for test_name, success in results:
        status = "✅ PASSED" if success else "❌ FAILED"
        print(f"{test_name}: {status}")
    
    passed = sum(1 for _, success in results if success)
    total = len(results)
    print(f"\nTotal: {passed}/{total} tests passed")
    
    return passed == total


if __name__ == "__main__":
    try:
        success = asyncio.run(main())
        exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\nTests interrupted by user")
        exit(1)
    except Exception as e:
        print(f"\n\nTest suite failed: {e}")
        exit(1)