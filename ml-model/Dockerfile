FROM python:3.12-slim-bookworm
WORKDIR /app

# Install system dependencies including cmake for dlib compilation
RUN apt-get update && apt-get install -y \
    libgl1-mesa-glx \
    libsm6 \
    libxext6 \
    libfontconfig1 \
    libxrender1 \
    libglib2.0-0 \
    libgstreamer1.0-0 \
    libgstreamer-plugins-base1.0-0 \
    unzip \
    curl \
    cmake \
    build-essential \
    libopenblas-dev \
    liblapack-dev \
    libatlas-base-dev \
    gfortran \
    && rm -rf /var/lib/apt/lists/*

RUN mkdir -p /app/models

COPY requirements.txt .
RUN pip install dlib==19.24.8
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN curl -sSL "https://drive.usercontent.google.com/download?id=1p0abA5sYGOLoxdrJBuCz0iJyd5ZboJ6P&export=download&confirm" -o models.zip && \
    unzip models.zip -d /app/models && \
    rm models.zip || echo "Model download failed, ensure models are copied manually"

EXPOSE 8000

CMD ["python", "main.py"]


