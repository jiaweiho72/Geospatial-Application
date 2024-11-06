import os
import json
import requests
import io
import numpy as np
import boto3
import cv2
import matplotlib.pyplot as plt
import time  # Added for timing measurements
import threading
import asyncio

from PIL import Image, ImageDraw
from concurrent.futures import ThreadPoolExecutor

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError, SQLAlchemyError

import rasterio
from rasterio import windows, open as rio_open
from rasterio.mask import mask
from rasterio.warp import (
    transform_bounds, 
    calculate_default_transform, 
    reproject, 
    Resampling
)

from rasterio.io import MemoryFile
from rasterio.crs import CRS
from rasterio.plot import show, reshape_as_image
from rasterio.features import rasterize
from rasterio.windows import from_bounds, Window

from shapely.geometry import shape, Polygon, mapping, box

import pyproj
from pyproj import Transformer
from geoalchemy2.shape import from_shape, to_shape


from app import models, schemas, lvm, crud
from app.db import SessionLocal
from dotenv import load_dotenv
import base64

from affine import Affine
from app.websockets import manager



# BLACK_PERCENTAGE_THRESHOLD = 0.6

# -------------------------------- Connection to AWS - Access Keys Version --------------------------------
from botocore.client import Config

load_dotenv()  # Load environment variables from .env file

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION")
BUCKET_NAME = os.getenv("BUCKET_NAME")
PREFIX_FIRE_ACCESS_WAY = os.getenv("PREFIX_FIRE_ACCESS_WAY")
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

# -------------------------------- MAIN function --------------------------------

def process_image(db: Session, image: schemas.Image) -> schemas.ImageResponse:
    try:
        print("Starting image processing...")
        total_start_time = time.time()  # Start total processing timer

        # ------------------- Initialisation ------------------- 
        crud.update_processing_status(db, image.id, 0)  # Set processing status to 0
        manager.send_progress_sync(image.id, 0)

        crud.delete_cropped_images(db, image.id)  # Allow for Reprocessing

        image_s3_path = f's3://{BUCKET_NAME}/{image.original_s3_key}'

        # Set AWS credentials in environment variables
        os.environ['AWS_ACCESS_KEY_ID'] = AWS_ACCESS_KEY_ID
        os.environ['AWS_SECRET_ACCESS_KEY'] = AWS_SECRET_ACCESS_KEY
        os.environ['AWS_REGION'] = AWS_REGION

        print("Opening dataset...")
        open_dataset_start_time = time.time()

        with rasterio.Env(
            GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',
            CPL_VSIL_CURL_USE_HEAD='NO',
            VSI_CACHE='TRUE',
            GDAL_CACHEMAX=512
        ):
            with rasterio.open(image_s3_path) as dataset:
                open_dataset_end_time = time.time()
                print(f"Dataset opened in {open_dataset_end_time - open_dataset_start_time:.2f} seconds.")

                # Extract bounds and get address
                print("Extracting bounds and image center...")
                extract_bounds_start_time = time.time()
                bounds, crs, (center_lon, center_lat) = extract_bounds(dataset)
                location = get_address_from_image_center([center_lon, center_lat])
                extract_bounds_end_time = time.time()
                print(f"Bounds extracted and location obtained in {extract_bounds_end_time - extract_bounds_start_time:.2f} seconds.")

                crud.update_processing_status(db, image.id, 25)  # Update status to 25%
                manager.send_progress_sync(image.id, 25)

                # Get polygons within bounds
                print("Fetching polygons within bounds...")
                polygons_fetch_start_time = time.time()
                polygons = crud.get_polygons_within_bounds(db=db, bounds=bounds)
                polygons_fetch_end_time = time.time()
                print(f"Fetched {len(polygons)} polygons in {polygons_fetch_end_time - polygons_fetch_start_time:.2f} seconds.")

                print("\nPolygons:")
                print(polygons)
                print("\n")

                # Draw polygons on image
                print("Drawing polygons on image...")
                draw_polygons_start_time = time.time()
                image_annotated_s3_key = draw_polygons_on_image(image, polygons, dataset)
                draw_polygons_end_time = time.time()
                print(f"Polygons drawn on image in {draw_polygons_end_time - draw_polygons_start_time:.2f} seconds.")
                
                # Attempt to update the image with the annotated S3 key and location
                try:
                    crud.update_image(db, image_id=image.id, annotated_s3_key=image_annotated_s3_key, location=location)
                except IntegrityError as ie:
                    db.rollback()  # Rollback the transaction to maintain session integrity
                    print(f"IntegrityError: {ie}")
                    raise HTTPException(status_code=400, detail="A database integrity error occurred. Possibly a unique constraint violation.")
                except SQLAlchemyError as sae:
                    db.rollback()
                    print(f"SQLAlchemyError: {sae}")
                    raise HTTPException(status_code=500, detail="A database error occurred while updating the image.")

                crud.update_processing_status(db, image.id, 50)  # Update status to 50%
                manager.send_progress_sync(image.id, 50)

                # Close the dataset before starting threads
                dataset.close()

                # Process polygons sequentially and update progress
                print("Starting polygon cropping and analysis...")
                crop_polygons_start_time = time.time()
                total_polygons = len(polygons)
                polygons_processed = 0

                for idx, polygon in enumerate(polygons):
                    crop_polygon(db, image, image_s3_path, polygon, idx)
                    polygons_processed += 1
                    progress = 50 + int((polygons_processed / total_polygons) * 25)
                    crud.update_processing_status(db, image.id, progress)
                    manager.send_progress_sync(image.id, progress)
                    print(f"Updated processing status to {progress}% after processing polygon {idx}")

                crop_polygons_end_time = time.time()
                print(f"Polygon cropping and analysis completed in {crop_polygons_end_time - crop_polygons_start_time:.2f} seconds.")

                crud.update_processing_status(db, image.id, 75)  # Update status to 75%
                manager.send_progress_sync(image.id, 75)

                # Finalize processing
                crud.update_processing_status(db, image.id, 100)  # Update status to 100%
                manager.send_progress_sync(image.id, 100)

                total_end_time = time.time()
                print(f"Total image processing completed in {total_end_time - total_start_time:.2f} seconds.")

                # Final steps
                return schemas.ImageResponse(
                    id=image.id,
                    created_at=image.created_at,
                    filename=image.filename,
                    annotated_url=generate_presigned_url(image_annotated_s3_key),
                    cropped_images=[],  # Adjust as needed
                )
    except HTTPException as http_exc:
        print(f"HTTPException: {http_exc.detail}")
        crud.update_processing_status(db, image.id, -1)
        manager.send_progress_sync(image.id, -1)
        raise
    except Exception as e:
        print("PROCESSING ERROR")
        crud.update_processing_status(db, image.id, -1)
        manager.send_progress_sync(image.id, -1)
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {str(e)}")

