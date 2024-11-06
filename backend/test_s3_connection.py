import os
import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv
from botocore.config import Config

# Load environment variables from .env file
load_dotenv()

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION")
BUCKET_NAME = os.getenv("BUCKET_NAME")
PREFIX_FIRE_ACCESS_WAY = os.getenv("PREFIX_FIRE_ACCESS_WAY")
PREFIX_DRONE_MAP = os.getenv("PREFIX_DRONE_MAP")
PREFIX_TEMP = os.getenv("PREFIX_TEMP")
TEST = os.getenv("TEST")

CUR_PREFIX = PREFIX_TEMP

# Initialize the S3 client
s3_client = boto3.client(
    's3',
    aws_access_key_id=AWS_ACCESS_KEY_ID,
    aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
    region_name=AWS_REGION,
    # config=Config(signature_version='s3v4')
)

# Function to check S3 operations
def check_s3_operations():
    try:
        # Check if you can list objects in the specified prefix within the bucket
        print(f"Checking if you can list objects in bucket {BUCKET_NAME} under prefix '{CUR_PREFIX}'...\n")
        response = s3_client.list_objects_v2(Bucket=BUCKET_NAME, Prefix=CUR_PREFIX)
        if 'Contents' in response:
            print("List objects: SUCCESS\n")
        else:
            print("List objects: No objects found\n")
    except ClientError as e:
        print(f"List objects: ERROR - {e}\n")

    try:
        # Check if you can upload an object to the bucket within the prefix
        object_key_with_prefix = f'{CUR_PREFIX}/test-file.txt'
        print(f"Checking if you can upload an object to bucket {BUCKET_NAME} with prefix '{CUR_PREFIX}'...\n")
        s3_client.put_object(Bucket=BUCKET_NAME, Key=object_key_with_prefix, Body='This is a test file')
        print("Put object: SUCCESS\n")
    except ClientError as e:
        print(f"Put object: ERROR - {e}\n")

    try:
        # Check if you can get the uploaded object from the bucket
        print(f"Checking if you can download an object from bucket {BUCKET_NAME} under prefix '{CUR_PREFIX}'...\n")
        s3_client.get_object(Bucket=BUCKET_NAME, Key=object_key_with_prefix)
        print("Get object: SUCCESS\n")
    except ClientError as e:
        print(f"Get object: ERROR - {e}\n")

    try:
        # Check if you can delete the uploaded object from the bucket
        print(f"Checking if you can delete an object from bucket {BUCKET_NAME} under prefix '{CUR_PREFIX}'...\n")
        s3_client.delete_object(Bucket=BUCKET_NAME, Key=object_key_with_prefix)
        print("Delete object: SUCCESS\n")
    except ClientError as e:
        print(f"Delete object: ERROR - {e}\n")

# Run the checks
if __name__ == "__main__":
    check_s3_operations()
