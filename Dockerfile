# Multi-stage build for LLM Classroom Platform
FROM node:18-alpine as frontend-build

# Frontend build stage
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci --only=production
COPY frontend/ ./
RUN npm run build

# Python backend stage
FROM python:3.11-slim as backend

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Create app user
RUN useradd --create-home --shell /bin/bash app
USER app
WORKDIR /app

# Install Python dependencies
COPY --chown=app:app backend/requirements.txt ./
RUN pip install --user --no-cache-dir -r requirements.txt

# Copy backend code
COPY --chown=app:app backend/ ./

# Copy built frontend
COPY --from=frontend-build --chown=app:app /app/frontend/dist ./static

# Create directories for data and logs
RUN mkdir -p data logs

# Proto4 backend dependencies
COPY --chown=app:app prototypes/proto4/backend/requirements.txt ./proto4_requirements.txt
RUN pip install --user --no-cache-dir -r proto4_requirements.txt

# Copy Proto4 backend
COPY --chown=app:app prototypes/proto4/backend/ ./proto4/

# Expose ports
EXPOSE 3000 3001

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Start script
COPY --chown=app:app scripts/start-production.sh ./
RUN chmod +x start-production.sh

CMD ["./start-production.sh"]