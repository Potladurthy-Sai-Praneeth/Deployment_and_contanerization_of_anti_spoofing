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


sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'Database'))

class TestDatabaseAPI:
    """Integration tests for Database API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client with mocking"""
        
        with patch('main.Database') as mock_db_class:
            
            mock_db_instance = MagicMock()
            mock_db_instance.get_registered_users = AsyncMock(return_value=[])
            mock_db_instance.fetch_all = AsyncMock(return_value={})
            mock_db_instance.insert = AsyncMock(return_value=True)
            mock_db_instance.delete_user = AsyncMock(return_value=True)
            mock_db_instance.close = MagicMock()
            
            mock_db_class.return_value = mock_db_instance
            
            
            from main import api
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
        
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
    
    def test_addUser_success(self, client, mock_ml_service):
        """Test successful user addition"""
        
        with patch('main.database_connector') as mock_db:
            mock_db.get_registered_users = AsyncMock(return_value=[])
            mock_db.insert = AsyncMock(return_value=True)
            
            
            mock_response = MagicMock()
            mock_response.status_code = 200
            mock_response.json.return_value = {
                "is_saved": True,
                "user_name": "test_user", 
                "message": "User added successfully",
                "embedding": [0.1] * 128
            }
            mock_ml_service.return_value = mock_response
            
            
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
            
            
            files = {"image": ("test.txt", BytesIO(b"not an image"), "text/plain")}
            data = {"user_name": "test_user"}
            
            response = client.post("/addUser", files=files, data=data)
            assert response.status_code == 200
            
            response_data = response.json()
            assert response_data["is_saved"] is False
            assert "Invalid file type" in response_data["message"]
    
    def test_addUser_missing_fields(self, client):
        """Test user addition with missing required fields"""
        
        files = {"image": ("test.jpg", BytesIO(b"fake image"), "image/jpeg")}
        response = client.post("/addUser", files=files)
        assert response.status_code == 422  
        
        
        data = {"user_name": "test"}
        response = client.post("/addUser", data=data)
        assert response.status_code == 422  

    def test_authenticate_user_success(self, client, mock_ml_service):
        """Test successful user authentication"""
        with patch('main.database_connector') as mock_db:
            
            mock_db.fetch_all = AsyncMock(return_value={"test_user": [0.1] * 128})
            
            
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
            
            mock_db.fetch_all = AsyncMock(return_value={"other_user": [0.1] * 128})
            
            
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
    
    def test_database_connection_error(self, client):
        """Test handling of database connection errors"""
        with patch('main.database_connector') as mock_db:
            mock_db.get_registered_users = AsyncMock(side_effect=Exception("Database connection failed"))
            
            response = client.get("/getAllUsers")
            assert response.status_code == 500