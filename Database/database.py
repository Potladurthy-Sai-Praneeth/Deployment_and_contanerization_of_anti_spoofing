import chromadb
import os


class Database:
    def __init__(self, db_path: str):
        self.client = chromadb.PersistentClient(path=db_path)
        self.collection_name = "RegisteredUsers"
        self.collection = None
        self._initialize_collection()
        self.collection = self.client.get_collection(name=self.collection_name)

    def _initialize_collection(self):
        """Initialize the ChromaDB collection if it does not exist."""
        print("Initializing ChromaDB collection...")
        existing_collections = [col.name for col in self.client.list_collections()]
        if self.collection_name not in existing_collections:
            print("Creating collection...")
            self.client.create_collection(name=self.collection_name, embedding_function=None)
    
    async def insert(self, user_name: str, embedding: list):
        """Insert a new user with their name and embedding into the collection."""
        if self.collection is None:
            raise ValueError("Collection is not initialized.")

        if embedding is None or not isinstance(embedding, list):
            raise ValueError("Embedding must be a non-empty list. Found {type(embedding)}")
        
        # Check if user already exists
        try:
            existing_users = self.collection.get(ids=[user_name])
            if existing_users and len(existing_users['documents']) > 0:
                print(f"User {user_name} already exists in the collection. Skipping insertion.")
                return False
        except Exception:
            # User doesn't exist, continue with insertion
            pass
        
        print(f"Inserting user {user_name} into the collection...")
        # Inserting a user_name , embedding pair into the collection
        self.collection.add(
            ids=[user_name],  # Use user_name as unique ID
            documents=[user_name],
            embeddings=[embedding],
            metadatas=[{"user_name": user_name}]
        )

        return True

    async def fetch_all(self):
        """Fetch all users and their embeddings from the collection."""
        if self.collection is None:
            raise ValueError("Collection is not initialized.")
        
        print("Fetching all users from the collection...")
        results = self.collection.get()
        print(f'Found users ')
        print(results)

        if not results or results=={}:# and not results['documents'] or not results['embeddings']:
            return {}
            
        return {doc: emb for doc, emb in zip(results['documents'], results['embeddings'])}


    async def get_registered_users(self):
        """Get all registered users from the collection."""
        if self.collection is None:
            raise ValueError("Collection is not initialized.")
        
        print("Getting registered users...")
        results = self.collection.get()

        return results['documents'] if results else []

    async def delete_user(self, user_name: str):
        """Delete a user from the collection by their name."""
        if self.collection is None:
            raise ValueError("Collection is not initialized.")
        
        print(f"Deleting user {user_name} from the collection...")
        try:
            existing_users = self.collection.get(ids=[user_name])
            if not existing_users or len(existing_users['documents']) == 0:
                print(f"User {user_name} does not exist in the collection.")
                return False
        except Exception as e:
            print(f"User {user_name} does not exist in the collection.")
            return False
            
        self.collection.delete(ids=[user_name])
        print(f"User {user_name} deleted successfully.")
        return True
    
    def close(self):
        """Close the database connection."""
        print("Closing the database connection...")
        try:
            self.client.close()
            return True
        except Exception as e:
            print(f"Error closing the database connection: {str(e)}")
            return False
