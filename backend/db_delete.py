import os
from sqlalchemy import create_engine, inspect, text
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Retrieve database connection details from environment variables
POSTGRES_USER = os.getenv("POSTGRES_USER")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD")
POSTGRES_HOST = os.getenv("POSTGRES_HOST")
POSTGRES_PORT = os.getenv("POSTGRES_PORT")
POSTGRES_DB = os.getenv("POSTGRES_DB")

# Construct the database URL
SQLALCHEMY_DATABASE_URL = f"postgresql://{POSTGRES_USER}:{POSTGRES_PASSWORD}@{POSTGRES_HOST}:{POSTGRES_PORT}/{POSTGRES_DB}"

# Create the engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

def drop_images_table():
    try:
        inspector = inspect(engine)
        
        # Check if images table exists
        if inspector.has_table('images'):
            with engine.connect() as connection:
                with connection.begin():
                    connection.execute(text("DROP TABLE IF EXISTS cropped_images CASCADE"))
                    connection.execute(text("DROP TABLE IF EXISTS images CASCADE"))
            print("Table 'images' and its associated table 'cropped_images' dropped successfully!")
        else:
            print("Table 'images' does not exist. Nothing to drop.")

        # if inspector.has_table('polygons'):
        #     with engine.connect() as connection:
        #         with connection.begin():
        #             connection.execute(text("DROP TABLE IF EXISTS polygons CASCADE"))
        #     print("Table 'polygons' dropped successfully!")
        # else:
        #     print("Table 'polygons' does not exist. Nothing to drop.")

    except Exception as e:
        print(f"An error occurred: {e}")

# Run the table deletion function
if __name__ == "__main__":
    drop_images_table()
