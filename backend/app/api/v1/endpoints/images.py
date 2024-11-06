import boto3
from botocore.exceptions import NoCredentialsError, PartialCredentialsError
import os
from dotenv import load_dotenv
from app import crud, schemas, processing, lvm, models
from app.db import SessionLocal
from PIL import Image
from typing import List, Optional, Union
import traceback
from ....pdf_report_generator import generate_pdf_report
import logging
from datetime import datetime
import magic
from fastapi import BackgroundTasks
from fastapi.concurrency import run_in_threadpool
from fastapi.responses import FileResponse

from fastapi import APIRouter, UploadFile, File, HTTPException, Depends, Form, BackgroundTasks, WebSocket, WebSocketDisconnect
from sqlalchemy.orm import Session
from typing import List, Dict
import os
import asyncio
import threading
import json
from app.websockets import manager
from concurrent.futures import ThreadPoolExecutor

from app import crud, schemas, processing
from app.db import SessionLocal


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# -------------------------------- Connection to AWS - Access Keys Version --------------------------------
from botocore.client import Config
load_dotenv()  # Load environment variables from .env file

router = APIRouter()

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION")
BUCKET_NAME = os.getenv("BUCKET_NAME")
PREFIX_TEMP = os.getenv("PREFIX_TEMP")
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

# -------------------------------- API Endpoints --------------------------------
# WebSocket endpoint
@router.websocket("/ws/{image_id}")
async def websocket_endpoint(websocket: WebSocket, image_id: int):
    await manager.connect(websocket, image_id)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket, image_id)
        
