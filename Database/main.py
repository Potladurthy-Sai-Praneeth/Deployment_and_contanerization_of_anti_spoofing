from fastapi import FastAPI, UploadFile, File, Form, HTTPException, status
from fastapi.responses import JSONResponse, HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from contextlib import asynccontextmanager
import numpy as np
import base64
import os
import json
from io import BytesIO
import httpx
import uvicorn
from database import Database


class AddUserResponse(BaseModel):
    message: str
    user_name: str
    is_saved: bool

class FetchUserNamesResponse(BaseModel):
    user_names: List[str]

class DeleteUserResponse(BaseModel):
    message: str
    user_name: str
    is_deleted: bool

class AuthenticateResponse(BaseModel):
    is_authenticated: bool
    user_name: Optional[str] = None


# Global variables
db_path = os.getenv("CHROMA_DB_PATH", "/api/database")
database_connector = None
ML_MODEL_PORT = os.getenv('ML_MODEL_PORT',8000)  # Port where the ML model service is running
ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", f"http://ml-model:{ML_MODEL_PORT}")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    global database_connector
    try:
        print(f"Initializing database at path: {db_path}")
        os.makedirs(db_path, exist_ok=True)
        database_connector = Database(db_path=db_path)
        print("Database initialized successfully")
        yield
    except Exception as e:
        print(f"Failed to initialize database: {e}")
        raise
    finally:
        # Shutdown
        if database_connector:
            database_connector.close()


api = FastAPI(
    title="API for interfacing UI, DB and ML model",
    description="API for managing users and face recognition",
    version="1.0.0",
    docs_url="/docs",
    lifespan=lifespan
)


api.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def validate_user_name(user_name: str) -> str:
    """Validate and sanitize user name"""
    if not user_name or not user_name.strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User name cannot be empty"
        )
    return user_name.strip().lower()

def validate_db_connection():
    """Ensure database connection is initialized"""
    if database_connector is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not initialized"
        )
    return


@api.get("/getAllUsers", response_model=FetchUserNamesResponse)
async def get_all_users():
    """Fetch all users and their embeddings from the database."""
    validate_db_connection()
    try:
        results = await database_connector.get_registered_users()
        return FetchUserNamesResponse(user_names=results)
    except Exception as e:
        print(f"Error in get_all_users: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@api.post("/addUser", response_model=AddUserResponse)
async def add_user(image: UploadFile = File(..., description="User's face image"),user_name: str = Form(..., description="User's name")):
    """Add a new user with their face embedding."""
    validate_db_connection()
    
    try:
        user_name = validate_user_name(user_name)
        
        # Validate file
        if not image.content_type or not image.content_type.startswith('image/'):
            return AddUserResponse(
                is_saved=False,
                user_name=user_name,
                message="Invalid file type. Please upload an image file."
            )
        
        all_users = await database_connector.get_registered_users()

        # Check if user already exists - return early if they do
        if user_name in all_users:
            return AddUserResponse(
                is_saved=False,
                user_name=user_name,
                message=f"User '{user_name}' already exists"
            )

        # User doesn't exist, proceed with ML service call
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                contents = await image.read()
                files = {'image': (image.filename, contents, image.content_type)}
                data = {'user_name': user_name}

                response = await client.post(
                    f"{ML_SERVICE_URL}/getEmbedding",
                    files=files,
                    data=data
                )

                if response.status_code != 200:
                    return AddUserResponse(
                        is_saved=False,
                        user_name=user_name,
                        message=f"ML service error: {response.status_code}"
                    )

                ml_response = response.json()
                # print(f'Response in Add user: {ml_response}')

                # Check if ML service successfully generated embedding
                if ml_response.get("is_saved") and ml_response.get("embedding"):
                    embedding = ml_response["embedding"]
                    
                    # Validate embedding
                    if not isinstance(embedding, list) or len(embedding) == 0:
                        return AddUserResponse(
                            is_saved=False,
                            user_name=user_name,
                            message="Invalid embedding format received from ML service"
                        )
                    
                    # Insert into database
                    is_saved = await database_connector.insert(user_name, embedding)
                    
                    if is_saved:
                        return AddUserResponse(
                            is_saved=True,
                            user_name=user_name,
                            message=f"User '{user_name}' added successfully"
                        )
                    else:
                        return AddUserResponse(
                            is_saved=False,
                            user_name=user_name,
                            message=f"Failed to save user '{user_name}' to database"
                        )
                else:
                    return AddUserResponse(
                        is_saved=False,
                        user_name=user_name,
                        message=ml_response.get("message", "Failed to generate embeddings - no face detected or invalid image")
                    )
        
        except httpx.TimeoutException:
            return AddUserResponse(
                is_saved=False,
                user_name=user_name,
                message="Request timeout - ML service took too long to respond"
            )
        except httpx.RequestError as e:
            return AddUserResponse(
                is_saved=False,
                user_name=user_name,
                message=f"ML service unavailable: {str(e)}"
            )
                
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error in add_user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred: {str(e)}"
        )


