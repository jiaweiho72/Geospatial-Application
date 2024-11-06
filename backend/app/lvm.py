import requests
import base64
from fastapi import HTTPException
import json
import os
from dotenv import load_dotenv
from app import schemas
import boto3
from botocore.client import Config
from PIL import Image
import io
import re
import time  # Added for timing measurements
from io import BytesIO

# -------------------------------- Connection to Ollama API --------------------------------
load_dotenv()

OLLAMA_API_URL = os.getenv('OLLAMA_API_URL')
TEMPERATURE = 0.1

AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.getenv("AWS_REGION")
BUCKET_NAME = os.getenv("BUCKET_NAME")
PREFIX_FIRE_ACCESS_WAY = os.getenv("PREFIX_FIRE_ACCESS_WAY")

# s3_client = boto3.client(
#     's3',
#     aws_access_key_id=AWS_ACCESS_KEY_ID,
#     aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
#     region_name=AWS_REGION,
#     config=Config(signature_version='s3v4'),
# )

# -------------------------------- Utility Functions --------------------------------
def parse_report(report_string: str) -> dict:
    try:
        # Print the string representation for debugging
        print(f"String representation: {repr(report_string)}")
        print(f"Raw bytes: {report_string.encode('utf-8')}")

        # Extract the JSON object using regex to handle cases with extra text
        json_match = re.search(r'\{.*\}', report_string, re.DOTALL)
        if json_match:
            json_string = json_match.group(0)
            # Attempt to parse as JSON
            data = json.loads(json_string)

            # Process and return the data
            result = {
                "obstruction_present": data.get("obstruction", False),
                "sufficient_clearance": data.get("sufficient", False),
                "sufficient_explanation": data.get("sufficient_explanation", ""),
                "is_permanent": data.get("permanent", False),
                "permanent_explanation": data.get("permanent_explanation", ""),
                "is_flammable": data.get("flammable", False),
                "flammable_explanation": data.get("flammable_explanation", ""),
                "is_vehicle": data.get("vehicle", False),
                "vehicle_explanation": data.get("vehicle_explanation", ""),
                "label": data.get("label", ""),
                "description": data.get("description", ""),
                "recommended_actions": data.get("actions", ""),
            }
            return result
        else:
            raise ValueError("No valid JSON object found in the report string.")

    except json.JSONDecodeError as e:
        print(f"Error decoding JSON: {e}")
        raise HTTPException(status_code=500, detail="Error occurred while parsing the report.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while processing the report.")

def normalize_string(s: str) -> str:
    # Remove leading/trailing whitespace and replace newline characters with spaces
    return s.strip().replace('\n', '').replace('\r', '')

# def encode_image_to_base64(s3_url: str, max_size: tuple = (2048, 2048)) -> str:
#     try:
#         start_time = time.time()
#         print("Starting image encoding to base64...")

#         # Fetch the image from the S3 presigned URL using streaming to avoid loading entire file into memory
#         response = requests.get(s3_url, stream=True)
#         response.raise_for_status()

#         # Open the image directly from the response stream
#         with Image.open(response.raw) as img:
#             # Resize the image while maintaining aspect ratio if needed
#             original_size = img.size
#             print(f"Original image size: {original_size}")

#             if max(img.size) > max(max_size):
#                 img.thumbnail(max_size, Image.LANCZOS)
#                 print(f"Image resized to: {img.size}")

#             # Convert image to JPEG to reduce file size
#             if img.mode != 'RGB':
#                 img = img.convert('RGB')  # Ensure image is in RGB mode

#             buffered = io.BytesIO()
#             img.save(buffered, format="JPEG", quality=90, optimize=True)
#             jpeg_image_content = buffered.getvalue()

#         # Encode resized image to base64
#         base64_image = base64.b64encode(jpeg_image_content).decode('utf-8')

#         # Debug: print base64 image length
#         print(f"Base64 Image Length: {len(base64_image)}")

#         end_time = time.time()
#         print(f"Image encoding completed in {end_time - start_time:.2f} seconds.")

#         return base64_image

#     except Exception as e:
#         print(f"Error occurred: {e}")
#         raise HTTPException(status_code=500, detail=f"Error occurred while encoding image: {str(e)}")

