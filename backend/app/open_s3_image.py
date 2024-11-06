import boto3
from io import BytesIO
from PIL import Image
import os
from dotenv import load_dotenv

# AWS credentials and config
load_dotenv()  # Load environment variables from .env file

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION")
BUCKET_NAME = os.getenv("BUCKET_NAME")
PREFIX_TEMP = os.getenv("PREFIX_TEMP")
PREFIX_DRONE_MAP = os.getenv("PREFIX_DRONE_MAP")

# The S3 key for the image you want to open
# Example key
image_key = 'fireaccesswayimage-vz9n6/dataset/20241008163737-test-original (1)-1.jpg'

# Initialize a session using the credentials
session = boto3.Session(
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION
)

# Initialize the S3 client
s3 = session.client('s3')

# Fetch the object from S3
response = s3.get_object(Bucket=BUCKET_NAME, Key=image_key)

# Read the image content from the response
image_data = response['Body'].read()

# Open the image using Pillow
image = Image.open(BytesIO(image_data))

# Display the image
image.show()
