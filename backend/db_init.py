import os
from sqlalchemy import create_engine, Column, Integer, String, inspect, text, ForeignKey, DateTime, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import declarative_base, relationship, sessionmaker
from geoalchemy2 import Geometry
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

# Define the base
Base = declarative_base()

class Polygon(Base):
    __tablename__ = "polygons"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    name = Column(String, index=True)
    address = Column(String, index=True)
    type = Column(String, index=True)
    coordinates = Column(Geometry('POLYGON'))

    def __repr__(self):
        return f"<Polygon(id={self.id}, name={self.name}, address={self.address}, type={self.type})>"

class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    label = Column(String, unique=False, index=True, nullable=True)
    location = Column(String, unique=False, index=True, nullable=True)
    filename = Column(String, unique=True, index=True, nullable=False)
    original_s3_key = Column(String, unique=True, nullable=True)
    annotated_s3_key = Column(String, unique=True, nullable=True)
    processing_status = Column(Integer, default=0)

    # Relationship to CroppedImage with cascading deletes
    cropped_images = relationship("CroppedImage", back_populates="image", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Image(id={self.id}, filename={self.filename}, original_s3_key={self.original_s3_key})>"

class CroppedImage(Base):
    __tablename__ = 'cropped_images'

    id = Column(Integer, primary_key=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    image_id = Column(Integer, ForeignKey('images.id', ondelete='CASCADE'), nullable=False)
    filename = Column(String, unique=True, index=True, nullable=False)
    s3_key = Column(String, unique=True, nullable=False)
    polygon_id = Column(Integer, ForeignKey('polygons.id'), nullable=False)
    data = Column(JSONB)

    image = relationship("Image", back_populates="cropped_images")
    polygon = relationship("Polygon")
    # analysis = relationship("CroppedImageAnalysis", uselist=False, back_populates="cropped_image", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<CroppedImage(id={self.id}, filename={self.filename}, s3_key={self.s3_key}, image_id={self.image_id}, polygon_id={self.polygon_id})>"

# class CroppedImageAnalysis(Base):
#     __tablename__ = 'cropped_image_analyses'

#     id = Column(Integer, primary_key=True, autoincrement=True)
#     created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
#     updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
#     deleted_at = Column(DateTime(timezone=True), nullable=True)
#     cropped_image_id = Column(Integer, ForeignKey('cropped_images.id', ondelete='CASCADE'), nullable=False)
#     data = Column(String, nullable=False)

#     cropped_image = relationship("CroppedImage", back_populates="analysis")

#     def __repr__(self):
#         return f"<CroppedImageAnalysis(id={self.id}, cropped_image_id={self.cropped_image_id}, analysis_data={self.analysis_data})>"

def create_tables():
    try:
        # Create postgis extension if not exists
        with engine.connect() as connection:
            with connection.begin():
                connection.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))

        # Create all tables defined in the Base's metadata
        Base.metadata.create_all(engine)
        print("All tables created successfully!")
    except Exception as e:
        print(f"An error occurred: {e}")

# Run the table creation function
if __name__ == "__main__":
    create_tables()
