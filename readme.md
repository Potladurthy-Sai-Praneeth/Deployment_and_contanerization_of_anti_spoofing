# Anti-Spoofing Face Recognition MLOps

A production-ready anti-spoofing face recognition system built with MLOps best practices, featuring microservices architecture, containerized deployment, orchestrated multi-service communication, and comprehensive testing infrastructure.

## 🎯 Project Overview

This project demonstrates a complete MLOps pipeline for deploying machine learning models in production. It implements a face recognition system with anti-spoofing capabilities using a distributed microservices architecture. The system can detect whether a face presented to the camera is real (live person) or fake (photo, video, or other spoofing attempt), making it suitable for secure authentication applications.

## 🏗️ Architecture Overview

This project demonstrates modern MLOps practices through a microservices-based face recognition system. The architecture separates concerns into three independent services, each with a specific responsibility.

### Microservices Architecture Explained

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React UI      │    │   Database API   │    │   ML Model      │
│   (Frontend)    │◄──►│   (Orchestrator) │◄──►│   (Inference)   │
│   Port: 5000    │    │   Port: 8001     │    │   Port: 8000    │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

**Why Microservices for ML?**
- **Scalability**: Each service can be scaled independently based on demand
- **Maintainability**: Updates to ML models don't affect the UI or database
- **Technology Flexibility**: Each service can use different tech stacks
- **Fault Isolation**: If one service fails, others continue operating
- **Team Independence**: Different teams can work on different services

### Service Responsibilities

#### 1. **ML Model Service (Port 8000)**
- **Purpose**: Handles all machine learning inference tasks
- **Technology**: FastAPI + ONNX Runtime for optimized inference
- **Functions**: 
  - Face detection and recognition
  - Anti-spoofing detection
  - Face embedding generation
- **Benefits**: Isolated ML environment, easy model updates, GPU optimization

#### 2. **Database API Service (Port 8001)**
- **Purpose**: Central orchestrator managing business logic and data
- **Technology**: FastAPI + ChromaDB(vector database) for persistence
- **Functions**:
  - User registration and management
  - Coordinates ML service calls
  - Handles authentication workflows
  - Manages user face embeddings
- **Benefits**: Centralized business logic, API gateway pattern, data consistency

#### 3. **UI Service (Port 5000)**
- **Purpose**: User interface for system interaction
- **Technology**: React 18 with modern hooks and state management
- **Functions**:
  - User registration interface
  - Camera integration for face capture
  - Authentication workflows
  - Results visualization
- **Benefits**: Responsive design, real-time camera integration, modern UX


## 🚀 MLOps Features & Best Practices

### 1. **Containerized Microservices**
### 2. **Service Orchestration with Docker Compose**
### 3. **Inter-Service Communication**
### 4. **CI/CD Pipeline**


## How it Works:
1. **User Registration Flow**:
   ```
   UI captures image → Database API receives request →  Calls ML service for face processing → Stores embeddings →  Returns Success/failure to UI
   ```

2. **Authentication Flow**:
   ```
   UI captures image → Database API → ML service checks for spoofing →  If real face, compare with stored embeddings → Return match result
   ```

### Step-by-Step Deployment

#### 1. **Clone and Setup**
```bash
git clone https://github.com/Potladurthy-Sai-Praneeth/Deployment_and_contanerization_of_anti_spooing.git
cd Deployment_and_contanerization_of_anti_spooing
```

#### 2. **Build and Start Services**
```bash
docker-compose up --build
```

#### 4. **Access Services**
- **Frontend**: http://localhost:5000 - Main user interface
- **Database API Docs**: http://localhost:8001/docs - API documentation  
- **ML Model Docs**: http://localhost:8000/docs - ML service documentation


## 📁 Project Structure

```
├── docker-compose.yml          # Orchestration configuration
├── Database/                   # API Gateway & Business Logic
│   ├── Dockerfile             # Container definition
│   ├── main.py                # FastAPI application entry point
│   ├── database.py            # Data persistence layer
│   └── requirements.txt       # Python dependencies
├── ml-model/                   # ML Inference Service
│   ├── Dockerfile             # Multi-stage build for CV dependencies
│   ├── main.py                # FastAPI ML API server
│   ├── authenticate.py        # Face matching and anti-spoofing logic
│   ├── models/                # ONNX model artifacts
│   │   └── anti_spoofing_quantized.onnx
│   └── requirements.txt       # ML-specific dependencies
├── UI/                        # React Frontend
│   ├── Dockerfile             # Node.js build + production serve
│   ├── src/                   # React source code
│   │   ├── components/        # Reusable UI components
│   │   ├── pages/            # Application pages
│   │   └── utils/            # Helper functions
│   ├── public/               # Static assets
│   └── package.json          # Node.js dependencies
├── tests/                     # Comprehensive test suite
│   ├── database/             # Database service tests
│   │   ├── test_database.py           # Unit tests
│   │   ├── test_api_integration.py    # Integration tests
│   │   └── requirements-test.txt      # Test dependencies
│   ├── ml-model/             # ML model service tests
│   │   ├── test_ml_models.py          # Unit tests
│   │   ├── test_ml_api_integration.py # Integration tests
│   │   └── requirements-test.txt      # Test dependencies
│   ├── ui/                   # UI service tests
│   │   ├── test_app.test.js           # App component tests
│   │   ├── test_components.test.js    # Component tests
│   │   ├── test_api_service.test.js   # API service tests
│   │   └── package.json               # Test dependencies
├── .github/                  # CI/CD configuration
│   └── workflows/
│       └── ci_for_tests.yml            # GitHub Actions workflow
```
