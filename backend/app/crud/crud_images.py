from sqlalchemy.orm import Session
from app import models, schemas
from shapely.geometry import Polygon
from geoalchemy2.shape import from_shape, to_shape
from shapely.geometry import mapping, box
from sqlalchemy import asc, desc
from sqlalchemy.sql import func
from sqlalchemy.orm import joinedload 
from fastapi import HTTPException
import boto3
import os
from dotenv import load_dotenv


# -------------------------------- Connection to AWS - Access Keys Version --------------------------------
from botocore.client import Config

load_dotenv()  

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION")
BUCKET_NAME = os.getenv("BUCKET_NAME")
PREFIX_DRONE_MAP = os.getenv("PREFIX_DRONE_MAP")

s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
    config=Config(signature_version='s3v4'),
)

def generate_presigned_url(s3_key: str, expiration: int = 3600):
    try:
        url = s3_client.generate_presigned_url(
            ClientMethod='get_object',
            Params={'Bucket': BUCKET_NAME, 'Key': s3_key},
            ExpiresIn=expiration,
            HttpMethod='GET'
        )
        return url
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# -------------------------------- Connection to AWS - Web Identity Version --------------------------------
# from botocore.config import Config
# from botocore.exceptions import ClientError
# import time

# s3_client = None
# credentials_expiration = None

# def get_s3_client():
#     global s3_client, credentials_expiration
    
#     # Check if credentials are expired or s3_client is None
#     if s3_client is None or credentials_expiration is None or time.time() >= credentials_expiration:
#         # Load the web identity token
#         web_identity_token_file = os.getenv("AWS_WEB_IDENTITY_TOKEN_FILE")
#         role_arn = os.getenv("AWS_ROLE_ARN")

#         # Create an STS client
#         sts_client = boto3.client('sts')

#         # Assume the role using the web identity token
#         response = sts_client.assume_role_with_web_identity(
#             RoleArn=role_arn,
#             RoleSessionName='my-session',
#             WebIdentityToken=open(web_identity_token_file).read()
#         )

#         # Get temporary credentials
#         credentials = response['Credentials']
        
#         # Set the expiration time for the credentials
#         credentials_expiration = credentials['Expiration'].timestamp()

#         # Create and return the S3 client using the temporary credentials
#         s3_client = boto3.client(
#             's3',
#             aws_access_key_id=credentials['AccessKeyId'],
#             aws_secret_access_key=credentials['SecretAccessKey'],
#             aws_session_token=credentials['SessionToken'],
#             config=Config(signature_version='s3v4')
#         )

#     return s3_client

# # Use this to generate presigned URL
# def generate_presigned_url(s3_key: str, expiration: int = 3600):
#     try:
#         s3_client = get_s3_client()  # Ensure client is refreshed if needed
#         url = s3_client.generate_presigned_url(
#             ClientMethod='get_object',
#             Params={'Bucket': BUCKET_NAME, 'Key': s3_key},
#             ExpiresIn=expiration,
#             HttpMethod='GET'
#         )
#         return url
#     except ClientError as e:
#         raise HTTPException(status_code=500, detail=str(e))




# -------------------------------- CRUD --------------------------------
def create_image(db: Session, image: schemas.ImageCreate):
    db_image = models.Image(**image.dict())
    db.add(db_image)
    db.commit()
    db.refresh(db_image)
    return db_image

def get_images(
    db: Session,
    skip: int = 0,
    limit: int = None,
    sort_by: str = 'created_at',
    sort_order: str = 'desc'
):
    # Define sorting direction
    sort_direction = asc if sort_order == 'asc' else desc
    
    # Dynamically construct the sort column
    if sort_by not in ['created_at', 'filename']:  # Adjust this list based on your actual columns
        sort_by = 'created_at'  # Default to 'created_at' if invalid column
    
    sort_column = getattr(models.Image, sort_by)

    # Query with sorting
    return (
        db.query(models.Image)
        .order_by(sort_direction(sort_column))
        .offset(skip)
        .limit(limit)
        .all()
    )

def get_image_by_id(db: Session, image_id: int):
    return db.query(models.Image).options(joinedload(models.Image.cropped_images)).filter(models.Image.id == image_id).first()


def update_image_s3_key(db: Session, image_id: int, image_original_s3_key: str):
    db_image = db.query(models.Image).filter(models.Image.id == image_id).first()
    if db_image:
        db_image.original_s3_key = image_original_s3_key
        db.commit()
        db.refresh(db_image)
    return db_image