def encode_image_to_base64(image_data: BytesIO, max_size: tuple = (1024, 1024), quality: int = 100, save_path: str = 'output_image.jpg', base64_save_path: str = 'base64_image.txt') -> str:
    try:
        start_time = time.time()
        print("Starting image encoding to base64...")

        # Ensure the buffer is at the start
        image_data.seek(0)

        # Open the image with PIL
        with Image.open(image_data) as img:
            # Resize the image while maintaining aspect ratio

            # original_size = img.size
            # print(f"Original image size: {original_size}")

            # img.thumbnail(max_size, Image.Resampling.LANCZOS)  # Use the correct resampling filter
            # print(f"Image resized to: {img.size}")

            # Convert image to JPEG to reduce file size
            if img.mode != 'RGB':
                img = img.convert('RGB')  # Ensure image is in RGB mode

            # Save the resized image for quality inspection
            # img.save(save_path, format="JPEG", quality=quality, optimize=True)
            # print(f"Resized image saved as: {save_path}")

            buffered = BytesIO()
            img.save(buffered, format="JPEG", quality=quality, optimize=True)  # Set quality for compression
            jpeg_image_content = buffered.getvalue()

        # Encode resized image to base64
        base64_image = base64.b64encode(jpeg_image_content).decode('utf-8')
        print(f"Base64 Image Length: {len(base64_image)}")

        end_time = time.time()
        print(f"Image encoding completed in {end_time - start_time:.2f} seconds.")

        return base64_image
    except Exception as e:
        print(f"Error occurred: {e}")
        raise HTTPException(status_code=500, detail=f"Error occurred while encoding image: {str(e)}")


# def generate_presigned_url(s3_key: str, expiration: int = 3600):
#     try:
#         url = s3_client.generate_presigned_url(
#             ClientMethod='get_object',
#             Params={'Bucket': BUCKET_NAME, 'Key': s3_key},
#             ExpiresIn=expiration,
#             HttpMethod='GET'
#         )
#         return url
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=str(e))

# -------------------------------- Main function --------------------------------
# def run_image_through_model(cropped_image: schemas.CroppedImage) -> dict:

# Original luixiao/ollama
# def run_image_through_model(image_data: BytesIO) -> dict:
#     try:
#         total_start_time = time.time()
#         print("Starting run_image_through_model...")

#         # # Generate the presigned URL for the image
#         # presign_start_time = time.time()
#         # s3_img_url = generate_presigned_url(cropped_image.s3_key)
#         # presign_end_time = time.time()
#         # print(f"Presigned URL generated in {presign_end_time - presign_start_time:.2f} seconds.")

#         # # Encode image to base64
#         # base64_encode_start_time = time.time()
#         # base64_image = encode_image_to_base64(s3_img_url)
#         # base64_encode_end_time = time.time()
#         # print(f"Image encoded to base64 in {base64_encode_end_time - base64_encode_start_time:.2f} seconds.")

#         total_start_time = time.time()
#         print("Starting run_image_through_model...")

#         # Encode image to base64
#         base64_encode_start_time = time.time()
#         base64_image = encode_image_to_base64(image_data)
#         base64_encode_end_time = time.time()
#         print(f"Image encoded to base64 in {base64_encode_end_time - base64_encode_start_time:.2f} seconds.")


#         # Prepare the data payload
#         data_prep_start_time = time.time()
#         # data = {
#         #     # "model": "aiden_lu/minicpm-v2.6:Q4_K_M",
#         #     "model": "minicpm-v",
#         #     # "model": "llava",

#         #     "prompt": """
#         #         Analyze the entire cropped image for obstructions in fire access ways. Since the image is cropped, do not consider areas outside of the image in your analysis.

#         #         **Important**: Ensure high accuracy in the detection of obstructions such as vehicles to eliminate false positives and false negatives. Logical consistency between every single field/detail is mandatory. For example, if a vehicle is detected, it must correlate with an obstruction. If a description mentions the presence of vehicle(s), the 'vehicle' boolean must be true and cannot be false. 
                
#         #         Ensure that the response is in the exact format specified below
                
#         #         Provide a summary report with the following details in JSON format:

