#!/bin/bash

# Test script to verify the anti-spoofing system is working correctly

echo "🧪 Testing Anti-Spoofing System"
echo "================================"

# Check if Docker Compose is running
echo "📋 Checking Docker Compose status..."
if ! docker-compose ps | grep -q "Up"; then
    echo "❌ Docker Compose services are not running. Please run 'docker-compose up --build' first."
    exit 1
fi

echo "✅ Docker Compose services are running"

# Wait for services to be ready
echo "⏳ Waiting for services to be ready..."
sleep 10

# Test health endpoints
echo "🏥 Testing health endpoints..."

echo "  📡 Testing ML Model health..."
ML_HEALTH=$(curl -s http://localhost:8000/health)
if echo "$ML_HEALTH" | grep -q "healthy"; then
    echo "  ✅ ML Model service is healthy"
else
    echo "  ❌ ML Model service is not healthy: $ML_HEALTH"
fi

echo "  🗄️ Testing Database health..."
DB_HEALTH=$(curl -s http://localhost:8001/health)
if echo "$DB_HEALTH" | grep -q "healthy"; then
    echo "  ✅ Database service is healthy"
else
    echo "  ❌ Database service is not healthy: $DB_HEALTH"
fi

echo "  🌐 Testing UI accessibility..."
UI_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:5000)
if [ "$UI_STATUS" = "200" ]; then
    echo "  ✅ UI service is accessible"
else
    echo "  ❌ UI service is not accessible (HTTP $UI_STATUS)"
fi

# Test API endpoints
echo "🔧 Testing API endpoints..."

echo "  📝 Testing getAllUsers endpoint..."
USERS_RESPONSE=$(curl -s http://localhost:8001/getAllUsers)
if echo "$USERS_RESPONSE" | grep -q "user_names"; then
    echo "  ✅ getAllUsers endpoint is working"
    echo "  📊 Current users: $USERS_RESPONSE"
else
    echo "  ❌ getAllUsers endpoint failed: $USERS_RESPONSE"
fi

# Check if a test image exists for testing
TEST_IMAGE_PATH="test_face.jpg"
if [ ! -f "$TEST_IMAGE_PATH" ]; then
    echo "  ⚠️ No test image found at $TEST_IMAGE_PATH. Skipping addUser test."
    echo "  💡 To test addUser functionality, place a face image at $TEST_IMAGE_PATH and run this script again."
else
    echo "  🖼️ Testing addUser endpoint with $TEST_IMAGE_PATH..."
    ADD_USER_RESPONSE=$(curl -s -X POST "http://localhost:8001/addUser" \
        -H "Content-Type: multipart/form-data" \
        -F "user_name=test_user_$(date +%s)" \
        -F "image=@$TEST_IMAGE_PATH")
    
    if echo "$ADD_USER_RESPONSE" | grep -q "is_saved"; then
        echo "  ✅ addUser endpoint is working"
        echo "  📊 Response: $ADD_USER_RESPONSE"
    else
        echo "  ❌ addUser endpoint failed: $ADD_USER_RESPONSE"
    fi
fi

echo ""
echo "🎉 Testing completed!"
echo ""
echo "📋 Summary:"
echo "  - ML Model Service: http://localhost:8000/docs"
echo "  - Database Service: http://localhost:8001/docs"
echo "  - UI Application: http://localhost:5000"
echo ""
echo "🔍 To check logs if there are issues:"
echo "  docker-compose logs ml-model"
echo "  docker-compose logs database"
echo "  docker-compose logs ui"
echo ""
echo "🧹 To restart with clean database:"
echo "  docker-compose down"
echo "  docker volume rm deploy_anti_spoofing_db-data"
echo "  docker-compose up --build"
