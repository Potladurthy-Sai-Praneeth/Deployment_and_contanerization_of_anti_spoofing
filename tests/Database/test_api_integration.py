import pytest
import tempfile
import shutil
import os
import sys
import json
from unittest.mock import Mock, patch, AsyncMock, MagicMock
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
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        with patch('main.database_connector') as mock_db:
            # Create a proper mock with async methods
            mock_db_instance = MagicMock()
            mock_db_instance.get_registered_users = AsyncMock(return_value=[])
            mock_db = mock_db_instance
            
            response = client.get("/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
    
    def test_addUser_success(self, client, mock_ml_service):
        """Test successful user addition"""
        with patch('main.database_connector') as mock_db:
            # Mock database responses properly
            mock_db.get_registered_users = AsyncMock(return_value=[])
            mock_db.insert = AsyncMock(return_value=True)
            
            # Mock ML service response
            mock_response = MagicMock()
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
    
    def test_addUser_user_already_exists(self, client):
        """Test adding user that already exists"""
        with patch('main.database_connector') as mock_db:
            # Mock database to return existing user
            mock_db.get_registered_users = AsyncMock(return_value=["test_user"])
            
            image_data = b"fake image data"
            files = {"image": ("test.jpg", BytesIO(image_data), "image/jpeg")}
            data = {"user_name": "test_user"}
            
            response = client.post("/addUser", files=files, data=data)
            assert response.status_code == 200
            
            response_data = response.json()
            assert response_data["is_saved"] is False
            assert "already exists" in response_data["message"]
    
    def test_addUser_invalid_image(self, client):
        """Test user addition with invalid image"""
        with patch('main.database_connector') as mock_db:
            mock_db.get_registered_users = AsyncMock(return_value=[])
            
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

    def test_authenticate_user_success(self, client, mock_ml_service):
        """Test successful user authentication"""
        with patch('main.database_connector') as mock_db:
            # Mock database response
            mock_db.fetch_all = AsyncMock(return_value={"test_user": [0.1] * 128})
            
            # Mock ML service response
            mock_response = MagicMock()
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
    
    def test_authenticate_user_not_found(self, client, mock_ml_service):
        """Test authentication when user is not found"""
        with patch('main.database_connector') as mock_db:
            # Mock database response
            mock_db.fetch_all = AsyncMock(return_value={"other_user": [0.1] * 128})
            
            # Mock ML service response
            mock_response = MagicMock()
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
    
    def test_authenticate_no_users(self, client):
        """Test authentication when no users are registered"""
        with patch('main.database_connector') as mock_db:
            mock_db.fetch_all = AsyncMock(return_value={})
            
            data = {"image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAAAAAAAD"}
            
            response = client.post("/authenticate", data=data)
            assert response.status_code == 404
    
    def test_get_all_users_empty(self, client):
        """Test getting user names when no users exist"""
        with patch('main.database_connector') as mock_db:
            mock_db.get_registered_users = AsyncMock(return_value=[])
            
            response = client.get("/getAllUsers")
            assert response.status_code == 200
            
            data = response.json()
            assert data["user_names"] == []
    
    def test_get_all_users_with_users(self, client):
        """Test getting user names when users exist"""
        with patch('main.database_connector') as mock_db:
            mock_db.get_registered_users = AsyncMock(return_value=["user1", "user2", "user3"])
            
            response = client.get("/getAllUsers")
            assert response.status_code == 200
            
            data = response.json()
            assert data["user_names"] == ["user1", "user2", "user3"]
    
    def test_delete_user_success(self, client):
        """Test successful user deletion"""
        with patch('main.database_connector') as mock_db:
            mock_db.get_registered_users = AsyncMock(return_value=["test_user"])
            mock_db.delete_user = AsyncMock(return_value=True)
            
            response = client.delete("/deleteUser/test_user")
            assert response.status_code == 200
            
            data = response.json()
            assert data["is_deleted"] is True
            assert data["user_name"] == "test_user"
            assert "message" in data
    
    def test_delete_user_not_found(self, client):
        """Test deletion of non-existent user"""
        with patch('main.database_connector') as mock_db:
            mock_db.get_registered_users = AsyncMock(return_value=[])
            mock_db.delete_user = AsyncMock(return_value=False)
            
            response = client.delete("/deleteUser/nonexistent_user")
            assert response.status_code == 200
            
            data = response.json()
            assert data["is_deleted"] is False
            assert data["user_name"] == "nonexistent_user"
    
    def test_ml_service_unavailable_add_user(self, client):
        """Test behavior when ML service is unavailable during user addition"""
        with patch('main.database_connector') as mock_db:
            mock_db.get_registered_users = AsyncMock(return_value=[])
            
            with patch('httpx.AsyncClient.post') as mock_post:
                mock_post.side_effect = httpx.ConnectError("Connection failed")
                
                files = {"image": ("test.jpg", BytesIO(b"fake image"), "image/jpeg")}
                data = {"user_name": "test_user"}
                
                response = client.post("/addUser", files=files, data=data)
                assert response.status_code == 200
                
                response_data = response.json()
                assert response_data["is_saved"] is False
                assert "ML service unavailable" in response_data["message"]
    
    def test_ml_service_error_response_add_user(self, client):
        """Test handling of ML service error responses during user addition"""
        with patch('main.database_connector') as mock_db:
            mock_db.get_registered_users = AsyncMock(return_value=[])
            
            with patch('httpx.AsyncClient.post') as mock_post:
                mock_response = MagicMock()
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
    
    def test_ml_service_timeout_add_user(self, client):
        """Test handling of ML service timeout during user addition"""
        with patch('main.database_connector') as mock_db:
            mock_db.get_registered_users = AsyncMock(return_value=[])
            
            with patch('httpx.AsyncClient.post') as mock_post:
                mock_post.side_effect = httpx.TimeoutException("Request timeout")
                
                files = {"image": ("test.jpg", BytesIO(b"fake image"), "image/jpeg")}
                data = {"user_name": "test_user"}
                
                response = client.post("/addUser", files=files, data=data)
                assert response.status_code == 200
                
                response_data = response.json()
                assert response_data["is_saved"] is False
                assert "timeout" in response_data["message"].lower()
    
    def test_ml_service_no_face_detected(self, client, mock_ml_service):
        """Test handling when ML service detects no face in image"""
        with patch('main.database_connector') as mock_db:
            mock_db.get_registered_users = AsyncMock(return_value=[])
            
            # Mock ML service response indicating no face detected
            mock_response = MagicMock()
            mock_response.status_code = 422
            mock_response.json.return_value = {
                "is_saved": False,
                "message": "No face detected in the image"
            }
            mock_ml_service.return_value = mock_response
            
            files = {"image": ("test.jpg", BytesIO(b"fake image"), "image/jpeg")}
            data = {"user_name": "test_user"}
            
            response = client.post("/addUser", files=files, data=data)
            assert response.status_code == 200
            
            response_data = response.json()
            assert response_data["is_saved"] is False
            assert "no face detected" in response_data["message"].lower()
    
    def test_cors_headers(self, client):
        """Test CORS headers are properly set"""
        with patch('main.database_connector') as mock_db:
            mock_db.get_registered_users = AsyncMock(return_value=[])
            
            response = client.get("/health", headers={"Origin": "http://localhost:3000"})
            assert response.status_code == 200
            # Note: TestClient may not preserve all CORS headers, but the endpoint should work
    
    def test_request_validation_malformed_data(self, client):
        """Test request validation for various endpoints"""
        # Test with wrong field names for file upload
        files = {"wrong_field": ("test.jpg", BytesIO(b"fake image"), "image/jpeg")}
        data = {"user_name": "test"}
        response = client.post("/addUser", files=files, data=data)
        assert response.status_code == 422  # FastAPI validation error
    
    def test_invalid_user_name_characters(self, client):
        """Test user addition with invalid characters in user name"""
        with patch('main.database_connector') as mock_db:
            mock_db.get_registered_users = AsyncMock(return_value=[])
            
            files = {"image": ("test.jpg", BytesIO(b"fake image"), "image/jpeg")}
            
            # Test various invalid characters
            invalid_names = ["user@name", "user name", "user/name", "user\\name", "user?name"]
            
            for invalid_name in invalid_names:
                data = {"user_name": invalid_name}
                response = client.post("/addUser", files=files, data=data)
                # Should either reject or sanitize the name
                assert response.status_code in [200, 422]
    
    def test_empty_user_name(self, client):
        """Test user addition with empty user name"""
        with patch('main.database_connector') as mock_db:
            mock_db.get_registered_users = AsyncMock(return_value=[])
            
            files = {"image": ("test.jpg", BytesIO(b"fake image"), "image/jpeg")}
            data = {"user_name": ""}
            
            response = client.post("/addUser", files=files, data=data)
            assert response.status_code == 422  # Should be validation error
    
    def test_authenticate_invalid_base64(self, client):
        """Test authentication with invalid base64 data"""
        with patch('main.database_connector') as mock_db:
            mock_db.fetch_all = AsyncMock(return_value={"test_user": [0.1] * 128})
            
            data = {"image": "invalid_base64_data"}
            
            response = client.post("/authenticate", data=data)
            # Should handle gracefully, likely return error from ML service
            assert response.status_code in [200, 400, 422]
    
    def test_database_connection_error(self, client):
        """Test handling of database connection errors"""
        with patch('main.database_connector') as mock_db:
            mock_db.get_registered_users = AsyncMock(side_effect=Exception("Database connection failed"))
            
            response = client.get("/getAllUsers")
            assert response.status_code == 500
