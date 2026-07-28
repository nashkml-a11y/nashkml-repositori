FROM python:3.11-slim

WORKDIR /srv

RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

COPY requirements-api.txt ./
RUN pip install --no-cache-dir -r requirements-api.txt

COPY alembic.ini ./
COPY migrations ./migrations
COPY app ./app

EXPOSE 8000

# Apply migrations, then start the API. `alembic upgrade head` is idempotent
# (no-op once the DB is already current), so this is safe on every restart.
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000
