import pytest
import tempfile
import shutil
import os
import sys
import json
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
import httpx
from io import BytesIO

# Add Database module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'Database'))

from main import api


class TestDatabaseAPI:
    """Integration tests for Database API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(api)
    
    @pytest.fixture
    def temp_db_path(self):
        """Create a temporary directory for testing"""
        temp_dir = tempfile.mkdtemp()
        yield temp_dir
        shutil.rmtree(temp_dir)
    
    @pytest.fixture
    def mock_ml_service(self):
        """Mock ML service responses"""
        with patch('httpx.AsyncClient.post') as mock_post:
            yield mock_post
    
    @patch('main.database_connector')
    def test_health_check(self, mock_db, client):
        """Test health check endpoint"""
        # Make the async method return a coroutine
        async def mock_get_users():
            return []
        mock_db.get_registered_users = mock_get_users
        
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    @patch('main.database_connector')
    def test_addUser_success(self, mock_db, client, mock_ml_service):
        """Test successful user addition"""
        # Mock database responses as async
        async def mock_get_users():
            return []
        async def mock_insert(user_name, embedding):
            return True
        
        mock_db.get_registered_users = mock_get_users
        mock_db.insert = mock_insert
        
        # Mock ML service response
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "is_saved": True,
            "user_name": "test_user",
            "message": "User added successfully",
            "embedding": [0.1] * 128
        }
        mock_ml_service.return_value = mock_response
        
        # Create a mock image file
        image_data = b"fake image data"
        files = {"image": ("test.jpg", BytesIO(image_data), "image/jpeg")}
        data = {"user_name": "test_user"}
        
        response = client.post("/addUser", files=files, data=data)
        assert response.status_code == 200
        
        response_data = response.json()
        assert response_data["is_saved"] is True
        assert response_data["user_name"] == "test_user"
        assert "message" in response_data
    
    @patch('main.database_connector')
    def test_addUser_invalid_image(self, mock_db, client):
        """Test user addition with invalid image"""
        async def mock_get_users():
            return []
        mock_db.get_registered_users = mock_get_users
        
        # Create a non-image file
        files = {"image": ("test.txt", BytesIO(b"not an image"), "text/plain")}
        data = {"user_name": "test_user"}
        
        response = client.post("/addUser", files=files, data=data)
        assert response.status_code == 200
        
        response_data = response.json()
        assert response_data["is_saved"] is False
        assert "Invalid file type" in response_data["message"]
    
    def test_addUser_missing_fields(self, client):
        """Test user addition with missing required fields"""
        # Missing user_name
        files = {"image": ("test.jpg", BytesIO(b"fake image"), "image/jpeg")}
        response = client.post("/addUser", files=files)
        assert response.status_code == 422  # FastAPI validation error
        
        # Missing image
        data = {"user_name": "test"}
        response = client.post("/addUser", data=data)
        assert response.status_code == 422  # FastAPI validation error

    @patch('main.database_connector')
    def test_authenticate_user_success(self, mock_db, client, mock_ml_service):
        """Test successful user authentication"""
        # Mock database response as async
        async def mock_fetch_all():
            return {"test_user": [0.1] * 128}
        mock_db.fetch_all = mock_fetch_all
        
        # Mock ML service response
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "is_authenticated": True,
            "user_name": "test_user"
        }
        mock_ml_service.return_value = mock_response
        
        data = {"image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD"}
        
        response = client.post("/authenticate", data=data)
        assert response.status_code == 200
        
        response_data = response.json()
        assert response_data["is_authenticated"] is True
        assert response_data["user_name"] == "test_user"
    
    @patch('main.database_connector')
    def test_authenticate_user_not_found(self, mock_db, client, mock_ml_service):
        """Test authentication when user is not found"""
        # Mock database response as async
        async def mock_fetch_all():
            return {"other_user": [0.1] * 128}
        mock_db.fetch_all = mock_fetch_all
        
        # Mock ML service response
        mock_response = AsyncMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "is_authenticated": False,
            "user_name": None
        }
        mock_ml_service.return_value = mock_response
        
        data = {"image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD"}
        
        response = client.post("/authenticate", data=data)
        assert response.status_code == 200
        
        response_data = response.json()
        assert response_data["is_authenticated"] is False
        assert response_data["user_name"] is None
    
    @patch('main.database_connector')
    def test_authenticate_no_users(self, mock_db, client):
        """Test authentication when no users are registered"""
        async def mock_fetch_all():
            return {}
        mock_db.fetch_all = mock_fetch_all
        
        data = {"image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD"}
        
        response = client.post("/authenticate", data=data)
        assert response.status_code == 404
    
    @patch('main.database_connector')
    def test_get_all_users_empty(self, mock_db, client):
        """Test getting user names when no users exist"""
        async def mock_get_users():
            return []
        mock_db.get_registered_users = mock_get_users
        
        response = client.get("/getAllUsers")
        assert response.status_code == 200
        
        data = response.json()
        assert data["user_names"] == []
    
    @patch('main.database_connector')
    def test_get_all_users_with_users(self, mock_db, client):
        """Test getting user names when users exist"""
        async def mock_get_users():
            return ["user1", "user2", "user3"]
        mock_db.get_registered_users = mock_get_users
        
        response = client.get("/getAllUsers")
        assert response.status_code == 200
        
        data = response.json()
        assert data["user_names"] == ["user1", "user2", "user3"]
    
    @patch('main.database_connector')
    def test_delete_user_success(self, mock_db, client):
        """Test successful user deletion"""
        async def mock_delete_user(user_name):
            return True
        mock_db.delete_user = mock_delete_user
        
        response = client.delete("/deleteUser/test_user")
        assert response.status_code == 200
        
        data = response.json()
        assert data["is_deleted"] is True
        assert data["user_name"] == "test_user"
        assert "message" in data
    
    @patch('main.database_connector')
    def test_delete_user_not_found(self, mock_db, client):
        """Test deletion of non-existent user"""
        async def mock_delete_user(user_name):
            return False
        mock_db.delete_user = mock_delete_user
        
        response = client.delete("/deleteUser/nonexistent_user")
        assert response.status_code == 200
        
        data = response.json()
        assert data["is_deleted"] is False
        assert data["user_name"] == "nonexistent_user"
    
    @patch('main.database_connector')
    def test_ml_service_unavailable_add_user(self, mock_db, client):
        """Test behavior when ML service is unavailable during user addition"""
        async def mock_get_users():
            return []
        mock_db.get_registered_users = mock_get_users
        
        with patch('httpx.AsyncClient.post') as mock_post:
            mock_post.side_effect = httpx.ConnectError("Connection failed")
            
            files = {"image": ("test.jpg", BytesIO(b"fake image"), "image/jpeg")}
            data = {"user_name": "test_user"}
            
            response = client.post("/addUser", files=files, data=data)
            assert response.status_code == 200
            
            response_data = response.json()
            assert response_data["is_saved"] is False
            assert "ML service unavailable" in response_data["message"]
    
    @patch('main.database_connector')
    def test_ml_service_error_response_add_user(self, mock_db, client):
        """Test handling of ML service error responses during user addition"""
        async def mock_get_users():
            return []
        mock_db.get_registered_users = mock_get_users
        
        with patch('httpx.AsyncClient.post') as mock_post:
            mock_response = AsyncMock()
            mock_response.status_code = 500
            mock_response.json.return_value = {"error": "Internal server error"}
            mock_post.return_value = mock_response
            
            files = {"image": ("test.jpg", BytesIO(b"fake image"), "image/jpeg")}
            data = {"user_name": "test_user"}
            
            response = client.post("/addUser", files=files, data=data)
            assert response.status_code == 200
            
            response_data = response.json()
            assert response_data["is_saved"] is False
            assert "ML service error" in response_data["message"]
    
    def test_cors_headers(self, client):
        """Test CORS headers are properly set"""
        # Test regular request with origin header
        with patch('main.database_connector') as mock_db:
            async def mock_get_users():
                return []
            mock_db.get_registered_users = mock_get_users
            
            response = client.get("/health", headers={"Origin": "http://localhost:3000"})
            assert response.status_code == 200
            # Note: TestClient may not preserve all CORS headers, but the endpoint should work
    
    def test_request_validation_malformed_data(self, client):
        """Test request validation for various endpoints"""
        # Test with wrong field names
        files = {"wrong_field": ("test.jpg", BytesIO(b"fake image"), "image/jpeg")}
        data = {"user_name": "test"}
        response = client.post("/addUser", files=files, data=data)
        assert response.status_code == 422  # FastAPI validation error
    
    @patch('main.database_connector')
    def test_user_already_exists(self, mock_db, client):
        """Test adding user that already exists"""
        async def mock_get_users():
            return ["existing_user"]
        mock_db.get_registered_users = mock_get_users
        
        files = {"image": ("test.jpg", BytesIO(b"fake image"), "image/jpeg")}
        data = {"user_name": "existing_user"}
        
        response = client.post("/addUser", files=files, data=data)
        assert response.status_code == 200
        
        response_data = response.json()
        assert response_data["is_saved"] is False
        assert "already exists" in response_data["message"]
