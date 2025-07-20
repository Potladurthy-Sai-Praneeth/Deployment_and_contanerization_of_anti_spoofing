import pytest
import json
import base64
import sys
import os
from unittest.mock import Mock, patch, AsyncMock
from fastapi.testclient import TestClient
from PIL import Image
import numpy as np
import io

# Add ML model module to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'ml-model'))

from main import app


class TestMLModelAPI:
    """Integration tests for ML Model API endpoints"""
    
    @pytest.fixture
    def client(self):
        """Create test client"""
        return TestClient(app)
    
    @pytest.fixture
    def sample_image_file(self):
        """Create a sample image file for upload"""
        # Create a simple RGB image
        image = Image.new('RGB', (252, 252), color='red')
        
        # Convert to bytes
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG')
        buffer.seek(0)
        
        return ("test_image.jpg", buffer, "image/jpeg")
    
    @pytest.fixture
    def sample_base64_image(self):
        """Create a sample base64 encoded image"""
        # Create a simple RGB image
        image = Image.new('RGB', (252, 252), color='red')
        
        # Convert to base64
        buffer = io.BytesIO()
        image.save(buffer, format='JPEG')
        img_str = base64.b64encode(buffer.getvalue()).decode()
        
        return f"data:image/jpeg;base64,{img_str}"
    
    @pytest.fixture
    def mock_face_embedding(self):
        """Mock face embedding generation"""
        with patch('main.generate_face_embedding') as mock_gen:
            mock_gen.return_value = np.array([0.1] * 128)  # Mock 128-dimensional embedding
            yield mock_gen
    
    @pytest.fixture
    def sample_known_faces(self):
        """Sample known faces dictionary"""
        return {
            "user1": [0.1] * 128,
            "user2": [0.2] * 128,
            "test_user": [0.95] * 128  # High similarity for matching tests
        }
    
    def test_health_check(self, client):
        """Test health check endpoint"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "healthy"
        assert "message" in data
        assert "model_loaded" in data
        assert "image_size" in data
        assert "provider" in data
    
    def test_getEmbedding_success(self, client, sample_image_file, mock_face_embedding):
        """Test successful user embedding generation"""
        filename, file_data, content_type = sample_image_file
        
        response = client.post(
            "/getEmbedding",
            files={"image": (filename, file_data, content_type)},
            data={"user_name": "test_user"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["is_saved"] is True
        assert data["user_name"] == "test_user"
        assert "message" in data
        assert "embedding" in data
        assert len(data["embedding"]) == 128
    
    def test_getEmbedding_no_face_detected(self, client, sample_image_file):
        """Test user addition when no face is detected"""
        filename, file_data, content_type = sample_image_file
        
        with patch('main.generate_face_embedding', return_value=None):
            response = client.post(
                "/getEmbedding",
                files={"image": (filename, file_data, content_type)},
                data={"user_name": "test_user"}
            )
            assert response.status_code == 200
            
            data = response.json()
            assert data["is_saved"] is False
            assert "no face detected" in data["message"].lower()
    
    def test_getEmbedding_invalid_image_format(self, client):
        """Test user addition with invalid image format"""
        # Create invalid file
        invalid_file = io.BytesIO(b"not an image")
        
        response = client.post(
            "/getEmbedding",
            files={"image": ("test.txt", invalid_file, "text/plain")},
            data={"user_name": "test_user"}
        )
        assert response.status_code == 400
    
    def test_getEmbedding_empty_user_name(self, client, sample_image_file):
        """Test user addition with empty user name"""
        filename, file_data, content_type = sample_image_file
        
        response = client.post(
            "/getEmbedding",
            files={"image": (filename, file_data, content_type)},
            data={"user_name": "   "}
        )
        assert response.status_code == 400
        assert "cannot be empty" in response.json()["detail"]
    
    def test_getEmbedding_missing_fields(self, client):
        """Test user addition with missing required fields"""
        # Missing image file
        response = client.post("/getEmbedding", data={"user_name": "test"})
        assert response.status_code == 422
        
        # Missing user_name
        invalid_file = io.BytesIO(b"fake image data")
        response = client.post(
            "/getEmbedding", 
            files={"image": ("test.jpg", invalid_file, "image/jpeg")}
        )
        assert response.status_code == 422
    
    def test_authenticate_success(self, client, sample_base64_image, sample_known_faces):
        """Test successful authentication"""
        with patch.object(client.app.state, 'authenticator') as mock_auth:
            # Mock successful authentication
            mock_auth.authenticate = AsyncMock(return_value=(True, "test_user"))
            
            response = client.post(
                "/authenticate",
                data={
                    "image": sample_base64_image,
                    "known_face_embeddings": json.dumps(sample_known_faces),
                    "threshold": "0.6"
                }
            )
            assert response.status_code == 200
            
            data = response.json()
            assert data["is_authenticated"] is True
            assert data["user_name"] == "test_user"
    
    def test_authenticate_no_match(self, client, sample_base64_image, sample_known_faces):
        """Test authentication when no user matches"""
        with patch('main.authenticator') as mock_auth:
            # Mock no match authentication
            mock_auth.authenticate = AsyncMock(return_value=(False, None))
            
            response = client.post(
                "/authenticate",
                data={
                    "image": sample_base64_image,
                    "known_face_embeddings": json.dumps(sample_known_faces),
                    "threshold": "0.6"
                }
            )
            assert response.status_code == 200
            
            data = response.json()
            assert data["is_authenticated"] is False
            assert data["user_name"] is None
    
    def test_authenticate_invalid_json(self, client, sample_base64_image):
        """Test authentication with invalid JSON format"""
        response = client.post(
            "/authenticate",
            data={
                "image": sample_base64_image,
                "known_face_embeddings": "invalid_json",
                "threshold": "0.6"
            }
        )
        assert response.status_code == 400
        assert "invalid format" in response.json()["detail"].lower()
    
    def test_authenticate_invalid_image(self, client, sample_known_faces):
        """Test authentication with invalid image"""
        response = client.post(
            "/authenticate",
            data={
                "image": "invalid_image_data",
                "known_face_embeddings": json.dumps(sample_known_faces),
                "threshold": "0.6"
            }
        )
        assert response.status_code == 400
        assert "invalid image data" in response.json()["detail"].lower()
    
    def test_authenticate_invalid_embedding_format(self, client, sample_base64_image):
        """Test authentication with invalid embedding format"""
        invalid_embeddings = {
            "user1": "not_a_list",  # Should be a list
            "user2": [0.1] * 128
        }
        
        response = client.post(
            "/authenticate",
            data={
                "image": sample_base64_image,
                "known_face_embeddings": json.dumps(invalid_embeddings),
                "threshold": "0.6"
            }
        )
        assert response.status_code == 400
        assert "must be a list" in response.json()["detail"]
    
    def test_decode_base64_image_success(self, sample_base64_image):
        """Test base64 image decoding"""
        from main import decode_base64_image
        
        result = decode_base64_image(sample_base64_image)
        assert isinstance(result, np.ndarray)
        assert len(result.shape) == 3  # Height, Width, Channels
        assert result.shape[2] == 3  # RGB channels
    
    def test_decode_base64_image_invalid(self):
        """Test base64 image decoding with invalid data"""
        from main import decode_base64_image
        
        # Test with invalid base64
        with pytest.raises(Exception):
            decode_base64_image("invalid_base64")
        
        # Test with invalid image data
        with pytest.raises(Exception):
            decode_base64_image("data:image/jpeg;base64,invalid_data")
    
    def test_validate_user_name(self):
        """Test user name validation"""
        from main import validate_user_name
        
        # Valid user name
        assert validate_user_name("Test User") == "test user"
        assert validate_user_name("  Valid Name  ") == "valid name"
        
        # Invalid user names
        with pytest.raises(Exception):
            validate_user_name("")
        
        with pytest.raises(Exception):
            validate_user_name("   ")
    
    def test_cors_middleware(self, client):
        """Test CORS middleware configuration"""
        # Test preflight request
        response = client.options("/getEmbedding", headers={
            "Origin": "http://localhost:3000",
            "Access-Control-Request-Method": "POST"
        })
        assert response.status_code == 200
        
        # Test actual request with origin
        response = client.get("/health", headers={"Origin": "http://localhost:3000"})
        assert response.status_code == 200
    
    def test_large_image_handling(self, client, mock_face_embedding):
        """Test handling of large images"""
        # Create a large image
        large_image = Image.new('RGB', (2048, 2048), color='blue')
        buffer = io.BytesIO()
        large_image.save(buffer, format='JPEG')
        buffer.seek(0)
        
        response = client.post(
            "/getEmbedding",
            files={"image": ("large_image.jpg", buffer, "image/jpeg")},
            data={"user_name": "test_user"}
        )
        # Should handle large images (either success or appropriate error)
        assert response.status_code in [200, 413, 422, 500]
    
    def test_empty_image_file(self, client):
        """Test handling of empty image file"""
        empty_file = io.BytesIO(b"")
        
        response = client.post(
            "/getEmbedding",
            files={"image": ("empty.jpg", empty_file, "image/jpeg")},
            data={"user_name": "test_user"}
        )
        assert response.status_code == 200
        
        data = response.json()
        assert data["is_saved"] is False
        assert "empty image file" in data["message"].lower()
    
    def test_embedding_generation_error(self, client, sample_image_file):
        """Test handling of embedding generation errors"""
        filename, file_data, content_type = sample_image_file
        
        with patch('main.generate_face_embedding', side_effect=Exception("Model error")):
            response = client.post(
                "/getEmbedding",
                files={"image": (filename, file_data, content_type)},
                data={"user_name": "test_user"}
            )
            assert response.status_code == 200
            
            data = response.json()
            assert data["is_saved"] is False
            assert "failed to generate embeddings" in data["message"].lower()
    
    def test_api_documentation(self, client):
        """Test API documentation endpoints"""
        # Test OpenAPI docs
        response = client.get("/docs")
        assert response.status_code == 200
        
        # Test OpenAPI schema
        response = client.get("/openapi.json")
        assert response.status_code == 200
        schema = response.json()
        assert "paths" in schema
        assert "/getEmbedding" in schema["paths"]
        assert "/authenticate" in schema["paths"]
        assert "/health" in schema["paths"]
    
    def test_response_models(self, client, sample_image_file, mock_face_embedding):
        """Test response model structure"""
        filename, file_data, content_type = sample_image_file
        
        response = client.post(
            "/getEmbedding",
            files={"image": (filename, file_data, content_type)},
            data={"user_name": "test_user"}
        )
        
        assert response.status_code == 200
        data = response.json()
        
        # Check required fields from AddUserResponse model
        assert "message" in data
        assert "user_name" in data
        assert "is_saved" in data
        assert "embedding" in data
        
        # Check types
        assert isinstance(data["is_saved"], bool)
        assert isinstance(data["user_name"], str)
        assert isinstance(data["message"], str)
        assert isinstance(data["embedding"], list) or data["embedding"] is None
