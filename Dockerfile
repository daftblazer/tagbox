# ---- frontend build stage ----
FROM node:22-alpine AS frontend-build
WORKDIR /frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- backend runtime ----
FROM python:3.12-slim AS runtime
WORKDIR /app

COPY backend/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app ./app
COPY --from=frontend-build /frontend/dist ./frontend_dist

ENV TAGBOX_CONFIG=/config/libraries.yaml \
    TAGBOX_DATA_DIR=/data \
    TAGBOX_FRONTEND_DIST=/app/frontend_dist \
    PYTHONUNBUFFERED=1

EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
