import numpy as np
import face_recognition

def generate_face_embedding(image):
    '''
    Generate a face embedding from an image using the face_recognition library.
    Args:
        image (numpy.ndarray): The input image in which to detect and encode the face.
    Returns:
        numpy.ndarray: A 128-dimensional face embedding vector or None if no face found.
    '''

    if image is None:
        raise ValueError("Input image cannot be None.")
    if not isinstance(image, np.ndarray):
        raise ValueError("Input image must be a numpy array.")

    try:
        face_encodings = face_recognition.face_encodings(image,num_jitters=2,model="large")

        if len(face_encodings) == 0:
            return None  # No faces found

        return face_encodings[0]  # Return the first face encoding found
    except Exception as e:
        print(f"Error generating face embedding: {str(e)}")
        return None

