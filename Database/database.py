import chromadb
import os
import time


class Database:
    def __init__(self, db_path: str):
        # Ensure the database directory exists
        os.makedirs(db_path, exist_ok=True)
        
        # Initialize ChromaDB client with retry logic
        max_retries = 3
        retry_delay = 1
        
        for attempt in range(max_retries):
            try:
                self.client = chromadb.PersistentClient(path=db_path)
                break
            except Exception as e:
                if attempt < max_retries - 1:
                    print(f"Failed to initialize ChromaDB client (attempt {attempt + 1}): {e}")
                    time.sleep(retry_delay)
                    retry_delay *= 2
                else:
                    raise RuntimeError(f"Failed to initialize ChromaDB client after {max_retries} attempts: {e}")
        
        self.collection_name = "RegisteredUsers"
        self.collection = None
        self._initialize_collection()

    def _initialize_collection(self):        
        print("Initializing ChromaDB collection...")
        try:
            existing_collections = [col.name for col in self.client.list_collections()]
            if self.collection_name not in existing_collections:
                print("Creating collection...")
                self.collection = self.client.create_collection(
                    name=self.collection_name, 
                    embedding_function=None
                )
            else:
                print("Collection already exists, getting reference...")
                self.collection = self.client.get_collection(name=self.collection_name)
            
            print(f"Collection '{self.collection_name}' initialized successfully")
        except Exception as e:
            raise RuntimeError(f"Failed to initialize collection: {e}")
    
    async def insert(self, user_name: str, embedding: list):
        """Insert a new user with their name and embedding into the collection."""
        if self.collection is None:
            raise ValueError("Collection is not initialized.")

        if embedding is None or not isinstance(embedding, list) or len(embedding) == 0:
            raise ValueError(f"Embedding must be a non-empty list. Found {type(embedding)} with length {len(embedding) if embedding else 0}")
        
        try:
            print(f"Inserting user '{user_name}' into the collection...")
            
            # Check if user already exists
            existing_users = self.collection.get(ids=[user_name])
            if existing_users and existing_users.get('ids') and len(existing_users['ids']) > 0:
                print(f"User '{user_name}' already exists in collection")
                return False
            
            # Insert user_name, embedding pair into the collection
            self.collection.add(
                ids=[user_name],  # Use user_name as unique ID
                documents=[user_name],
                embeddings=[embedding],
                metadatas=[{"user_name": user_name}]
            )
            print(f"User '{user_name}' inserted successfully.")
            return True
        except Exception as e:
            print(f"Error inserting user '{user_name}': {e}")
            return False
    
    async def fetch_all(self):
        """Fetch all users and their embeddings from the collection."""
        if self.collection is None:
            raise ValueError("Collection is not initialized.")
        
        print("Fetching all users from the collection...")
        try:
            results = self.collection.get(include=['documents', 'embeddings', 'metadatas'])

            if not results or not results.get('documents') or len(results.get('embeddings', [])) == 0:
                return {}
            
            user_embeddings = {}
            for doc, emb in zip(results['documents'], results['embeddings']):
                try:
                    if hasattr(emb, 'tolist'):
                        user_embeddings[doc] = emb.tolist()
                    else:
                        user_embeddings[doc] = list(emb)
                except Exception as e:
                    print(f"Error converting embedding for user {doc}: {e}")
                    continue
            
            return user_embeddings
        except Exception as e:
            print(f"Error fetching all users: {e}")
            return {}

    async def get_registered_users(self):
        """Get all registered users from the collection."""
        if self.collection is None:
            raise ValueError("Collection is not initialized.")
        
        try:
            print("Getting registered users...")
            results = self.collection.get()
            
            if not results or not results.get('documents'):
                print("No registered users found")
                return []
            
            return results['documents']
        except Exception as e:
            print(f"Error getting registered users: {e}")
            return []

    async def delete_user(self, user_name: str):
        """Delete a user from the collection by their name."""
        if self.collection is None:
            raise ValueError("Collection is not initialized.")
        
        try:
            print(f"Deleting user '{user_name}' from the collection...")
            
            # Check if user exists first
            existing_users = self.collection.get(ids=[user_name])
            if not existing_users or not existing_users.get('ids') or len(existing_users['ids']) == 0:
                print(f"User '{user_name}' does not exist in the collection.")
                return False
            
            self.collection.delete(ids=[user_name])
            print(f"User '{user_name}' deleted successfully.")
            return True
        except Exception as e:
            print(f"Error deleting user '{user_name}': {e}")
            return False
    
    def close(self):
        """Close the database connection."""
        print("Closing the database connection...")
        try:
            self.client.close()
            return True
        except Exception as e:
            print(f"Error closing the database connection: {str(e)}")
            return False