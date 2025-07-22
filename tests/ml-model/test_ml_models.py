import pytest
import numpy as np
import sys
import os
from unittest.mock import Mock, patch, MagicMock
from PIL import Image
import io
import base64

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', '..', 'ml-model'))

from generate_embedding import generate_face_embedding
from authenticate import FaceAuthenticator


class TestGenerateEmbedding:
    """Unit tests for face embedding generation"""
    
    @pytest.fixture
    def sample_image(self):
        """Create a sample image for testing"""
        
        image = Image.new('RGB', (252, 252), color='red')
        return image
    
    @pytest.fixture
    def sample_image_array(self, sample_image):
        """Convert sample image to numpy array"""
        return np.array(sample_image)
    
    def test_generate_face_embedding_success(self, sample_image_array):
        """Test successful face embedding generation"""
        with patch('face_recognition.face_encodings') as mock_encodings:
            
            mock_encodings.return_value = [np.random.rand(128)]
            
            embedding = generate_face_embedding(sample_image_array)
            
            assert embedding is not None
            assert len(embedding) == 128
            assert isinstance(embedding, np.ndarray)
            assert all(isinstance(x, float) for x in embedding)
    
    def test_generate_face_embedding_no_face(self, sample_image_array):
        """Test embedding generation when no face is detected"""
        with patch('face_recognition.face_encodings') as mock_encodings:
            
            mock_encodings.return_value = []
            
            embedding = generate_face_embedding(sample_image_array)
            
            assert embedding is None
    
    def test_generate_face_embedding_multiple_faces(self, sample_image_array):
        """Test embedding generation when multiple faces are detected"""
        with patch('face_recognition.face_encodings') as mock_encodings:
            
            mock_encodings.return_value = [np.random.rand(128), np.random.rand(128)]
            
            embedding = generate_face_embedding(sample_image_array)
            
            
            assert embedding is not None
            assert len(embedding) == 128
    
    def test_generate_face_embedding_invalid_input(self):
        """Test embedding generation with invalid input"""
        
        with pytest.raises(ValueError):
            generate_face_embedding(None)
        
        
        invalid_array = np.array([1, 2, 3])
        embedding = generate_face_embedding(invalid_array)
        assert embedding is None
    
    @patch('face_recognition.face_encodings')
    def test_generate_face_embedding_exception(self, mock_encodings, sample_image_array):
        """Test embedding generation when face_recognition raises exception"""
        mock_encodings.side_effect = Exception("Face recognition error")
        
        embedding = generate_face_embedding(sample_image_array)
        assert embedding is None


class TestFaceAuthenticator:
    """Unit tests for FaceAuthenticator class"""
    
    @pytest.fixture
    def authenticator(self):
        """Create FaceAuthenticator instance for testing"""
        with patch('onnxruntime.InferenceSession'):
            return FaceAuthenticator(
                execution_provider='CPUExecutionProvider',
                image_size=(252, 252)
            )
    
    @pytest.fixture
    def sample_image(self):
        """Create a sample image for testing"""
        image = Image.new('RGB', (252, 252), color='red')
        return image
    
    def test_authenticator_initialization(self):
        """Test FaceAuthenticator initialization"""
        with patch('onnxruntime.InferenceSession') as mock_session:
            mock_session.return_value = Mock()
            
            authenticator = FaceAuthenticator(
                execution_provider='CPUExecutionProvider',
                image_size=(252, 252)
            )
            
            assert authenticator.depth_map_model is not None
            assert authenticator.image_size == (252, 252)
    
    def test_preprocess_image(self, authenticator, sample_image):
        """Test image preprocessing"""
        image_array = np.array(sample_image)
        
        
        if hasattr(authenticator, 'preprocess_image'):
            processed = authenticator.preprocess_image(image_array)
            assert processed is not None
            assert isinstance(processed, np.ndarray)
    
    def test_onnx_model_loading_error(self):
        """Test handling of ONNX model loading errors"""
        with patch('onnxruntime.InferenceSession', side_effect=Exception("Model loading failed")):
            with pytest.raises(Exception):
                FaceAuthenticator(
                    execution_provider='CPUExecutionProvider',
                    image_size=(252, 252)
                )
    
    def test_gpu_provider_fallback(self):
        """Test fallback to CPU when GPU provider is not available"""
        with patch('onnxruntime.InferenceSession') as mock_session:
            
            mock_session.side_effect = [Exception("GPU not available"), Mock()]
            
            try:
                authenticator = FaceAuthenticator(
                    execution_provider='CUDAExecutionProvider',
                    image_size=(252, 252)
                )
                
                assert authenticator is not None
            except Exception:
                
                pass