# -------------------------------- Helper functions --------------------------------
def extract_bounds(dataset):
    start_time = time.time()
    bounds = dataset.bounds
    original_crs = dataset.crs
    left, bottom, right, top = bounds.left, bounds.bottom, bounds.right, bounds.top
    
    # Convert bounds to WGS84 (EPSG:4326) if needed
    src_crs = original_crs
    dst_crs = 'EPSG:4326'
    transformed_bounds = transform_bounds(src_crs, dst_crs, left, bottom, right, top)

    # Unpack the transformed bounds
    transformed_left, transformed_bottom, transformed_right, transformed_top = transformed_bounds

    # Calculate the center of the image in the transformed CRS
    center_lon = (transformed_left + transformed_right) / 2
    center_lat = (transformed_top + transformed_bottom) / 2

    print(f"Transformed Bounds (WGS84): {transformed_bounds}")
    end_time = time.time()
    print(f"extract_bounds completed in {end_time - start_time:.2f} seconds.")
    return transformed_bounds, original_crs, (center_lon, center_lat)
    
def reverse_geocode(coordinates):
    try:
        start_time = time.time()
        # Extract the coordinates
        lon, lat = coordinates
        
        # Format the API endpoint URL with the given coordinates
        url = f"https://nominatim.openstreetmap.org/reverse?lon={lon}&lat={lat}&format=json&addressdetails=1"
        
        # Make the API request
        response = requests.get(url, headers={"User-Agent": "Blockfinder"})
        
        # Raise an HTTP exception if the request was not successful
        response.raise_for_status()
        
        # Parse the JSON response
        data = response.json()
        
        # Check if the API returned any results
        if "address" in data:
            address_info = data["address"]
            address = address_info.get("road", "No address found")
            city = address_info.get("city", "No city found")
            end_time = time.time()
            print(f"Reverse geocoding completed in {end_time - start_time:.2f} seconds.")
            return f"{address}, {city}"
        else:
            end_time = time.time()
            print(f"Reverse geocoding completed in {end_time - start_time:.2f} seconds.")
            return "No address found for the given coordinates."

    except requests.RequestException as e:
        print(f"Error occurred while reverse geocoding: {e}")
        raise HTTPException(status_code=500, detail="Error occurred while reverse geocoding.")


def get_address_from_image_center(center_coordinates):
    print("Starting reverse geocoding...")
    address = reverse_geocode(center_coordinates)
    print(f"Address for the image center: {address}")
    return address

def convert_coordinates(coordinates, src_crs, dst_crs):
    transformer = pyproj.Transformer.from_crs(src_crs, dst_crs, always_xy=True)
    transformed_coords = [transformer.transform(x, y) for x, y in coordinates]
    return transformed_coords