def update_image(db: Session, image_id: int, **kwargs):
    db_image = db.query(models.Image).filter(models.Image.id == image_id).first()
    if db_image:
        for key, value in kwargs.items():
            if hasattr(db_image, key):
                setattr(db_image, key, value)
        db.commit()
        db.refresh(db_image)
        return db_image
    else:
        raise HTTPException(status_code=404, detail="Image not found")

def delete_image(db: Session, image_id: int):
    db_image = db.query(models.Image).filter(models.Image.id == image_id).first()
    if db_image:
        db.delete(db_image)
        db.commit()
    return db_image

def get_image_by_filename(db: Session, filename: str):
    return db.query(models.Image).filter(models.Image.filename == filename).first()


def get_polygons_within_bounds(db: Session, bounds):
    min_lon, min_lat, max_lon, max_lat = bounds

    # Create a Shapely box object representing the bounds
    bounding_box = box(min_lon, min_lat, max_lon, max_lat)

    # Convert the Shapely geometry to WKT (Well-Known Text) format
    bounding_box_wkt = bounding_box.wkt

    # Query polygons within the bounding box
    query = db.query(models.Polygon).filter(
        models.Polygon.coordinates.ST_Intersects(
            func.ST_Transform(func.ST_SetSRID(func.ST_GeomFromText(bounding_box_wkt), 4326), 4326)
        )
    )
    polygons = query.all()

    return polygons


def create_cropped_image(db: Session, cropped_image: schemas.CroppedImageCreate):
    db_cropped_image = models.CroppedImage(**cropped_image.dict())
    db.add(db_cropped_image)
    db.commit()
    db.refresh(db_cropped_image)
    return db_cropped_image

def get_cropped_image_by_id(db: Session, cropped_image_id: int):
    return db.query(models.CroppedImage).filter(models.CroppedImage.id == cropped_image_id).first()

def delete_cropped_images(db: Session, image_id: int):
    db.query(models.CroppedImage).filter_by(image_id=image_id).delete()
    db.commit()


def update_processing_status(db: Session, image_id: int, status: int):
    db_image = db.query(models.Image).filter(models.Image.id == image_id).first()
    if db_image:
        db_image.processing_status = status
        db.commit()
        db.refresh(db_image)
    else:
        raise Exception("Image not found")
    

def get_full_image_by_id(db: Session, image_id: int) -> schemas.FullImageResponse:
    # Fetch the image from the database
    db_image = db.query(models.Image).filter(models.Image.id == image_id).first()
    
    if not db_image:
        return None
    
    # Prepare the nested data for cropped images
    cropped_images = [
        schemas.FullCroppedImageResponse(
            id=cropped_image.id,
            filename=cropped_image.filename,
            url=generate_presigned_url(cropped_image.s3_key) if cropped_image.s3_key else None,
            data=cropped_image.data,
            polygon=schemas.Polygon(
                id=cropped_image.polygon.id,
                name=cropped_image.polygon.name,
                address=cropped_image.polygon.address,
                type=cropped_image.polygon.type,
                coordinates=mapping(to_shape(cropped_image.polygon.coordinates))["coordinates"][0],
                latest_status=cropped_image.polygon.latest_status
            )
        ) for cropped_image in db_image.cropped_images
    ]
    
    # Return the full image response
    return schemas.FullImageResponse(
        id=db_image.id,
        created_at=db_image.created_at,
        label=db_image.label,
        location=db_image.location,
        filename=db_image.filename,
        annotated_url=generate_presigned_url(db_image.annotated_s3_key) if db_image.annotated_s3_key else None,
        cropped_images=cropped_images
    )

def update_cropped_image_analysis(db: Session, cropped_image_id: int, data, polygon_id: int):
    # Fetch the cropped image by ID
    db_image = db.query(models.CroppedImage).filter(models.CroppedImage.id == cropped_image_id).first()
    
    if db_image:
        # Update the data field of the cropped image
        db_image.data = data
        db.commit()
        db.refresh(db_image)
        
        # Determine the new status for the polygon based on the data
        if data.get('obstruction_present') == False:
            new_status = models.StatusEnum.clear
        elif data.get('is_permanent') == True:
            new_status = models.StatusEnum.permanent
        else:
            new_status = models.StatusEnum.temporary
        
        # Fetch the polygon by the provided polygon_id and update its latest_status
        db_polygon = db.query(models.Polygon).filter(models.Polygon.id == polygon_id).first()
        if db_polygon:
            db_polygon.latest_status = new_status
            db.commit()
            db.refresh(db_polygon)
    
    return db_image