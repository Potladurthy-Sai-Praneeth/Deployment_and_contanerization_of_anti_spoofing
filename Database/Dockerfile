FROM python:3.12-slim-bookworm

WORKDIR /api

RUN apt-get update && apt-get install -y \
    && rm -rf /var/lib/apt/lists/*

COPY . .
RUN pip install --no-cache-dir -r requirements.txt

RUN mkdir -p /api/database

EXPOSE 8001

CMD ['python', 'main.py']