# -------------------------------- Crop polygon --------------------------------
### Crop and runs analysis on polygons
# def crop_polygon(db, image: schemas.Image, image_s3_path: str, polygon: schemas.Polygon, index: int):
#     try:
#         start_time = time.time()
#         print(f"Processing polygon {index} (ID: {polygon.id})...")
#         # Convert the polygon to a Shapely geometry
#         shape_geom = to_shape(polygon.coordinates)
#         polygon_id = polygon.id

#         # Open the dataset within the thread
#         with rasterio.Env(
#             GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',
#             CPL_VSIL_CURL_USE_HEAD='NO',
#             VSI_CACHE='TRUE',
#             GDAL_CACHEMAX=512
#         ):
#             with rasterio.open(image_s3_path) as src:
#                 # Get the CRS of the raster file
#                 raster_crs = src.crs

#                 # Define the CRS of your input coordinates (assumed to be WGS84 lat/lng)
#                 coord_crs = pyproj.CRS('EPSG:4326')

#                 # Create a transformer to convert from coord_crs to raster_crs
#                 transformer = Transformer.from_crs(coord_crs, raster_crs, always_xy=True)

#                 # Transform the coordinates
#                 coordinates = mapping(shape_geom)["coordinates"][0]
#                 transformed_coords = [transformer.transform(x, y) for x, y in coordinates]

#                 # Create a polygon from the transformed coordinates
#                 polygon_geom = Polygon(transformed_coords)

#                 # Intersect the polygon with the image bounds
#                 image_bounds_polygon = box(*src.bounds)
#                 intersected_polygon = polygon_geom.intersection(image_bounds_polygon)

#                 # Check if the intersection is valid
#                 if intersected_polygon.is_empty or not intersected_polygon.is_valid:
#                     print(f"No overlap between polygon {index} and the image bounds.")
#                     return  # or handle as appropriate

#                 # Get the bounding box of the intersected polygon
#                 min_x, min_y, max_x, max_y = intersected_polygon.bounds

#                 # Create a window from the bounding box
#                 window = from_bounds(min_x, min_y, max_x, max_y, src.transform)

#                 # Read the data within the window
#                 out_image = src.read(window=window)

#                 # Create a mask for the intersected polygon
#                 out_transform = src.window_transform(window)
#                 out_shape = (out_image.shape[1], out_image.shape[2])  # (height, width)

#                 # Rasterize the intersected polygon
#                 mask = rasterize(
#                     [(intersected_polygon, 1)],
#                     out_shape=out_shape,
#                     transform=out_transform,
#                     fill=0,
#                     dtype=rasterio.uint8
#                 )

#                 # Apply the mask to the image
#                 masked_image = np.zeros_like(out_image)
#                 for i in range(out_image.shape[0]):
#                     masked_image[i] = np.where(mask == 1, out_image[i], 0)

#                 # Convert to RGB image
#                 img = np.moveaxis(masked_image, 0, -1)  # Move channels to last dimension
#                 img_pil = Image.fromarray(img.astype('uint8')).convert("RGB")

#                 # **Optional:** Increase the clarity by adjusting the resizing
#                 # Remove or adjust the resizing step
#                 # target_size = (2048, 2048)
#                 # img_pil.thumbnail(target_size, Image.LANCZOS)

#                 # Draw the intersected polygon boundary on the image
#                 draw = ImageDraw.Draw(img_pil)
#                 # Transform polygon coordinates to pixel coordinates within the window
#                 pixel_coords = [
#                     (
#                         int((x - min_x) / (max_x - min_x) * img_pil.width),
#                         int((max_y - y) / (max_y - min_y) * img_pil.height)
#                     ) for x, y in intersected_polygon.exterior.coords
#                 ]
#                 fixed_line_thickness = 5
#                 # draw.polygon(pixel_coords, outline=(255, 0, 0), width=3)
#                 draw.line(pixel_coords + [pixel_coords[0]], fill=(255, 0, 0), width=fixed_line_thickness)

#                 # Save the image to a BytesIO buffer
#                 buffer = io.BytesIO()
#                 # Increase the JPEG quality
#                 img_pil.save(buffer, format='JPEG', quality=90, optimize=True)
#                 buffer.seek(0)

#                 # Generate a unique filename
#                 filename = f"{image.filename}-{index}.jpg"
#                 prefixed_filename = f"{image.original_s3_key}-{index}.jpg"

#                 # Upload the image to S3
#                 print(f"Uploading cropped image for polygon {index} to S3...")
#                 upload_start_time = time.time()
#                 s3_client.put_object(
#                     Bucket=BUCKET_NAME,
#                     Key=prefixed_filename,
#                     Body=buffer.getvalue(),
#                     ContentType='image/jpeg'
#                 )
#                 upload_end_time = time.time()
#                 print(f"Cropped image for polygon {index} uploaded in {upload_end_time - upload_start_time:.2f} seconds.")

