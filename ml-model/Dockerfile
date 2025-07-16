# FROM python:3.12-slim-bookworm
# WORKDIR /app

# # Install system dependencies including cmake for dlib compilation
# RUN apt-get update && apt-get install -y \
#     libgl1-mesa-glx \
#     libsm6 \
#     libxext6 \
#     libfontconfig1 \
#     libxrender1 \
#     libglib2.0-0 \
#     libgstreamer1.0-0 \
#     libgstreamer-plugins-base1.0-0 \
#     unzip \
#     curl \
#     cmake \
#     build-essential \
#     libopenblas-dev \
#     liblapack-dev \
#     libatlas-base-dev \
#     gfortran \
#     && rm -rf /var/lib/apt/lists/*

# # RUN mkdir -p /app/models
# # COPY models/ /app/models/

# RUN curl -sSL "https://drive.usercontent.google.com/download?id=1p0abA5sYGOLoxdrJBuCz0iJyd5ZboJ6P&export=download" -o models.zip && \
# unzip models.zip -d app && \
# rm models.zip || echo "Model download failed, ensure models are copied manually"

# RUN ls -la /app/models/

# COPY requirements.txt .
# RUN pip install --no-cache-dir dlib==19.24.8
# RUN pip install --no-cache-dir -r requirements.txt

# COPY . .

# EXPOSE 8000

# CMD ["python", "main.py"]


FROM python:3.12-slim-bookworm AS base

RUN apt-get update && apt-get install -y \
    cmake \
    build-essential \
    libopenblas-dev \
    liblapack-dev \
    libatlas-base-dev \
    gfortran \
    && rm -rf /var/lib/apt/lists/*
    
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --user dlib==19.24.8
RUN pip install --no-cache-dir --user -r requirements.txt


FROM python:3.12-slim-bookworm AS final

RUN apt-get update && apt-get install -y \
    libopenblas0 \
    libgomp1 \
    curl \
    && rm -rf /var/lib/apt/lists/* \
    && apt-get clean

WORKDIR /app
COPY --from=base /root/.local /root/.local

RUN mkdir -p /app/models
COPY models/ /app/models/

# RUN curl -sSL "https://drive.usercontent.google.com/download?id=1p0abA5sYGOLoxdrJBuCz0iJyd5ZboJ6P&export=download" -o models.zip && \
# unzip models.zip  && \
# rm models.zip || echo "Model download failed, ensure models are copied manually"

RUN ls -la models/

COPY . .
EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8000/health || exit 1

CMD ["python", "main.py"]