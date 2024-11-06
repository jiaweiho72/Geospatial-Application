# Blockfinder
A web application with a Next.js frontend and a FastAPI backend. The application uses PostgreSQL for the database and is styled with Tailwind CSS. The app can be easily run using Docker and Docker Compose.

## Table of Contents
- Prerequisites
- Setup Instructions
    1. Clone the Repository
    2. Environment Setup
    3. Running the Application
- Technologies Used

## Prerequisites
Ensure you have the following tools installed on your machine:
- Docker
- Docker Compose

## Setup Instructions
### 1. Clone the Repository

First, clone the project repository from GitHub:
```
git clone <repository-url>
cd <repository-folder>
```
Ensure that you have the necessary git-credentials


### 2. Environment Setup

The application requires two environment configuration files:
- .env for the backend
- .env.local for the frontend
To make this process easier, there are example environment files provided for you.

> Skip this step if there are already .env and .env.local present

**Backend (.env)**

Navigate to the backend/ folder:

```
cd backend
```

Copy the example environment file:

```
cp .env.example .env
```

Now, open the newly created .env file and set your PostgreSQL database credentials:

```
POSTGRES_USER=<username>
POSTGRES_PASSWORD=<password>
POSTGRES_HOST=<database_host>
POSTGRES_PORT=<database_port>
POSTGRES_DB=<database_name>
```

Make sure to replace <database_host>, <database_port>, <database_name> etc. with your actual PostgreSQL credentials.

**Frontend (.env.local)**

Navigate to the frontend/ folder:

```
cd ../frontend
```

Copy the example environment file:

```
cp .env.local.example .env.local
```

Set the API URL in the .env.local file. This should point to the FastAPI backend (running in the Docker container):

```
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000/api/v1
```

### 3. Running the Application

You can run both the frontend and backend using Docker Compose, which will handle setting up the necessary containers (frontend, backend, and database):

Navigate back to the root directory of the project and run:

```
docker-compose up --build
```
This will build and start all the containers.

Once the containers are running:

The frontend will be available at http://localhost:3000/blockfinder3/container/blockfindercontainers-sp7as-frontend
The backend API will be available at http://localhost:8000
The PostgreSQL database will run inside the Docker container
To stop the application, press Ctrl+C in the terminal or run:

```
docker-compose down
```

### Miscellaneous
- Model endpoint: Ensure that the model selected in lvm.py has been deployed on the gpuserver.

## Technologies Used
- **Frontend**: Next.js, Tailwind CSS, TypeScript
- **Backend**: FastAPI
- **Database**: PostgreSQL
- **Containerization**: Docker, Docker Compose



