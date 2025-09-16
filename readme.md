# Anti-Spoofing Face Recognition MLOps

A production-ready anti-spoofing face recognition system built with MLOps best practices, featuring microservices architecture, containerized deployment, orchestrated multi-service communication, and comprehensive testing infrastructure.

## 🎯 Project Overview

This project demonstrates a complete MLOps pipeline for deploying machine learning models in production. It implements a face recognition system with anti-spoofing capabilities using a distributed microservices architecture. The system can detect whether a face presented to the camera is real (live person) or fake (photo, video, or other spoofing attempt), making it suitable for secure authentication applications.

## 🏗️ Architecture Overview

This project demonstrates modern MLOps practices through a microservices-based face recognition system. The architecture separates concerns into three independent services, each with a specific responsibility.

### Microservices Architecture Explained

```
                            ┌─────────────────┐
                            │  Nginx Proxy    │
                            │  (Orchestrator) │
                            │    Port: 80     │
                            └─────────┬───────┘
                                      │
                ┌─────────────────────┼─────────────────────┐
                │                     │                     │
        ┌───────▼───────┐    ┌────────▼──────┐    ┌────────▼──────┐
        │   React UI    │    │ Database API  │    │   ML Model    │
        │  (Frontend)   │◄──►│  (Middleware) │◄──►│ (Inference)   │
        │  Port: 5000   │    │  Port: 8001   │    │  Port: 8000   │
        └───────────────┘    └───────────────┘    └───────────────┘
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
### 5. **Comprehensive Testing**


## How it Works:
1. **User Registration Flow**:
   ```
   UI captures image → Nginx Proxy routes request → Database API receives request → Calls ML service for face processing → Stores embeddings → Returns Success/failure via Nginx → UI
   ```

2. **Authentication Flow**:
   ```
   UI captures image → Nginx Proxy routes request → Database API → ML service checks for spoofing → If real face, compare with stored embeddings → Return match result via Nginx → UI
   ```

## 🚀 Deployment Guide

### Step-by-Step Local Deployment

#### 1. **Clone and Setup**
```bash
git clone https://github.com/Potladurthy-Sai-Praneeth/Deployment_and_contanerization_of_anti_spooing.git
cd Deployment_and_contanerization_of_anti_spooing/cloud_deployment
```

#### 2. **Build and Start Services**
```bash
docker-compose up 
```

#### 3. **Access Services**
- **Web UI**: http://localhost

### Cloud Deployment (AWS)

#### 1. **Prerequisites**
- AWS EC2 instance with Docker and Docker Compose installed
- Security group configured to allow HTTP traffic on port 80

#### 2. **Deploy to Cloud**
```bash
# SSH into your EC2 instance
ssh -i your-key.pem ubuntu@your-ec2-ip

# Clone the repository
git clone https://github.com/Potladurthy-Sai-Praneeth/Deployment_and_contanerization_of_anti_spooing.git
cd Deployment_and_contanerization_of_anti_spooing/cloud_deployment

# Build and start services
docker-compose up -d
```

#### 3. **Access Live Application**
- **Production Web UI**: http://amiaspoof.me || http://<your-ec2-ip>
