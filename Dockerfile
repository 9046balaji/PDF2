# --- Stage 1: Builder ---
# This stage installs dependencies. It can be discarded later.
FROM python:3.12-slim as builder

# Set environment variables for a cleaner build
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install dependencies
RUN pip install --upgrade pip
COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /app/wheels -r requirements.txt


# --- Stage 2: Final Image ---
# This is the lean image that will be deployed.
FROM python:3.12-slim

WORKDIR /app

# Create a dedicated, non-root user for security
RUN addgroup --system app && adduser --system --group app

# Copy installed dependencies from the builder stage
COPY --from=builder /app/wheels /wheels
RUN pip install --no-cache /wheels/*

# Copy the application code and set ownership
COPY --chown=app:app . .

# Switch to the non-root user
USER app

# Expose the port the app runs on
EXPOSE 5000

# Use Gunicorn to run the app in production
# The number of workers is a starting point; adjust based on your server's CPU cores.
CMD ["gunicorn", "--workers=4", "--bind", "0.0.0.0:5000", "app:app"]