#         #         1. "obstruction": Indicate if any obstruction is detected (true/false).
#         #         2. "sufficient": Indicate if a SCDF fire engine can pass through the area considering all detected obstructions (true/false).
#         #         3. "sufficient_explanation": Provide an explanation for why the area is sufficient or not for a SCDF fire engine (truck).
#         #         4. "permanent": Indicate if any of the detected obstructions are permanent (true/false).
#         #         5. "permanent_explanation": Provide an explanation for why any detected obstruction is permanent or not.
#         #         6. "flammable": Indicate if any of the detected obstructions are flammable (true/false).
#         #         7. "flammable_explanation": Provide an explanation for why the obstruction is considered flammable or not.
#         #         8. "vehicle": Indicate if any of the detected obstructions is/are vehicle(s) (true/false).
#         #         9. "vehicle_explanation": Provide an explanation for why the obstruction is considered a vehicle or not.
#         #         10. "label": Provide a brief, comma-separated string of the types of all detected obstructions.
#         #         11. "description": Provide a concise summary of the descriptions of all detected obstructions.

#         #         Format the output as a valid JSON object:
#         #         {
#         #         "obstruction": boolean,
#         #         "sufficient": boolean,
#         #         "sufficient_explanation": "string",
#         #         "permanent": boolean,
#         #         "permanent_explanation": "string",
#         #         "flammable": boolean,
#         #         "flammable_explanation": "string",
#         #         "vehicle": boolean,
#         #         "vehicle_explanation": "string",
#         #         "label": "string",
#         #         "description": "string"
#         #         }

#         #         Important: Return only the JSON object without any additional text, explanation, or formatting outside of the JSON object. Ensure that the output is a pure JSON object. Make certain that all boolean values are lowercase (true/false) and all string values are properly enclosed in double quotes.
#         #     """,
            
#         #     "stream": False,
#         #     "format": "json",
#         #     "options": {
#         #         "temperature": TEMPERATURE
#         #     },
#         #     "images": [base64_image]
#         # }
        
#         data_prep_end_time = time.time()
#         print(f"Data payload prepared in {data_prep_end_time - data_prep_start_time:.2f} seconds.")

#         # Call the Ollama API endpoint
#         api_call_start_time = time.time()
#         # response = requests.post(OLLAMA_API_URL, json=data)
#         data = {
#             "model": "aiden_lu/minicpm-v2.6:Q4_K_M",
#             # "model": "minicpm-v",

#             # "model": "llava",

#             "prompt": """
#                 Analyze the entire cropped image for obstructions in fire access ways. Since the image is cropped, do not consider areas outside of the image in your analysis.

#                 **Important**: Ensure high accuracy in the detection of obstructions such as vehicles to eliminate false positives and false negatives. Logical consistency between every single field/detail is mandatory. For example, if a vehicle is detected, it must correlate with an obstruction. If a description mentions the presence of vehicle(s), the 'vehicle' boolean must be true and cannot be false. 
                
#                 Ensure that the response is in the exact format specified below
                
#                 Provide a summary report with the following details in JSON format:

#                 1. "obstruction": Indicate if any obstruction is detected (true/false).
#                 2. "sufficient": Indicate if a SCDF fire engine can pass through the area considering all detected obstructions (true/false).
#                 3. "sufficient_explanation": Provide an explanation for why the area is sufficient or not for a SCDF fire engine (truck).
#                 4. "permanent": Indicate if any of the detected obstructions are permanent (true/false).
#                 5. "permanent_explanation": Provide an explanation for why any detected obstruction is permanent or not.
#                 6. "flammable": Indicate if any of the detected obstructions are flammable (true/false).
#                 7. "flammable_explanation": Provide an explanation for why the obstruction is considered flammable or not.
#                 8. "vehicle": Indicate if any of the detected obstructions is/are vehicle(s) (true/false).
#                 9. "vehicle_explanation": Provide an explanation for why the obstruction is considered a vehicle or not.
#                 10. "label": Provide a brief, comma-separated string of the types of all detected obstructions.
#                 11. "description": Provide a concise summary of the descriptions of all detected obstructions.

#                 Format the output as a valid JSON object:
#                 {
#                 "obstruction": boolean,
#                 "sufficient": boolean,
#                 "sufficient_explanation": "string",
#                 "permanent": boolean,
#                 "permanent_explanation": "string",
#                 "flammable": boolean,
#                 "flammable_explanation": "string",
#                 "vehicle": boolean,
#                 "vehicle_explanation": "string",
#                 "label": "string",
#                 "description": "string"
#                 }

#                 Important: Return only the JSON object without any additional text, explanation, or formatting outside of the JSON object. Ensure that the output is a pure JSON object. Make certain that all boolean values are lowercase (true/false) and all string values are properly enclosed in double quotes.
#             """,
#             "stream": False,
#             "format": "json",
#             "options": {
#                 "temperature": TEMPERATURE
#             },
#             "images": [base64_image]

