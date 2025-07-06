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

    assert image is not None, "Input image cannot be None."
    assert isinstance(image, np.ndarray), "Input image must be a numpy array."

    face_encodings = face_recognition.face_encodings(image)

    if len(face_encodings) == 0:
        return None  # No faces found

    return face_encodings[0]  # Return the first face encoding found

