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
        if not self.client.has_collection(name=self.collection_name):
            print("Creating collection...")
            self.client.create_collection(name=self.collection_name, embedding_function=None)
    
    async def insert(self, user_name: str, embedding: list):
        """Insert a new user with their name and embedding into the collection."""
        if self.collection is None:
            raise ValueError("Collection is not initialized.")
        
        # Cehck if user already exists
        existing_users = self.collection.get(where={"user_name": user_name})
        if existing_users and len(existing_users['documents']) > 0:
            print(f"User {user_name} already exists in the collection. Skipping insertion.")
            return False
        
        print(f"Inserting user {user_name} into the collection...")
        # Inserting a user_name , embedding pair into the collection
        self.collection.add(
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
            existing_users = self.collection.get(where={"user_name": user_name})
            if not existing_users or len(existing_users['documents']) == 0:
                print(f"User {user_name} does not exist in the collection.")
                return False
        except Exception as e:
            print(f"Error checking user existence: {str(e)}")
            return False
        self.collection.delete(where={"user_name": user_name})
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
        