#         # Save the cropped image details to the database
#         cropped_image = schemas.CroppedImageCreate(
#             image_id=image.id,
#             polygon_id=polygon_id,
#             filename=filename,
#             s3_key=prefixed_filename
#         )
#         db_cropped_image = crud.create_cropped_image(db=db, cropped_image=cropped_image)

#         # Run analysis on the cropped image and update the database
#         print(f"Running analysis on cropped image for polygon {index}...")
#         analysis_start_time = time.time()
#         data = lvm.run_image_through_model(db_cropped_image)
#         analysis_end_time = time.time()
#         print(f"Analysis for polygon {index} completed in {analysis_end_time - analysis_start_time:.2f} seconds.")
#         db_cropped_image = crud.update_cropped_image_analysis(db=db, cropped_image_id=db_cropped_image.id, data=data, polygon_id=polygon_id)

#         end_time = time.time()
#         print(f"Processing for polygon {index} completed in {end_time - start_time:.2f} seconds.")

#         return schemas.CroppedImageResponse(
#             id=db_cropped_image.id,
#             filename=db_cropped_image.filename,
#             url=generate_presigned_url(db_cropped_image.s3_key) if cropped_image.s3_key else None,
#             data=data
#         )

#     except Exception as e:
#         print(f'Error occurred while processing polygon {index}: {e}')
#         raise HTTPException(status_code=500, detail=f"Error occurred while cropping and drawing the polygon: {str(e)}")

# def crop_polygon(db, image: schemas.Image, image_s3_path: str, polygon: schemas.Polygon, index: int):
#     try:
#         start_time = time.time()
#         print(f"Processing polygon {index} (ID: {polygon.id})...")
#         # Convert the polygon to a Shapely geometry
#         shape_geom = to_shape(polygon.coordinates)
#         polygon_id = polygon.id

#         # Open the dataset within the thread
#         with rasterio.Env(
#             GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',
#             CPL_VSIL_CURL_USE_HEAD='NO',
#             VSI_CACHE='TRUE',
#             GDAL_CACHEMAX=512
#         ):
#             with rasterio.open(image_s3_path) as src:
#                 # Get the CRS of the raster file
#                 raster_crs = src.crs

#                 # Define the CRS of your input coordinates (assumed to be WGS84 lat/lng)
#                 coord_crs = pyproj.CRS('EPSG:4326')

#                 # Create a transformer to convert from coord_crs to raster_crs
#                 transformer = Transformer.from_crs(coord_crs, raster_crs, always_xy=True)

#                 # Transform the coordinates
#                 coordinates = mapping(shape_geom)["coordinates"][0]
#                 transformed_coords = [transformer.transform(x, y) for x, y in coordinates]

#                 # Create a polygon from the transformed coordinates
#                 polygon_geom = Polygon(transformed_coords)

#                 # Intersect the polygon with the image bounds
#                 image_bounds_polygon = box(*src.bounds)
#                 intersected_polygon = polygon_geom.intersection(image_bounds_polygon)

#                 # Check if the intersection is valid
#                 if intersected_polygon.is_empty or not intersected_polygon.is_valid:
#                     print(f"No overlap between polygon {index} and the image bounds.")
#                     return  # or handle as appropriate

#                 # Get the bounding box of the intersected polygon
#                 min_x, min_y, max_x, max_y = intersected_polygon.bounds

#                 # Create a window from the bounding box
#                 window = from_bounds(min_x, min_y, max_x, max_y, src.transform)

#                 # Get the window width and height
#                 window_width = window.width
#                 window_height = window.height

#                 # Define the maximum dimension
#                 MAX_DIMENSION = 2500  # Adjust as needed

#                 # Calculate the scale factor
#                 scale_factor = min(1.0, MAX_DIMENSION / max(window_width, window_height))

#                 # Calculate the out_shape for reading data
#                 out_height = int(window_height * scale_factor)
#                 out_width = int(window_width * scale_factor)
#                 out_shape = (src.count, out_height, out_width)

#                 # Read the data with the out_shape
#                 out_image = src.read(
#                     window=window,
#                     out_shape=out_shape,
#                     resampling=Resampling.lanczos  # Use Lanczos resampling for better quality
#                 )

#                 # Adjust the transform accordingly
#                 out_transform = src.window_transform(window)
#                 if scale_factor < 1.0:
#                     # Adjust the transform to account for the scaling
#                     scale_affine = Affine.scale((window.width / out_width), (window.height / out_height))
#                     out_transform = out_transform * scale_affine

#                 # Create a mask for the intersected polygon
#                 out_shape_mask = (out_height, out_width)  # (height, width)

