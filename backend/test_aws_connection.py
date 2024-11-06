import psycopg2
from psycopg2 import sql
import os
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_HOST = os.getenv("POSTGRES_HOST")
POSTGRES_PORT = os.getenv("POSTGRES_PORT")
POSTGRES_DB = os.getenv("POSTGRES_DB")

db_host = POSTGRES_HOST
db_port = POSTGRES_PORT
db_name = POSTGRES_DB
db_user = POSTGRES_USER
db_password = POSTGRES_PASSWORD

try:
    # Establish the connection
    connection = psycopg2.connect(
        host=db_host,
        port=db_port,
        dbname=db_name,
        user=db_user,
        password=db_password
    )

    # Create a cursor object
    cursor = connection.cursor()

    # Execute a simple query
    cursor.execute("SELECT version();")

    # Fetch and print the result of the query
    record = cursor.fetchone()
    print("You are connected to - ", record, "\n")

except Exception as error:
    print("Error while connecting to PostgreSQL", error)

finally:
    # Close the cursor and connection
    if cursor:
        cursor.close()
    if connection:
        connection.close()
