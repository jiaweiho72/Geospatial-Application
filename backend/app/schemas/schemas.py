from pydantic import BaseModel
from typing import List, Optional, Dict, Any
from datetime import datetime
from app import models

# -------------------------------- Polygons --------------------------------
class PolygonBase(BaseModel):
    name: Optional[str]
    address: Optional[str]
    type: Optional[str]
    coordinates: List[List[float]]

class PolygonCreate(PolygonBase):
    pass

class PolygonUpdate(PolygonBase):
    pass

class Polygon(PolygonBase):
    id: int
    latest_status: Optional[models.StatusEnum]

    class Config:
        from_attributes = True
        use_enum_values = True  # This makes the enum field return the enum's value instead of the enum object


# -------------------------------- Cropped Image --------------------------------
class CroppedImageBase(BaseModel):
    image_id: int
    polygon_id: int
    filename: str
    s3_key: str

class CroppedImageCreate(CroppedImageBase):
    pass

class CroppedImageUpdate(BaseModel):
    filename: Optional[str]
    s3_key: Optional[str]

class CroppedImage(CroppedImageBase):
    id: int

    class Config:
        from_attributes = True


# -------------------------------- Image --------------------------------
class ImageBase(BaseModel):
    filename: str
    label: Optional[str] = None
    location: Optional[str] = None
    original_s3_key: Optional[str] = None
    annotated_s3_key: Optional[str] = None

class ImageCreate(ImageBase):
    pass

class ImageUpdate(ImageBase):
    pass

class ImageUpdateAnnotatedPNG(BaseModel):
    annotated_s3_key: str

class ImageUpdateLocation(BaseModel):
    location: str

class Image(ImageBase):
    id: int
    created_at: Optional[datetime]
    updated_at: Optional[datetime]
    deleted_at: Optional[datetime]

    class Config:
        from_attributes = True


# -------------------------------- API responses --------------------------------
class CroppedImageResponse(BaseModel):
    id: int
    filename: str
    url: str
    data: Optional[Dict[str, Any]] = None

class ImageResponse(BaseModel):
    id: int
    created_at: Optional[datetime] = None
    label: Optional[str] = None
    location: Optional[str] = None
    filename: str
    annotated_url: Optional[str] = None

    class Config:
        from_attributes = True

class PolygonResponse(Polygon):
    pass

class FullCroppedImageResponse(CroppedImageResponse):
    polygon: Optional[PolygonResponse] = None

class FullImageResponse(ImageResponse):
    cropped_images: Optional[List[FullCroppedImageResponse]] = None
    class Config:
        from_attributes = True
        
class MetricsResponse(BaseModel):
    status_counts: Dict[str, int]
    total_polygon_count: int
    total_image_count: int
    total_cropped_images: int
    is_vehicle_count: int
    is_flammable_count: int

class PresignedUrlRequest(BaseModel):
    label: str

class HeatMapResponse(BaseModel):
    id: int
    name: str
    coordinates: List[List[float]]
    obstruction_count: int