@api.post("/authenticate", response_model=AuthenticateResponse)
async def authenticate_user(
    image: str = Form(..., description="Base64 encoded image data"),
    threshold: float = Form(0.5, description="Distance threshold for authentication")
) -> AuthenticateResponse:
    """Authenticate a user by comparing against stored embeddings via ML service."""
    validate_db_connection()
    
    try:
        known_face_embeddings_dict = await database_connector.fetch_all()

        if not known_face_embeddings_dict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No registered users found. Please register users first."
            )
        
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                data = {
                    "image": image,
                    "known_face_embeddings": json.dumps(known_face_embeddings_dict),
                    "threshold": threshold
                }
                
                response = await client.post(
                    f"{ML_SERVICE_URL}/authenticate",
                    data=data
                )

                if response.status_code != 200:
                    print(f"ML service error: {response.status_code} - {response.text}")
                    return AuthenticateResponse(
                        is_authenticated=False,
                        user_name=None
                    )

                ml_response = response.json()
                # print(f'Response in Authenticate user: {ml_response}')
                
                return AuthenticateResponse(
                    is_authenticated=ml_response.get("is_authenticated", False),
                    user_name=ml_response.get("user_name")
                )
        
        except httpx.TimeoutException:
            return AuthenticateResponse(
                is_authenticated=False,
                user_name=None
            )
        except httpx.RequestError as e:
            print(f"ML service unavailable: {e}")
            return AuthenticateResponse(
                is_authenticated=False,
                user_name=None
            )
    except HTTPException:
        raise 
    
    except Exception as e:
        print(f"Error in authenticate_user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred: {str(e)}"
        )

@api.get("/health")
async def health_check():
    """Health check endpoint."""
    try:
        if database_connector is None:
            return {"status": "unhealthy", "message": "Database not initialized"}
        
        # Try to get collection info
        await database_connector.get_registered_users()
        return {
            "status": "healthy",
            "message": "Database service is running",
            "db_path": db_path,
            "ml_service_url": ML_SERVICE_URL
        }
    except Exception as e:
        return {"status": "unhealthy", "message": str(e)}


@api.delete("/deleteUser/{user_name}", response_model=DeleteUserResponse)
async def delete_user(user_name: str) -> DeleteUserResponse:
    """Delete a user from the database."""
    validate_db_connection()
    
    try:
        user_name = validate_user_name(user_name)
        is_deleted = await database_connector.delete_user(user_name)
        
        return DeleteUserResponse(
            is_deleted=is_deleted,
            user_name=user_name,
            message=f"User '{user_name}' deleted successfully" if is_deleted else f"User '{user_name}' not found"
        )
    except Exception as e:
        print(f"Error in delete_user: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

if __name__ == "__main__":
    uvicorn.run("main:api", host="0.0.0.0", port=8001, reload=True)