# Get All Images
@router.get("/", response_model=List[schemas.ImageResponse])
async def get_images(
    skip: int = 0,
    limit: Optional[int] = None,
    sort_by: Optional[str] = 'created_at',  # Default sorting column
    sort_order: Optional[str] = 'desc',     # Default sorting order
    db: Session = Depends(get_db)
):
    try:
        db_images = crud.get_images(
            db=db,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        images_response = [
            schemas.ImageResponse(
                id=db_image.id,
                created_at=db_image.created_at,
                label=db_image.label,
                location=db_image.location,
                filename=db_image.filename,
                annotated_url=generate_presigned_url(db_image.annotated_s3_key) if db_image.annotated_s3_key else None,
            ) for db_image in db_images
        ]

        return images_response
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Get Full Image by ID
@router.get("/{image_id}/full", response_model=schemas.FullImageResponse)
async def get_full_image_by_id(
    image_id: int,
    db: Session = Depends(get_db)
):
    try:
        # Call the CRUD function
        image_response = crud.get_full_image_by_id(db=db, image_id=image_id)
        
        if not image_response:
            raise HTTPException(status_code=404, detail="Image not found")
        
        return image_response
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


Image.MAX_IMAGE_PIXELS = 1000000000

# -------------------------------- Upload - DEPRECATED Frontend Method --------------------------------
# Generate Presigned URL for frontend to handle S3 upload
@router.post("/generate-presigned-url")
async def generate_presigned_url_upload(
    request: schemas.PresignedUrlRequest,  # Pydantic model for request body
    db: Session = Depends(get_db)
):
    try:
        # Generate the new filename using timestamp
        timestamp = datetime.utcnow().strftime('%Y%m%d%H%M%S')
        new_filename = f"{timestamp}-{request.label}.tif"  # Access label from the request model
        s3_key = f"{PREFIX_DRONE_MAP}/{new_filename}"  # S3 key (path to file)

        # s3_client = get_s3_client()

        # Generate a presigned URL for PUT request
        presigned_url = s3_client.generate_presigned_url(
            'put_object',
            Params={
                'Bucket': BUCKET_NAME,
                'Key': s3_key,
                'ContentType': 'image/tiff'  # Adjust the content type as needed
            },
            ExpiresIn=3600  # URL expires in 1 hour
        )

        return {"presigned_url": presigned_url, "s3_key": s3_key}

    except NoCredentialsError:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    except PartialCredentialsError:
        raise HTTPException(status_code=400, detail="Incomplete credentials")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/notify-backend")
async def notify_backend(s3_key: str, label: str, db: Session = Depends(get_db)):
    try:
        # Extract filename from the s3_key
        filename = s3_key.split("/")[-1]

        # Create an image entry in the database
        image = schemas.ImageCreate(
            filename=filename,  # Filename extracted from the S3 key
            label=label,
            image_original_s3_key=s3_key  # Store the S3 key for later access
        )
        db_image = crud.create_image(db=db, image=image)

        # Simulate processing logic (you can add more complex processing here)
        # In this example, we assume that the image gets processed in a separate task or service
        
        # Return the created image object
        return schemas.ImageResponse(
            id=db_image.id,
            created_at=db_image.created_at,
            filename=db_image.filename,
            label=db_image.label,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------- Upload - DEPRECATED Normal Method --------------------------------
@router.post("/")
async def upload_file(
    file: UploadFile = File(...), 
    label: str = Form(...),  # Accepting label as a form field
    db: Session = Depends(get_db)
):
    try:
        # s3_client = get_s3_client()
        # Check if the filename extension is allowed
        file_extension = os.path.splitext(file.filename)[1]
        if file_extension.lower() not in ['.tif', '.tiff']:
            raise HTTPException(status_code=400, detail="Only GeoTIFF files (.tif, .tiff) are allowed.")

        # Check content type
        content_type = file.content_type
        if content_type not in ['image/tiff', 'image/geotiff']:
            raise HTTPException(status_code=400, detail="Unsupported content type. Only GeoTIFF files are allowed.")
          
        # Save the initial image details to the database with the temporary filename
        image = schemas.ImageCreate(
            filename=file.filename,
            label=label,
        )
        db_image = crud.create_image(db=db, image=image)

        # Generate a new filename using the `created_at` timestamp
        created_at_str = db_image.created_at.strftime('%Y%m%d%H%M%S')
        new_filename = f"{created_at_str}-{file.filename}"
        prefixed_new_filename = f"{PREFIX_DRONE_MAP}/{new_filename}"

        # Upload the file with the temporary filename
        s3_client.upload_fileobj(
            file.file,
            BUCKET_NAME,
            prefixed_new_filename,
            ExtraArgs={'ContentType': content_type}
        )
        
        # Update the image record with the new S3 object key
        crud.update_image_s3_key(db, image_id=db_image.id, image_original_s3_key=prefixed_new_filename)

        return schemas.ImageResponse(
            id=db_image.id,
            created_at=db_image.created_at,
            filename=new_filename,
            label=db_image.label,
        )
    
    except NoCredentialsError:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    except PartialCredentialsError:
        raise HTTPException(status_code=400, detail="Incomplete credentials")
    except HTTPException as e:
        raise e  # Re-raise the HTTPException to avoid being caught by the generic Exception
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------- Upload - FINAL Chunking S3 Method --------------------------------
# If using local storage
# UPLOAD_DIR = "/tmp/uploads"
# os.makedirs(UPLOAD_DIR, exist_ok=True)

# Chunk method save chunk to s3
@router.post("/upload-chunk/")
async def upload_file_chunk(
    chunk_number: int = Form(...),
    total_chunks: int = Form(...),
    label: str = Form(...),
    file: UploadFile = File(...),
    filename: str = Form(...),
    db: Session = Depends(get_db)
):
    # Check if the label is unique
    existing_image = db.query(models.Image).filter(models.Image.label == label).first()
    print(existing_image)
    if existing_image:
        raise HTTPException(status_code=400, detail="Label must be unique")
    
    new_filename = f"{label}-{filename}"
    prefixed_new_filename = f"{PREFIX_TEMP}/{new_filename}/chunk_{chunk_number}"

    try:
        logging.info(f"Uploading chunk {chunk_number} to S3 with key: {prefixed_new_filename}")
        
        # Read the chunk and upload it to S3
        file_content = await file.read()
        # s3_client = get_s3_client()
        s3_client.put_object(
            Bucket=BUCKET_NAME,
            Key=prefixed_new_filename,
            Body=file_content
        )

        # Verify that the chunk was uploaded successfully
        s3_client.head_object(Bucket=BUCKET_NAME, Key=prefixed_new_filename)
        logging.info(f"Successfully uploaded and verified chunk {chunk_number} to S3.")

        # If it's the last chunk, combine them all into the final file
        if chunk_number == total_chunks:
            final_file_content = bytearray()

            # Download each chunk from S3 and append to the final file
            for i in range(1, total_chunks + 1):
                chunk_key = f"{PREFIX_TEMP}/{new_filename}/chunk_{i}"
                logging.info(f"Retrieving chunk {i} from S3 with key: {chunk_key}")

                try:
                    chunk_obj = s3_client.get_object(Bucket=BUCKET_NAME, Key=chunk_key)
                    final_file_content.extend(chunk_obj['Body'].read())
                except Exception as e:
                    error_message = f"Failed to retrieve chunk {i} from S3: {str(e)}"
                    logging.error(error_message)
                    await cleanup_chunks(new_filename, total_chunks)  # Clean up previously uploaded chunks
                    raise HTTPException(status_code=500, detail=error_message)

            # Validate file type after all chunks are combined
            file_extension = os.path.splitext(filename)[1].lower()
            if file_extension not in ['.tif', '.tiff']:
                error_message = "Only GeoTIFF files (.tif, .tiff) are allowed."
                await cleanup_chunks(new_filename, total_chunks)  # Clean up if the file type is not valid
                raise HTTPException(status_code=400, detail=error_message)

            # Validate the content type after the file is reassembled
            with open("/tmp/tempfile", "wb") as temp_file:
                temp_file.write(final_file_content)
                content_type = magic.from_file("/tmp/tempfile", mime=True)

            if content_type not in ['image/tiff', 'image/geotiff']:
                error_message = "Unsupported content type. Only GeoTIFF files are allowed."
                await cleanup_chunks(new_filename, total_chunks)  # Clean up if the content type is not valid
                raise HTTPException(status_code=400, detail=error_message)

            # Upload the final combined file to S3 with both created_at and label
            created_at_str = datetime.now().strftime('%Y%m%d%H%M%S')
            final_key = f"{PREFIX_DRONE_MAP}/{created_at_str}-{label}-{filename}"
            logging.info(f"Uploading the final combined file to S3 with key: {final_key}")
            s3_client.put_object(
                Bucket=BUCKET_NAME,
                Key=final_key,
                Body=final_file_content,
                ContentType=content_type
            )

            # Save image record in the database
            image = schemas.ImageCreate(filename=filename, label=label)
            db_image = crud.create_image(db=db, image=image)
            crud.update_image_s3_key(db, image_id=db_image.id, image_original_s3_key=final_key)

            # Clean up all the chunk files from S3 after final file assembly
            logging.info("Cleaning up chunk files from S3...")
            await cleanup_chunks(new_filename, total_chunks)

            # Return the image ID in the response
            return schemas.ImageResponse(
                id=db_image.id,
                created_at=db_image.created_at,
                filename=filename,
                label=db_image.label,
            )
        else:
            # If it's not the last chunk, just acknowledge the chunk upload
            return {"status": "Chunk uploaded"}

    except Exception as e:
        error_message = f"Error during chunk upload: {str(e)}"
        logging.error(error_message)
        await cleanup_chunks(new_filename, chunk_number)  # Clean up uploaded chunks if any error occurs
        raise HTTPException(status_code=500, detail=error_message)

# Cleanup chunks from S3
async def cleanup_chunks(new_filename: str, total_chunks: int):
    """Remove uploaded chunks from S3."""
    logging.info(f"Cleaning up chunks for {new_filename}...")
    # s3_client = get_s3_client()
    for i in range(1, total_chunks + 1):
        chunk_key = f"{PREFIX_TEMP}/{new_filename}/chunk_{i}"
        try:
            s3_client.delete_object(Bucket=BUCKET_NAME, Key=chunk_key)
            logging.info(f"Successfully deleted chunk: {chunk_key}")
        except Exception as e:
            logging.error(f"Failed to delete chunk {chunk_key}: {str(e)}")

# -------------------------------- Delete Images --------------------------------
@router.delete("/")
async def delete_files(ids: Union[int, List[int]], db: Session = Depends(get_db)):
    try:
        # s3_client = get_s3_client()
        if isinstance(ids, int):
            ids = [ids]  # Convert single ID to a list for uniform processing

        for id in ids:
            # Fetch the image metadata from the database using the ID
            db_image = crud.get_image_by_id(db=db, image_id=id)
            if not db_image:
                raise HTTPException(status_code=404, detail=f"Image with ID {id} not found in database")
            
            # Delete from S3
            if db_image.original_s3_key:   
                print(db_image.original_s3_key)
                try:
                    s3_client.delete_object(Bucket=BUCKET_NAME, Key=db_image.original_s3_key)
                    logging.info(f"Deleted {db_image.original_s3_key} from S3")
                except s3_client.exceptions.NoSuchKey:
                    logging.warning(f"{db_image.original_s3_key} not found in S3")
            
            if db_image.annotated_s3_key:
                print(db_image.annotated_s3_key)
                try:
                    s3_client.delete_object(Bucket=BUCKET_NAME, Key=db_image.annotated_s3_key)
                    logging.info(f"Deleted {db_image.annotated_s3_key} from S3")
                except s3_client.exceptions.NoSuchKey:
                    logging.warning(f"{db_image.annotated_s3_key} not found in S3")

            for cropped_image in db_image.cropped_images:
                cropped_image_key = cropped_image.s3_key
                try:
                    s3_client.delete_object(Bucket=BUCKET_NAME, Key=cropped_image_key)
                    logging.info(f"Deleted {cropped_image_key} from S3")
                except s3_client.exceptions.NoSuchKey:
                    logging.warning(f"{cropped_image_key} not found in S3")

            # Delete the image record from the database
            crud.delete_image(db=db, image_id=id)

        return {"detail": "Files deleted successfully"}

    except s3_client.exceptions.NoSuchKey:
        raise HTTPException(status_code=404, detail="File not found in S3")
    except NoCredentialsError:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    except PartialCredentialsError:
        raise HTTPException(status_code=400, detail="Incomplete credentials")
    except Exception as e:
        logging.error(f"An unexpected error occurred: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------- Process Image --------------------------------
# @router.post("/process-image")
# async def process_image_endpoint(id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
#     try:
#         db_image = crud.get_image_by_id(db, image_id=id)
#         if not db_image:
#             raise HTTPException(status_code=404, detail="Image not found")

#         # Start processing in the background
#         background_tasks.add_task(processing.process_image, db, db_image)

#         return {"message": "Image processing started", "id": id}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# Process Image Endpoint
executor = ThreadPoolExecutor(max_workers=1)

@router.post("/process-image")
async def process_image_endpoint(id: int, db: Session = Depends(get_db)):
    try:
        db_image = crud.get_image_by_id(db, image_id=id)
        if not db_image:
            raise HTTPException(status_code=404, detail="Image not found")

        loop = asyncio.get_event_loop()
        loop.run_in_executor(executor, processing.process_image, db, db_image)

        return {"message": "Image processing started", "id": id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# -------------------------------- Get Processing Status --------------------------------
@router.get("/processing-status/{id}")
async def get_processing_status(id: int, db: Session = Depends(get_db)):
    try:
        # Retrieve image details from the database
        db_image = crud.get_image_by_id(db, image_id=id)
        if not db_image:
            raise HTTPException(status_code=404, detail="Image not found")

        # Return processing status
        return {"status": db_image.processing_status}  # Adjust according to your implementation
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------- Report Generation --------------------------------
@router.get("/generate-report/{image_id}")
async def generate_report(image_id: int, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    try:
        # Fetch image data from the database
        db_image = crud.get_full_image_by_id(db, image_id=image_id)
        if not db_image:
            raise HTTPException(status_code=404, detail="Image not found")

        # Generate PDF report in a separate thread
        pdf_buffer = await run_in_threadpool(generate_pdf_report, db_image)

        # Save the PDF to a temporary file
        pdf_file_path = f"/tmp/report_{image_id}.pdf"
        with open(pdf_file_path, "wb") as f:
            f.write(pdf_buffer.getbuffer())

        # Schedule the temporary file for deletion after response is sent
        background_tasks.add_task(os.remove, pdf_file_path)

        # Return the PDF as a response
        return FileResponse(
            pdf_file_path,
            media_type="application/pdf",
            filename=f"report_{image_id}.pdf"
        )

    except Exception as e:
        print("An error occurred:", traceback.format_exc())
        raise HTTPException(status_code=500, detail=str(e))

# -------------------------------- Miscellaneous --------------------------------
# List s3 objects
@router.get("/list-objects")
async def list_objects():
    try:
        # s3_client = get_s3_client()
        response = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=PREFIX_DRONE_MAP)
        return response.get('Contents', [])
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# For development
@router.delete("/delete-in-bucket/{filename}")
async def delete_file_in_bucket(filename: str):
    try:
        # s3_client = get_s3_client()
        # Include the prefix in the key
        key = f"{PREFIX_DRONE_MAP}/{filename}"
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=key)
    except s3_client.exceptions.NoSuchKey:
        raise HTTPException(status_code=404, detail="File not found in S3")
    except NoCredentialsError:
        raise HTTPException(status_code=400, detail="Invalid credentials")
    except PartialCredentialsError:
        raise HTTPException(status_code=400, detail="Incomplete credentials")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# Get Detailed Images 
@router.get("/get-detailed-images")
async def get_detailed_images(skip: int = 0, limit: int = None, db: Session = Depends(get_db)):
    try:
        return crud.get_images(db=db, skip=skip, limit=limit)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


    



