import face_recognition
import os
import numpy as np
from PIL import Image
import onnx
import onnxruntime


class FaceAuthenticator:
    def __init__(self, execution_provider='CPUExecutionProvider', image_size=(252, 252)):
        # Load models
        self.models_folder = os.getenv('MODELS_FOLDER', 'models')
        self.depth_model_name = os.getenv('MODEL_FILE_NAME', 'anti_spoofing_quantized.onnx')

        model_path = os.path.join(self.models_folder, self.depth_model_name)
    
        # Check if model file exists
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Model file not found at: {model_path}")
        
        # Check if models folder exists and list contents
        if os.path.exists(self.models_folder):
            print(f"Models folder contents: {os.listdir(self.models_folder)}")
        else:
            print(f"Models folder does not exist: {self.models_folder}")
        
        onnx.checker.check_model(onnx.load(model_path))
        self.depth_map_model = self.create_inference_session(
            model_path, 
            provider=execution_provider
        )

        self.image_size = image_size
        self.is_authenticated = False
    
    def create_inference_session(self, quantized_model_path, provider='CPUExecutionProvider'):
        """Create ONNX Runtime inference session"""
        options = onnxruntime.SessionOptions()

        options.graph_optimization_level = onnxruntime.GraphOptimizationLevel.ORT_ENABLE_ALL
        
        # Create inference session
        session = onnxruntime.InferenceSession(
            quantized_model_path,
            options,
            providers=[provider] if isinstance(provider, str) else provider
        )
        return session

    def preprocess_image(self, image, target_size=(252, 252)):  # Removed async - not needed
        if isinstance(image, np.ndarray):
            if len(image.shape) == 3 and image.shape[2] == 3:
                image = image[:, :, ::-1]  # BGR to RGB
            image = Image.fromarray(image.astype(np.uint8))
        
        # Resize using PIL
        image = image.resize(target_size, Image.Resampling.LANCZOS)
        
        image = np.array(image)
        
        if len(image.shape) == 2 or image.shape[2] == 1:
            image = np.repeat(image[:, :, np.newaxis], 3, axis=2)
        
        image = image.astype(np.float32) / 255.0
        
        image = np.transpose(image, (2, 0, 1))  
        image = np.expand_dims(image, axis=0)   
        
        return image
    
    async def get_spoof_prediction(self, frame):
        '''
        This function takes a frame as input and returns the prediction of the anti-spoofing model.
        Args:
            frame : numpy array
                The frame to be processed (assumed to be in BGR format from camera).
        Returns:
            prediction : int
                The prediction of the anti-spoofing model.
        '''
        if isinstance(frame, np.ndarray) and len(frame.shape) == 3:
            frame_rgb = frame[:, :, ::-1]  
        else:
            frame_rgb = frame

        preprocessed_frame = self.preprocess_image(frame_rgb)  # Removed await

        depth_input = {self.depth_map_model.get_inputs()[0].name: preprocessed_frame}
        depth_map,output = self.depth_map_model.run(None, depth_input)
        
        prediction = np.argmax(output, axis=1)[0]
        
        return depth_map,prediction,frame_rgb

    def get_user_name(self, frame_rgb, known_face_embeddings, user_names, tolerance=0.65):  # Removed async - not needed
        '''
        This function takes a frame as input and returns the name of the user if authenticated.
        Args:
            frame_rgb : numpy array
                The frame to be processed.
            known_face_embeddings : list
                List of known face embeddings.
            user_names : list
                List of user names corresponding to the embeddings.
            tolerance : float
                Tolerance for face comparison.
        Returns:
            name : str
                The name of the user if authenticated, else None.
        '''
        try:
            if frame_rgb.dtype != np.uint8:
                frame_rgb = (frame_rgb * 255).astype(np.uint8) if frame_rgb.max() <= 1.0 else frame_rgb.astype(np.uint8)
            
            # Ensure the image is contiguous in memory
            frame_rgb = np.ascontiguousarray(frame_rgb)
            
            face_locations = face_recognition.face_locations(frame_rgb)
            
            if not face_locations:
                return None  # No faces found
                
            face_encodings = face_recognition.face_encodings(frame_rgb, face_locations)
            
            if not face_encodings:
                return None  # No face encodings generated
            
            for face_encoding in face_encodings:
                results = face_recognition.compare_faces(known_face_embeddings, face_encoding, tolerance=tolerance)
                for i in range(len(results)):
                    if results[i]:
                        return user_names[i]  # Return the corresponding user name
            return None
        except Exception as e:
            print(f"Error in get_user_name: {str(e)}")
            return None

    async def authenticate(self, image, known_face_embedding_dict, threshold=0.6):
        '''
        Authenticate a face in the given image against known face embeddings.
        Args:
            image (numpy.ndarray): The input image containing the face to authenticate.
            known_face_embedding_dict (dict): Dictionary with user_name:embedding pairs.
            threshold (float): The distance threshold for authentication.
        Returns:
            tuple: (bool, str) - (True if authenticated, user_name) or (False, None).
        '''
        assert image is not None, "Input image cannot be None."
        assert isinstance(image, np.ndarray), "Input image must be a numpy array."
        assert known_face_embedding_dict is not None, "Known face embedding dictionary cannot be None."
        assert isinstance(known_face_embedding_dict, dict), "Known face embedding must be a dictionary."

        try:
            # Convert dictionary to ordered lists
            user_names = list(known_face_embedding_dict.keys())
            known_face_embeddings = [np.array(embedding) for embedding in known_face_embedding_dict.values()]
            
            depth_map, prediction, frame_rgb = await self.get_spoof_prediction(image)
            if prediction == 1: 
                self.is_authenticated = True
                user_name = self.get_user_name(frame_rgb, known_face_embeddings, user_names, tolerance=threshold)  # Removed await
                return self.is_authenticated, user_name
            else:
                self.is_authenticated = False
                return False, None
        except Exception as e:
            print(f"Error in authenticate: {str(e)}")
            raise ValueError(f"Error in authentication: {str(e)}")


