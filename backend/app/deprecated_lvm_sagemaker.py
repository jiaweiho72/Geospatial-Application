from sagemaker.huggingface.model import HuggingFacePredictor
from sagemaker.session import Session as SagemakerSession
from app import schemas
from fastapi import HTTPException
import requests
import os
from dotenv import load_dotenv
import boto3
import re
import json

# -------------------------------- Connection to Sagemaker --------------------------------
load_dotenv()

ENDPOINT_NAME = os.getenv('SAGEMAKER_ENDPOINT')
REGION_NAME = os.getenv("AWS_REGION")
BUCKET_NAME = os.getenv("BUCKET_NAME")

# -------------------------------- Utility Functions --------------------------------
def parse_report(report_string: str) -> dict:
    try:
        # Print the string representation for debugging
        print(f"String representation: {repr(report_string)}")
        print(f"Raw bytes: {report_string.encode('utf-8')}")

        # Attempt to parse as JSON
        data = json.loads(report_string)
        
        # Process and return the data
        result = {
            "obstruction_present": data.get("obstruction", False),
            "sufficient_clearance": data.get("sufficient", False),
            "is_permanent": data.get("permanent", False),
            "is_flammable": data.get("flammable", False),
            "is_vehicle": data.get("vehicle", False),
            "label": data.get("label", ""),
            "description": data.get("description", ""),
            "recommended_actions": data.get("actions", ""),
        }
        return result

    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")
        raise HTTPException(status_code=500, detail="Error occurred while parsing the report.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while processing the report.")

def normalize_string(s: str) -> str:
    # Remove leading/trailing whitespace and replace newline characters with spaces
    return s.strip().replace('\n', '').replace('\r', '')


# -------------------------------- Main function --------------------------------
def run_image_through_model(cropped_image: schemas.CroppedImage) -> dict:
    try:
        # Initialize the SagemakerSession with the correct region
        session = SagemakerSession(boto_session=boto3.Session(region_name=REGION_NAME))

        # Initialize the HuggingFacePredictor with the SagemakerSession
        predictor = HuggingFacePredictor(endpoint_name=ENDPOINT_NAME, sagemaker_session=session)

        s3_img_path = f"s3://{BUCKET_NAME}/{cropped_image.s3_key}"
        # Prepare the data payload
        data = {
            "image": s3_img_path,
            "question": """
                Analyze the following image for obstructions in fire access ways. Ensure logical consistency in the fields, for example if there is a vehicle, it means there is definitely an obstruction present.
                Provide a summary report with the following details:

                1. **Obstruction Present**: Indicate if any obstruction is detected (true/false).
                2. **Sufficient Clearance**: Indicate if a SCDF fire engine (truck) can pass through the area considering all detected obstructions (true/false).
                3. **Is Permanent**: Indicate if any of the detected obstructions are permanent (true/false).
                4. **Is Flammable**: Indicate if any of the detected obstructions are flammable (true/false).
                5. **Is Vehicle**: Indicate if any of the detected obstructions are vehicles (true/false).
                6. **Label**: Provide a summary of the labels of all detected obstructions.
                7. **Description**: Provide a summary of the descriptions of all detected obstructions.

                Format the output in JSON like this:

                ```json
                {
                "obstruction": true/false,
                "sufficient": true/false,
                "permanent": true/false,
                "flammable": true/false,
                "vehicle": true/false,
                "label": "Summary of labels",
                "description": "Summary of descriptions",
                }

            """,
            "temperature": 0.1
        }

        # Call the SageMaker endpoint
        output = predictor.predict(data)
        data = parse_report(output)

        return data

    except requests.RequestException as e:
        print(f"Error occurred while sending image to API: {e}")
        raise HTTPException(status_code=500, detail="Error occurred while processing the image through the API.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while processing the image through the API.")