#                 # Rasterize the intersected polygon
#                 mask = rasterize(
#                     [(intersected_polygon, 1)],
#                     out_shape=out_shape_mask,
#                     transform=out_transform,
#                     fill=0,
#                     dtype=rasterio.uint8
#                 )

#                 # --- Create Masked Image for LVM Processing ---

#                 # Apply the mask to the image
#                 masked_image = np.zeros_like(out_image)
#                 for i in range(out_image.shape[0]):
#                     masked_image[i] = np.where(mask == 1, out_image[i], 0)

#                 # Convert to RGB image
#                 img_masked = np.moveaxis(masked_image, 0, -1)  # Move channels to last dimension
#                 img_masked_pil = Image.fromarray(img_masked.astype('uint8')).convert("RGB")

#                 # --- Create Cropped Image with Background for Users ---

#                 # Convert out_image to PIL Image
#                 img_cropped = np.moveaxis(out_image, 0, -1)
#                 img_cropped_pil = Image.fromarray(img_cropped.astype('uint8')).convert("RGB")

#                 # Draw the intersected polygon boundary on the cropped image
#                 draw = ImageDraw.Draw(img_cropped_pil)

#                 # Transform polygon coordinates to pixel coordinates within the window
#                 pixel_coords = [
#                     src.transform * transformer.transform(x, y)
#                     for x, y in shape_geom.exterior.coords
#                 ]
#                 pixel_coords = [
#                     (
#                         int((x - min_x) / (max_x - min_x) * img_cropped_pil.width),
#                         int((max_y - y) / (max_y - min_y) * img_cropped_pil.height)
#                     )
#                     for x, y in intersected_polygon.exterior.coords
#                 ]

#                 # Adjust line thickness based on image size
#                 img_width, img_height = img_cropped_pil.width, img_cropped_pil.height
#                 base_thickness = 2  # Base line thickness for smaller images
#                 line_thickness = max(base_thickness, int(min(img_width, img_height) * 0.005))  # Adjust scaling factor

#                 draw.line(pixel_coords + [pixel_coords[0]], fill=(255, 0, 0), width=line_thickness)

#                 # # --- Save the Cropped Image with Background Locally ---
#                 # img_cropped_pil.save(f"cropped_image_{index}.jpg", format="JPEG", quality=85, optimize=True)

#                 # # --- Save the Masked Image for LVM Processing Locally ---
#                 # img_masked_pil.save(f"masked_image_{index}.jpg", format="JPEG", quality=85, optimize=True)


#                 # --- Save the Cropped Image with Background to S3 ---

#                 # Save the image to a BytesIO buffer
#                 buffer_cropped = io.BytesIO()
#                 img_cropped_pil.save(buffer_cropped, format='JPEG', quality=85, optimize=True)
#                 buffer_cropped.seek(0)

#                 # Generate a unique filename for the cropped image
#                 filename_cropped = f"{image.filename}-{index}.jpg"

#                 # Save to PREFIX_FIRE_ACCESS_WAY bucket folder
#                 filename = image.original_s3_key.split('/')[-1]
#                 extracted_filename = filename.rsplit('.', 1)[0]
#                 prefixed_filename_cropped = f"{PREFIX_FIRE_ACCESS_WAY}/{extracted_filename}-{index}.jpg"

#                 # Upload the cropped image to S3
#                 print(f"Uploading cropped image for polygon {index} to S3...")
#                 upload_start_time = time.time()
#                 s3_client.put_object(
#                     Bucket=BUCKET_NAME,
#                     Key=prefixed_filename_cropped,
#                     Body=buffer_cropped.getvalue(),
#                     ContentType='image/jpeg'
#                 )
#                 upload_end_time = time.time()
#                 print(f"Cropped image for polygon {index} uploaded in {upload_end_time - upload_start_time:.2f} seconds.")

#                 # --- Prepare Masked Image for LVM Processing ---

#                 # Save masked image to a BytesIO buffer (for in-memory processing)
#                 buffer_masked = io.BytesIO()
#                 img_masked_pil.save(buffer_masked, format='JPEG', quality=85, optimize=True)
#                 buffer_masked.seek(0)

#             # Save the cropped image details to the database
#             cropped_image = schemas.CroppedImageCreate(
#                 image_id=image.id,
#                 polygon_id=polygon_id,
#                 filename=filename_cropped,
#                 s3_key=prefixed_filename_cropped
#             )
#             db_cropped_image = crud.create_cropped_image(db=db, cropped_image=cropped_image)

#             # --- Run analysis on the masked image and update the database ---

#             print(f"Running analysis on cropped image for polygon {index}...")
#             analysis_start_time = time.time()

#             # Run the analysis using the masked image
#             data = lvm.run_image_through_model(buffer_masked)

#             analysis_end_time = time.time()
#             print(f"Analysis for polygon {index} completed in {analysis_end_time - analysis_start_time:.2f} seconds.")

