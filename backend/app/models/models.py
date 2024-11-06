from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, Enum
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.db import Base
from geoalchemy2 import Geometry
import enum

class StatusEnum(enum.Enum):
    clear = "clear"
    temporary = "temporary"
    permanent = "permanent"

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
    latest_status = Column(Enum(StatusEnum), default=StatusEnum.clear, nullable=False, index=True)

    def __repr__(self):
        return f"<Polygon(id={self.id}, name={self.name}, address={self.address}, type={self.type}, latest_status={self.latest_status})>"


# class Polygon(Base):
#     __tablename__ = "polygons"

#     id = Column(Integer, primary_key=True, index=True, autoincrement=True)
#     created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
#     updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
#     deleted_at = Column(DateTime(timezone=True), nullable=True)
#     name = Column(String, index=True)
#     address = Column(String, index=True)
#     type = Column(String, index=True)
#     coordinates = Column(Geometry('POLYGON'))

#     def __repr__(self):
#         return f"<Polygon(id={self.id}, name={self.name}, address={self.address}, type={self.type})>"

class Image(Base):
    __tablename__ = "images"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True), nullable=True)
    label = Column(String, unique=False, index=True, nullable=True)
    location = Column(String, unique=False, index=True, nullable=True)
    filename = Column(String, unique=False, index=True, nullable=False)
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
    filename = Column(String, unique=False, index=True, nullable=False)
    s3_key = Column(String, unique=True, nullable=False)
    # polygon_id = Column(Integer, ForeignKey('polygons.id'), nullable=False)
    polygon_id = Column(Integer, ForeignKey('polygons.id', ondelete='CASCADE'), nullable=False)  # Add cascade here

    data = Column(JSONB)

    image = relationship("Image", back_populates="cropped_images")
    polygon = relationship("Polygon")

    def __repr__(self):
        return f"<CroppedImage(id={self.id}, filename={self.filename}, s3_key={self.s3_key}, image_id={self.image_id}, polygon_id={self.polygon_id})>"
