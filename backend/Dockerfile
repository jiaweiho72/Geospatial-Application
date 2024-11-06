FROM python:3.12-slim

# Install necessary system packages
RUN apt-get update && apt-get install -y \
    build-essential \
    gdal-bin \
    libgdal-dev \
    libmagic1 \
    python3-dev \
    libgl1-mesa-glx \
    libglib2.0-0 \
    libsm6 \
    libxrender1 \
    libxext6 \
    && apt-get clean

# Upgrade pip
RUN pip install --upgrade pip

# Set the working directory
WORKDIR /app

# Copy the requirements.txt file
COPY requirements.txt .

# Install build tools first to avoid errors
RUN pip install --no-cache-dir setuptools wheel cython

# Install the required Python packages
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of your application code
COPY . .

# Expose port 8000 for the FastAPI application
EXPOSE 8000

# Create persistent directory for file uploads
RUN mkdir -p /app/uploads

# Command to run the application using Uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
