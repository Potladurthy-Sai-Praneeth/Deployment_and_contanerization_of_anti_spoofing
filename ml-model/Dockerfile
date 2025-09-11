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

RUN ls -la models/

COPY . .
EXPOSE 8000

CMD ["python", "main.py"]