#             db_cropped_image = crud.update_cropped_image_analysis(
#                 db=db,
#                 cropped_image_id=db_cropped_image.id,
#                 data=data,
#                 polygon_id=polygon_id
#             )

#             end_time = time.time()
#             print(f"Processing for polygon {index} completed in {end_time - start_time:.2f} seconds.")

#             return schemas.CroppedImageResponse(
#                 id=db_cropped_image.id,
#                 filename=db_cropped_image.filename,
#                 url=generate_presigned_url(db_cropped_image.s3_key) if cropped_image.s3_key else None,
#                 data=data
#             )

#     except Exception as e:
#         print(f'Error occurred while processing polygon {index}: {e}')
#         raise HTTPException(status_code=500, detail=f"Error occurred while cropping and drawing the polygon: {str(e)}")

def crop_polygon(db, image: schemas.Image, image_s3_path: str, polygon: schemas.Polygon, index: int):
    try:
        start_time = time.time()
        print(f"Processing polygon {index} (ID: {polygon.id})...")
        # Convert the polygon to a Shapely geometry
        shape_geom = to_shape(polygon.coordinates)
        polygon_id = polygon.id

        # Open the dataset within the thread
        with rasterio.Env(
            GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR',
            CPL_VSIL_CURL_USE_HEAD='NO',
            VSI_CACHE='TRUE',
            GDAL_CACHEMAX=512
        ):
            with rasterio.open(image_s3_path) as src:
                # Get the CRS of the raster file
                raster_crs = src.crs

                # Define the CRS of your input coordinates (assumed to be WGS84 lat/lng)
                coord_crs = pyproj.CRS('EPSG:4326')

                # Create a transformer to convert from coord_crs to raster_crs
                transformer = Transformer.from_crs(coord_crs, raster_crs, always_xy=True)

                # Transform the coordinates using vectorized operations
                coordinates = np.array(shape_geom.exterior.coords)
                x_coords, y_coords = coordinates[:, 0], coordinates[:, 1]
                transformed_x, transformed_y = transformer.transform(x_coords, y_coords)
                transformed_coords = np.column_stack((transformed_x, transformed_y))

                # Create a polygon from the transformed coordinates
                polygon_geom = Polygon(transformed_coords)

                # Intersect the polygon with the image bounds
                image_bounds_polygon = box(*src.bounds)
                intersected_polygon = polygon_geom.intersection(image_bounds_polygon)

                # Check if the intersection is valid
                if intersected_polygon.is_empty or not intersected_polygon.is_valid:
                    print(f"No overlap between polygon {index} and the image bounds.")
                    return  # or handle as appropriate

                # Get the bounding box of the intersected polygon
                min_x, min_y, max_x, max_y = intersected_polygon.bounds

                # Create a window from the bounding box
                window = from_bounds(min_x, min_y, max_x, max_y, src.transform)

                # Get the window width and height
                window_width = window.width
                window_height = window.height

                # Define the maximum dimension
                MAX_DIMENSION = 10000  # Adjust as needed

                # Calculate the scale factor
                scale_factor = min(1.0, MAX_DIMENSION / max(window_width, window_height))
                print(f"Scale factor: {scale_factor}")

                # Calculate the out_shape for reading data
                out_height = int(window_height * scale_factor)
                out_width = int(window_width * scale_factor)
                out_shape = (src.count, out_height, out_width)

                # Read the data with the out_shape
                out_image = src.read(
                    window=window,
                    out_shape=out_shape,
                    resampling=Resampling.bilinear  # Use Bilinear resampling for speed
                )

                # Adjust the transform accordingly
                out_transform = src.window_transform(window)
                if scale_factor < 1.0:
                    # Adjust the transform to account for the scaling
                    scale_affine = Affine.scale(
                        (window.width / out_width), (window.height / out_height)
                    )
                    out_transform *= scale_affine

                # Create a mask for the intersected polygon
                out_shape_mask = (out_height, out_width)  # (height, width)

                # Rasterize the intersected polygon
                mask = rasterize(
                    [(intersected_polygon, 1)],
                    out_shape=out_shape_mask,
                    transform=out_transform,
                    fill=0,
                    dtype=rasterio.uint8
                )

                # --- Create Masked Image for LVM Processing ---

                # Apply the mask to the image using broadcasting
                masked_image = out_image * mask[np.newaxis, :, :]

                # Convert to RGB image
                img_masked = np.moveaxis(masked_image, 0, -1)  # Move channels to last dimension
                img_masked_pil = Image.fromarray(img_masked.astype('uint8'), mode='RGB')

                # --- Create Cropped Image with Background for Users ---

                # Convert out_image to PIL Image
                img_cropped = np.moveaxis(out_image, 0, -1)
                img_cropped_pil = Image.fromarray(img_cropped.astype('uint8'), mode='RGB')

                # Draw the intersected polygon boundary on the cropped image
                draw = ImageDraw.Draw(img_cropped_pil)

                # Transform polygon coordinates to pixel coordinates within the window
                # Use vectorized operations
                inv_transform = ~out_transform
                px, py = inv_transform * (transformed_x, transformed_y)
                pixel_coords = list(zip(px, py))

                # Adjust line thickness based on image size
                img_width, img_height = img_cropped_pil.width, img_cropped_pil.height
                base_thickness = 2  # Base line thickness for smaller images
                line_thickness = max(base_thickness, int(min(img_width, img_height) * 0.005))  # Adjust scaling factor

                # Draw the polygon boundary
                draw.line(pixel_coords + [pixel_coords[0]], fill=(255, 0, 0), width=line_thickness)
                
                #--- Save the Cropped Image with Background Locally ---
                # img_cropped_pil.save(f"cropped_image_{index}.jpg", format="JPEG", quality=85, optimize=True)

                # # --- Save the Masked Image for LVM Processing Locally ---
                # img_masked_pil.save(f"masked_image_{index}.jpg", format="JPEG", quality=85, optimize=True)


                # --- Save the Cropped Image with Background to S3 ---

                # Save the image to a BytesIO buffer
                buffer_cropped = io.BytesIO()
                img_cropped_pil.save(buffer_cropped, format='JPEG', quality=100, optimize=True)
                buffer_cropped.seek(0)

                # Generate a unique filename for the cropped image
                filename_cropped = f"{image.filename}-{index}.jpg"

                # Save to PREFIX_FIRE_ACCESS_WAY bucket folder
                filename = image.original_s3_key.split('/')[-1]
                extracted_filename = filename.rsplit('.', 1)[0]
                prefixed_filename_cropped = f"{PREFIX_FIRE_ACCESS_WAY}/{extracted_filename}-{index}.jpg"

                # Upload the cropped image to S3
                print(f"Uploading cropped image for polygon {index} to S3...")
                upload_start_time = time.time()
                s3_client.put_object(
                    Bucket=BUCKET_NAME,
                    Key=prefixed_filename_cropped,
                    Body=buffer_cropped.getvalue(),
                    ContentType='image/jpeg'
                )
                upload_end_time = time.time()
                print(f"Cropped image for polygon {index} uploaded in {upload_end_time - upload_start_time:.2f} seconds.")

                # --- Prepare Masked Image for LVM Processing ---

                # Save masked image to a BytesIO buffer (for in-memory processing)
                buffer_masked = io.BytesIO()
                img_masked_pil.save(buffer_masked, format='JPEG', quality=100, optimize=True)
                buffer_masked.seek(0)

            # Save the cropped image details to the database
            cropped_image = schemas.CroppedImageCreate(
                image_id=image.id,
                polygon_id=polygon_id,
                filename=filename_cropped,
                s3_key=prefixed_filename_cropped
            )
            db_cropped_image = crud.create_cropped_image(db=db, cropped_image=cropped_image)

            # --- Run analysis on the masked image and update the database ---

            print(f"Running analysis on cropped image for polygon {index}...")
            analysis_start_time = time.time()

            # Run the analysis using the masked image
            data = lvm.run_image_through_model(buffer_masked)

            analysis_end_time = time.time()
            print(f"Analysis for polygon {index} completed in {analysis_end_time - analysis_start_time:.2f} seconds.")

            db_cropped_image = crud.update_cropped_image_analysis(
                db=db,
                cropped_image_id=db_cropped_image.id,
                data=data,
                polygon_id=polygon_id
            )

            end_time = time.time()
            print(f"Processing for polygon {index} completed in {end_time - start_time:.2f} seconds.")

            return schemas.CroppedImageResponse(
                id=db_cropped_image.id,
                filename=db_cropped_image.filename,
                url=generate_presigned_url(db_cropped_image.s3_key) if cropped_image.s3_key else None,
                data=data
            )

    except Exception as e:
        print(f'Error occurred while processing polygon {index}: {e}')
        raise HTTPException(status_code=500, detail=f"Error occurred while cropping and drawing the polygon: {str(e)}")


