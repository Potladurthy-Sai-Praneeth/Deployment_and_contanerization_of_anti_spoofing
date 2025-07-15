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


api = FastAPI(
    title="API for interfacing UI, DB and ML model",
    description="API for managing users and face recognition",
    version="1.0.0",
    docs_url="/docs",
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


db_path = "database"
if not os.path.exists(db_path):
    os.makedirs(db_path)

# Global variables
database_connector = Database(db_path=db_path)
ML_MODEL_PORT = 8000  # Port where the ML model service is running
ML_SERVICE_URL = os.getenv("ML_SERVICE_URL", f"http://ml-model:{ML_MODEL_PORT}")


@api.get("/getAllUsers", response_model=FetchUserNamesResponse)
async def get_all_users():
    """Fetch all users and their embeddings from the database."""
    try:
        results = await database_connector.get_registered_users()
        return FetchUserNamesResponse(user_names=results)  # Fixed: changed 'users' to 'user_names'
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

@api.post("/addUser", response_model=AddUserResponse)
async def add_user(image: UploadFile = File(..., description="User's face image"),user_name: str = Form(..., description="User's name")):
    """Add a new user with their face embedding."""
    try:
        user_name = validate_user_name(user_name)
        all_users = await database_connector.get_registered_users()

        if user_name in set(all_users):
            return AddUserResponse(
                is_saved=False,
                user_name=user_name,
                message=f"User '{user_name}' already exists"
            )

        async with httpx.AsyncClient() as client:
            contents = await image.read()
            files = {'image': (image.filename, contents, image.content_type)}
            data = {'user_name': user_name}

            response = await client.post(
                f"{ML_SERVICE_URL}/getEmbedding",
                files=files,
                data=data,
                timeout=30.0
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"ML service error: {response.message}"
                )

            ml_response = response.json()
            print(f'Response in Add user: {ml_response}')
            
            if ml_response.get("is_saved") and ml_response.get("embedding"):
                embedding = ml_response["embedding"]
                is_saved = await database_connector.insert(user_name, embedding)

                if not is_saved:
                    return AddUserResponse(
                        is_saved=False,
                        user_name=user_name,
                        message=f"User '{user_name}' already exists"
                    )
                
                return AddUserResponse(
                    is_saved=is_saved,
                    user_name=user_name,
                    message=f"User '{user_name}' added successfully"
                )
            else:
                return AddUserResponse(
                    is_saved=False,
                    user_name=user_name,
                    message=ml_response.get("message","Failed to generate embeddings - no face detected or invalid image"),
                )
                
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"ML service unavailable: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred: {str(e)}"
        )


@api.post("/authenticate", response_model=AuthenticateResponse)
async def authenticate_user(
    image: str = Form(..., description="Base64 encoded image data"),
    threshold: float = Form(0.6, description="Distance threshold for authentication")
) -> AuthenticateResponse:
    """Authenticate a user by comparing against stored embeddings via ML service."""
    try:
        known_face_embeddings_dict = await database_connector.fetch_all()
        # print(f"Known face embeddings: {known_face_embeddings_dict}") 

        if not known_face_embeddings_dict:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="No registered users found"
            )
        
        async with httpx.AsyncClient() as client:
            data = {
                "image": image,
                "known_face_embeddings": json.dumps(known_face_embeddings_dict),
                "threshold": threshold
            }
            
            response = await client.post(
                f"{ML_SERVICE_URL}/authenticate",
                data=data,
                timeout=30.0
            )

            ml_response = response.json()
            print(f'Response in Authenticate user: {ml_response}')

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"ML service error: {response.text}"
                )
            
            # if ml_response.get("is_authenticated") is False:
            #     raise HTTPException(
            #         status_code=status.HTTP_401_UNAUTHORIZED,
            #         detail="Authentication failed, user not recognized"
            #     )
            
            return AuthenticateResponse(
                is_authenticated=ml_response.get("is_authenticated", False),
                user_name=ml_response.get("user_name")
            )
                
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"ML service unavailable: {str(e)}"
        )
    except Exception as e:
        print(e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred: {str(e)}"
        )

@api.delete("/deleteUser/{user_name}", response_model=DeleteUserResponse)
async def delete_user(user_name: str) -> DeleteUserResponse:
    """Delete a user from the database."""
    try:
        user_name = validate_user_name(user_name)
        is_deleted = await database_connector.delete_user(user_name)
        
        return DeleteUserResponse(
            is_deleted=is_deleted,
            user_name=user_name,
            message=f"User '{user_name}' deleted successfully" if is_deleted else f"User '{user_name}' not found"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=str(e)
        )

if __name__ == "__main__":
    uvicorn.run("main:api", host="0.0.0.0", port=8001, reload=True)