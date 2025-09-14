FROM python:3.12-slim-bookworm AS builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    cmake \
    make \
    curl \
    unzip \
    libopenblas-dev \
    pkg-config \
    && rm -rf /var/lib/apt/lists/*

# Install AWS CLI
RUN curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip" \
    && unzip awscliv2.zip \
    && ./aws/install \
    && rm -rf awscliv2.zip aws
    
ARG AWS_ACCESS_KEY_ID
ARG AWS_SECRET_ACCESS_KEY
ARG AWS_REGION

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir --user dlib==19.24.8
RUN pip install --no-cache-dir --user -r requirements.txt

RUN mkdir -p /app/models

RUN aws s3 cp s3://anti-spoofing-model-bucket/anti_spoofing_quantized.onnx  /app/models/anti_spoofing_quantized.onnx


FROM python:3.12-slim-bookworm AS final

# Install only runtime libraries
RUN apt-get update && apt-get install -y \
    libopenblas0 \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy user packages and models
COPY --from=builder /root/.local /root/.local
COPY --from=builder /app/models /app/models

ENV PATH=/root/.local/bin:$PATH

COPY . .
# Stop the build if there is no model file found
RUN if [ ! -f models/anti_spoofing_quantized.onnx ]; then echo "Model file not found"; exit 1; fi

EXPOSE 8000
CMD ["python", "main.py"]