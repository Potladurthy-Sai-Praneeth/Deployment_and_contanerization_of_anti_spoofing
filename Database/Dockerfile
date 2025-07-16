FROM python:3.12-slim-bookworm

WORKDIR /api

RUN apt-get update && apt-get install -y \
    curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

COPY . .
RUN mkdir -p /api/database

EXPOSE 8001

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:8001/health || exit 1

CMD ["python", "main.py"]






# FROM python:3.12-slim-bookworm AS builder

# WORKDIR /api

# RUN apt-get update && apt-get install -y \
#     curl \
#     && rm -rf /var/lib/apt/lists/*

# COPY requirements.txt .
# RUN pip install --user --no-cache-dir -r requirements.txt

# FROM python:3.12-slim-bookworm AS final
# WORKDIR /api
# COPY --from=builder /root/.local /root/.local

# COPY . .
# RUN mkdir -p /api/database

# EXPOSE 8001

# CMD ["python", "main.py"]
