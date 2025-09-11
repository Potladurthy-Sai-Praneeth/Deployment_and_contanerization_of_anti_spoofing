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

CMD ["python", "main.py"]