# -------------------------------- Annotate Drone Map --------------------------------
def draw_polygons_on_image(image, polygons: list, dataset) -> str:
    try:
        print("Starting to draw polygons on the image...")
        start_time = time.time()
        # Determine the desired output size
        target_resolution = (1920, 1080)
        width = target_resolution[0]
        height = target_resolution[1]
        
        # Calculate the scale factors
        scale_x = width / dataset.width
        scale_y = height / dataset.height
        scale = min(scale_x, scale_y)
        
        # Calculate the out_shape
        out_shape = (dataset.count, int(dataset.height * scale), int(dataset.width * scale))
        
        # Read the data
        print("Reading dataset at reduced resolution for drawing...")
        read_start_time = time.time()
        data = dataset.read(out_shape=out_shape)
        read_end_time = time.time()
        print(f"Dataset read in {read_end_time - read_start_time:.2f} seconds.")
        
        # The data is in (bands, height, width). We can convert it to (height, width, bands)
        image_np = np.moveaxis(data, 0, -1)
        
        # Extract image bounds and CRS
        bounds = dataset.bounds
        left, bottom, right, top = bounds.left, bounds.bottom, bounds.right, bounds.top
        
        # Calculate scaling factors
        x_scale = image_np.shape[1] / (right - left)
        y_scale = image_np.shape[0] / (top - bottom)
        
        # Create a mask to draw polygons on (with alpha channel for transparency)
        mask = np.zeros((image_np.shape[0], image_np.shape[1], 4), dtype=np.uint8)
        
        for idx, polygon in enumerate(polygons):
            print(f"Drawing polygon {idx} on image...")
            shape_geom = to_shape(polygon.coordinates)
            coordinates = mapping(shape_geom)["coordinates"][0]
            
            # Transform geographic coordinates to pixel coordinates
            # Need to transform coordinates to dataset CRS
            raster_crs = dataset.crs
            coord_crs = pyproj.CRS('EPSG:4326')
            transformer = Transformer.from_crs(coord_crs, raster_crs, always_xy=True)
            transformed_coords = [transformer.transform(x, y) for x, y in coordinates]
            
            # Now map the transformed coordinates to pixel coordinates
            pixel_coords = [
                (
                    int((x - left) * x_scale),
                    int((top - y) * y_scale)
                ) for x, y in transformed_coords
            ]
            
            # Draw filled polygon on the mask with translucency
            cv2.fillPoly(mask, [np.array(pixel_coords, dtype=np.int32)], color=(255, 0, 0, 128))  # 128 is the alpha value for 50% opacity
        
        # Convert mask to PIL Image
        mask_pil = Image.fromarray(mask, 'RGBA')
        
        # Combine mask with the original image
        img_pil = Image.fromarray(image_np)
        img_pil = img_pil.convert('RGBA')  # Ensure it has alpha channel
        img_with_polygons = Image.alpha_composite(img_pil, mask_pil)
        
        # Save to PNG in a BytesIO buffer
        print("Saving image with polygons to buffer...")
        save_start_time = time.time()
        png_image_data = io.BytesIO()
        img_with_polygons.save(png_image_data, format='PNG', optimize=True, quality=100)
        png_image_data.seek(0)
        save_end_time = time.time()
        print(f"Image saved to buffer in {save_end_time - save_start_time:.2f} seconds.")
        
        # Save PNG image to S3
        print("Uploading annotated image to S3...")
        upload_start_time = time.time()
        modified_image_s3_key = save_modified_image(image.original_s3_key, png_image_data.read())
        upload_end_time = time.time()
        print(f"Annotated image uploaded to S3 in {upload_end_time - upload_start_time:.2f} seconds.")
        
        end_time = time.time()
        print(f"Drawing polygons on image completed in {end_time - start_time:.2f} seconds.")
        
        return modified_image_s3_key

    except Exception as e:
        print(f"Error occurred while drawing polygons on image: {e}")
        raise HTTPException(status_code=500, detail="Error occurred while processing the image.")