#             # 'images': ("image.jpg", image_data, "image/jpeg")
#             # 'images': (None, base64_image)
#         }
        
        
#         response = requests.post(OLLAMA_API_URL, json=data)

#         response.raise_for_status()
#         output = response.json()
#         api_call_end_time = time.time()
#         print(f"API call completed in {api_call_end_time - api_call_start_time:.2f} seconds.")

#         # Extract the value of the "response" key
#         output_text = output['response']
#         print(f"Ollama API Response: {output_text}")

#         # Parse the report
#         parse_start_time = time.time()
#         data = parse_report(output_text)
#         parse_end_time = time.time()
#         print(f"Report parsed in {parse_end_time - parse_start_time:.2f} seconds.")

#         total_end_time = time.time()
#         print(f"run_image_through_model completed in {total_end_time - total_start_time:.2f} seconds.")

#         return data

#     except requests.RequestException as e:
#         print(f"Error occurred while sending image to API: {e}")
#         raise HTTPException(status_code=500, detail="Error occurred while processing the image through the API.")
#     except Exception as e:
#         print(f"An unexpected error occurred: {e}")
#         raise HTTPException(status_code=500, detail="An unexpected error occurred while processing the image through the API.")

# Official ollama/ollama
def run_image_through_model(image_data: BytesIO) -> dict:
    try:
        total_start_time = time.time()
        print("Starting run_image_through_model...")

        # # Generate the presigned URL for the image
        # presign_start_time = time.time()
        # s3_img_url = generate_presigned_url(cropped_image.s3_key)
        # presign_end_time = time.time()
        # print(f"Presigned URL generated in {presign_end_time - presign_start_time:.2f} seconds.")

        # # Encode image to base64
        # base64_encode_start_time = time.time()
        # base64_image = encode_image_to_base64(s3_img_url)
        # base64_encode_end_time = time.time()
        # print(f"Image encoded to base64 in {base64_encode_end_time - base64_encode_start_time:.2f} seconds.")

        total_start_time = time.time()
        print("Starting run_image_through_model...")

        # Encode image to base64
        base64_encode_start_time = time.time()
        base64_image = encode_image_to_base64(image_data)
        base64_encode_end_time = time.time()
        print(f"Image encoded to base64 in {base64_encode_end_time - base64_encode_start_time:.2f} seconds.")


        # Prepare the data payload
        data_prep_start_time = time.time()

        data = {
            # "model": "aiden_lu/minicpm-v2.6:Q4_K_M",
            "model": "llava:7b",

            "prompt": """
                Analyze the entire cropped image for obstructions in fire access ways. Since the image is cropped, do not consider areas outside of the image in your analysis.

                **Important**: Ensure high accuracy in the detection of obstructions such as vehicles to eliminate false positives and false negatives. Logical consistency between every single field/detail is mandatory. For example, if a vehicle is detected, it must correlate with an obstruction. If a description mentions the presence of vehicle(s), the 'vehicle' boolean must be true and cannot be false. 
                
                Ensure that the response is in the exact format specified below
                
                Provide a summary report with the following details in JSON format:

                1. "obstruction": Indicate if any obstruction is detected (true/false).
                2. "sufficient": Indicate if a SCDF fire engine can pass through the area considering all detected obstructions (true/false).
                3. "sufficient_explanation": Provide an explanation for why the area is sufficient or not for a SCDF fire engine (truck).
                4. "permanent": Indicate if any of the detected obstructions are permanent (true/false).
                5. "permanent_explanation": Provide an explanation for why any detected obstruction is permanent or not.
                6. "flammable": Indicate if any of the detected obstructions are flammable (true/false).
                7. "flammable_explanation": Provide an explanation for why the obstruction is considered flammable or not.
                8. "vehicle": Indicate if any of the detected obstructions is/are vehicle(s) (true/false).
                9. "vehicle_explanation": Provide an explanation for why the obstruction is considered a vehicle or not.
                10. "label": Provide a brief, comma-separated string of the types of all detected obstructions.
                11. "description": Provide a concise summary of the descriptions of all detected obstructions.

                Format the output as a valid JSON object:
                {
                "obstruction": boolean,
                "sufficient": boolean,
                "sufficient_explanation": "string",
                "permanent": boolean,
                "permanent_explanation": "string",
                "flammable": boolean,
                "flammable_explanation": "string",
                "vehicle": boolean,
                "vehicle_explanation": "string",
                "label": "string",
                "description": "string"
                }

                Important: Return only the JSON object without any additional text, explanation, or formatting outside of the JSON object. Ensure that the output is a pure JSON object. Make certain that all boolean values are lowercase (true/false) and all string values are properly enclosed in double quotes.
            """,
            
            "stream": False,
            "format": "json",
            "options": {
                "temperature": TEMPERATURE
            },
            "image": [base64_image]
            # 'images': ("image.jpg", image_data, "image/jpeg")
            # 'images': (None, base64_image)
        }

        data_prep_end_time = time.time()
        print(f"Data payload prepared in {data_prep_end_time - data_prep_start_time:.2f} seconds.")

        # Call the Ollama API endpoint
        api_call_start_time = time.time()
        response = requests.post(OLLAMA_API_URL, json=data)
        # print("Raw response content:", response.text)

        response.raise_for_status()
        output = response.json()
        api_call_end_time = time.time()
        print(f"API call completed in {api_call_end_time - api_call_start_time:.2f} seconds.")

        # Extract the value of the "response" key
        output_text = output['response']
        print(f"Ollama API Response: {output_text}")

        # Parse the report
        parse_start_time = time.time()
        data = parse_report(output_text)
        parse_end_time = time.time()
        print(f"Report parsed in {parse_end_time - parse_start_time:.2f} seconds.")

        total_end_time = time.time()
        print(f"run_image_through_model completed in {total_end_time - total_start_time:.2f} seconds.")

        return data

    except requests.RequestException as e:
        print(f"Error occurred while sending image to API: {e}")
        raise HTTPException(status_code=500, detail="Error occurred while processing the image through the API.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        raise HTTPException(status_code=500, detail="An unexpected error occurred while processing the image through the API.")






# def run_image_through_model(image_data: BytesIO) -> dict:
#     try:
#         # data = {
#         #     "model": "llava",
#         #     "prompt": "Test connection",
#         #     "stream": False,
#         # }
#         data = {
#             # "model": "aiden_lu/minicpm-v2.6:Q4_K_M",
#             "model": "llava",

#             "prompt": """
#                 Analyze the entire cropped image for obstructions in fire access ways. Since the image is cropped, do not consider areas outside of the image in your analysis.

#                 **Important**: Ensure high accuracy in the detection of obstructions such as vehicles to eliminate false positives and false negatives. Logical consistency between every single field/detail is mandatory. For example, if a vehicle is detected, it must correlate with an obstruction. If a description mentions the presence of vehicle(s), the 'vehicle' boolean must be true and cannot be false. 
                
#                 Ensure that the response is in the exact format specified below
                
#                 Provide a summary report with the following details in JSON format:

#                 1. "obstruction": Indicate if any obstruction is detected (true/false).
#                 2. "sufficient": Indicate if a SCDF fire engine can pass through the area considering all detected obstructions (true/false).
#                 3. "sufficient_explanation": Provide an explanation for why the area is sufficient or not for a SCDF fire engine (truck).
#                 4. "permanent": Indicate if any of the detected obstructions are permanent (true/false).
#                 5. "permanent_explanation": Provide an explanation for why any detected obstruction is permanent or not.
#                 6. "flammable": Indicate if any of the detected obstructions are flammable (true/false).
#                 7. "flammable_explanation": Provide an explanation for why the obstruction is considered flammable or not.
#                 8. "vehicle": Indicate if any of the detected obstructions is/are vehicle(s) (true/false).
#                 9. "vehicle_explanation": Provide an explanation for why the obstruction is considered a vehicle or not.
#                 10. "label": Provide a brief, comma-separated string of the types of all detected obstructions.
#                 11. "description": Provide a concise summary of the descriptions of all detected obstructions.

#                 Format the output as a valid JSON object:
#                 {
#                 "obstruction": boolean,
#                 "sufficient": boolean,
#                 "sufficient_explanation": "string",
#                 "permanent": boolean,
#                 "permanent_explanation": "string",
#                 "flammable": boolean,
#                 "flammable_explanation": "string",
#                 "vehicle": boolean,
#                 "vehicle_explanation": "string",
#                 "label": "string",
#                 "description": "string"
#                 }

#                 Important: Return only the JSON object without any additional text, explanation, or formatting outside of the JSON object. Ensure that the output is a pure JSON object. Make certain that all boolean values are lowercase (true/false) and all string values are properly enclosed in double quotes.
#             """,
            
#             "stream": False,
#             # "format": "json",
#             # "options": {
#             #     "temperature": TEMPERATURE
#             # },
#             # "image": [base64_image]
#             # 'images': ("image.jpg", image_data, "image/jpeg")
#             # 'images': (None, base64_image)
#         }

        
#         response = requests.post(OLLAMA_API_URL, json=data)
        
#         if response.ok:
#             print("Raw response content:", response.text)
#             try:
#                 return response.json()
#             except ValueError as e:
#                 print("JSON parsing error:", e)
#                 print("Response content that caused error:", response.text)
#                 return None  # Handle gracefully
#         else:
#             print("Failed to connect. Status code:", response.status_code)
#             print("Response content:", response.text)
#             return None  # Return None for non-2xx responses

#     except requests.exceptions.RequestException as e:
#         print("Error during the API call:", e)
#         return None  # Ensure function returns None on request errors





# Qwen H100
# def run_image_through_model(image_data: BytesIO) -> dict:
#     try:
#         total_start_time = time.time()
#         print("Starting run_image_through_model...")

#         # # Save the input image locally for inspection
#         # input_image = Image.open(image_data)
#         # input_image.save("input_image.jpg")  # Saves the image as "input_image.jpg" in the current directory
#         # print("Image saved as 'input_image.jpg' for inspection.")

#         # # Reset the BytesIO object position after saving the image
#         # image_data.seek(0)

#         # Prepare the data payload
#         data_prep_start_time = time.time()
        
#         # Define the prompt string
#         prompt_text = """
#             Analyze the entire cropped image for obstructions in fire access ways. Since the image is cropped, do not consider areas outside of the image in your analysis. This is an arial view taken directly down from a drone.

#             **Important**: Ensure high accuracy in the detection of obstructions such as vehicles to eliminate false positives. Err at the side of caution to not detect things that are not there, so ensure False Positive is zero. If it is hard to tell from the image, it is better to not predict something that is not there.
            
#             Logical consistency between every single field/detail is mandatory. For example, if a vehicle is detected, it must correlate with an obstruction. If a description mentions the presence of vehicle(s), the 'vehicle' boolean must be true and cannot be false. 

#             Ensure that the response is in the exact format specified below.
            
#             Provide a summary report with the following details in JSON format:
            
#             {
#                 "obstruction": boolean,
#                 "sufficient": boolean,
#                 "sufficient_explanation": "string",
#                 "permanent": boolean,
#                 "permanent_explanation": "string",
#                 "flammable": boolean,
#                 "flammable_explanation": "string",
#                 "vehicle": boolean,
#                 "vehicle_explanation": "string",
#                 "label": "string",
#                 "description": "string"
#             }

#             Important: Return only the JSON object without any additional text, explanation, or formatting outside of the JSON object. Ensure that the output is a pure JSON object. Make certain that all boolean values are lowercase (true/false) and all string values are properly enclosed in double quotes.
#         """
        
#         # Prepare the `files` dictionary for the multipart form-data request
#         files = {
#             "prompt": (None, prompt_text),  # Prompt as plain text
#             "images": ("image.jpg", image_data, "image/jpeg"),  # Image as binary data
#         }
        
#         data_prep_end_time = time.time()
#         print(f"Data payload prepared in {data_prep_end_time - data_prep_start_time:.2f} seconds.")

#         # Call the API endpoint
#         api_call_start_time = time.time()
#         response = requests.post(OLLAMA_API_URL, files=files)
#         response.raise_for_status()
#         api_call_end_time = time.time()
#         print(f"API call completed in {api_call_end_time - api_call_start_time:.2f} seconds.")

#         # Extract the value of the "response" key
#         output = response.json()
#         output_text = output['response']
#         print(f"Ollama API Response: {output_text}")

#         # Parse the report
#         parse_start_time = time.time()
#         data = parse_report(output_text)  # Custom parsing function to parse JSON output
#         parse_end_time = time.time()
#         print(f"Report parsed in {parse_end_time - parse_start_time:.2f} seconds.")

#         total_end_time = time.time()
#         print(f"run_image_through_model completed in {total_end_time - total_start_time:.2f} seconds.")

#         return data

#     except requests.RequestException as e:
#         print(f"Error occurred while sending image to API: {e}")
#         raise HTTPException(status_code=500, detail="Error occurred while processing the image through the API.")
#     except Exception as e:
#         print(f"An unexpected error occurred: {e}")
#         raise HTTPException(status_code=500, detail="An unexpected error occurred while processing the image through the API.")





    