def resize_image_keeping_aspect_ratio(img, target_resolution):
    # Get original dimensions
    original_width, original_height = img.size
    
    # Calculate the target dimensions while maintaining aspect ratio
    target_width, target_height = target_resolution
    aspect_ratio = original_width / original_height
    
    if original_width > original_height:  # Landscape orientation
        new_width = min(target_width, original_width)
        new_height = int(new_width / aspect_ratio)
    else:  # Portrait or square orientation
        new_height = min(target_height, original_height)
        new_width = int(new_height * aspect_ratio)
    
    # Resize the image with the new dimensions using LANCZOS resampling
    img_resized = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
    
    return img_resized

def save_modified_image(image_original_s3_key: str, image_data: bytes) -> str:
    # Split the original key to get the base name and the prefix
    dirname, filename = os.path.split(image_original_s3_key)
    basename, _ = os.path.splitext(filename)
    
    # Construct the new key for the modified image
    modified_image_filename = f"{dirname}/modified/{basename}.png"
    print(f"Saving image to S3 with key: {modified_image_filename}")
    
    try:
        # s3_client = get_s3_client()
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=modified_image_filename,
            Body=image_data,
            ContentType='image/png'
        )

        return modified_image_filename

    except Exception as e:
        print(f"Error occurred while saving image to S3: {e}")
        raise HTTPException(status_code=500, detail="Error occurred while saving image to S3.")
