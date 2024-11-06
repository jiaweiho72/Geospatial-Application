"use client";

import L from 'leaflet';
import axios from 'axios';
import { saveAs } from 'file-saver';
import {
  Polygon,
  PolygonData,
  CreatePolygonData,
  UpdatePolygonData,
  MetricsData,
  ImageData
} from '../types';


// const API_BASE_URL = 'http://localhost:8000';
const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
// const NEXT_PUBLIC_API_BASE_URL = process.env.API_BASE_URL;

console.log(NEXT_PUBLIC_API_BASE_URL)

const POLYGONS_URL = `${NEXT_PUBLIC_API_BASE_URL}/polygons`;
const IMAGES_URL = `${NEXT_PUBLIC_API_BASE_URL}/images`;
const ANALYTICS_URL = `${NEXT_PUBLIC_API_BASE_URL}/analytics`;


// ---------------------------------- Polygon Endpoints ----------------------------------
export const polygonEndpoints = {
  getAll: `${POLYGONS_URL}/`,
  create: `${POLYGONS_URL}/`,
  update: (id: string) => `${POLYGONS_URL}/${id}`,
  delete: (id: number) => `${POLYGONS_URL}/${id}`,
  downloadCSV: `${POLYGONS_URL}/download-csv`,
  suggestions: (query: string) => `https://www.onemap.gov.sg/api/common/elastic/search?searchVal=${query}&returnGeom=Y&getAddrDetails=Y&pageNum=1`,
};

export const getPolygons = async (): Promise<PolygonData[]> => {
  try {
    console.log(NEXT_PUBLIC_API_BASE_URL)
    const response = await fetch(polygonEndpoints.getAll, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch polygons');
    }
    const jsonData: Polygon[] = await response.json();
    const convertedData: PolygonData[] = jsonData.map((polygon) => ({
      id: polygon.id.toString(),
      leafletID: '', // Placeholder for Leaflet ID, adjust as needed
      name: polygon.name,
      address: polygon.address,
      type: polygon.type,
      coordinates: polygon.coordinates.map((coord) =>
        L.latLng(coord[1], coord[0])
      ),
      latest_status: polygon.latest_status
    }));
    return convertedData;
  } catch (error) {
    console.error('Error fetching polygons:', error);
    throw error;
  }
};

export const createPolygon = async (data: CreatePolygonData) => {
  const coordinates: number[][] = data.coordinates.map((latlng) => [
    latlng.lng,
    latlng.lat,
  ]);
  if (coordinates.length > 0) {
    coordinates.push(coordinates[0]); // Ensure polygon is closed
  }
  const payload = {
    ...data,
    coordinates: coordinates,
  };
  try {
    const response = await fetch(polygonEndpoints.create, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error('Failed to create polygon');
    }
    return await response.json();
  } catch (error) {
    console.error('Error creating polygon:', error);
    throw error;
  }
};

export const updatePolygon = async (data: UpdatePolygonData): Promise<PolygonData> => {
  const coordinates: number[][] = data.coordinates.map((latlng) => [
    latlng.lng,
    latlng.lat,
  ]);
  if (coordinates.length > 0) {
    coordinates.push(coordinates[0]); // Ensure polygon is closed
  }
  const payload = {
    ...data,
    coordinates: coordinates,
  };
  try {
    const response = await fetch(polygonEndpoints.update(data.id), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`Failed to update polygon with id ${data.id}`);
    }
    return await response.json();
  } catch (error) {
    console.error(`Error updating polygon with id ${data.id}:`, error);
    throw error;
  }
};

export const deletePolygon = async (id: number): Promise<void> => {
  try {
    const response = await fetch(polygonEndpoints.delete(id), {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to delete polygon with id ${id}`);
    }
  } catch (error) {
    console.error(`Error deleting polygon with id ${id}:`, error);
    throw error;
  }
};

export const downloadCSV = async () => {
  try {
    const response = await fetch(polygonEndpoints.downloadCSV, {
      method: 'GET',
      headers: {
        'Content-Type': 'text/csv',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download CSV');
    }

    const text = await response.text();
    if (text.trim() === '') {
      return;
    }

    const blob = new Blob([text], { type: 'text/csv' });
    saveAs(blob, 'polygons.csv');
  } catch (error) {
    console.error('Error downloading CSV:', error);
    throw error;
  }
};

export const geocodeAddress = async (address: string) => {
  try {
    const response = await axios.get('https://www.onemap.gov.sg/api/common/elastic/search', {
      params: {
        searchVal: address,
        returnGeom: 'Y',
        getAddrDetails: 'Y',
        pageNum: 1,
      },
    });

    if (response.data.found === 0) {
      throw new Error('Address not found');
    }

    const { LATITUDE, LONGITUDE } = response.data.results[0];
    return { lat: parseFloat(LATITUDE), lon: parseFloat(LONGITUDE) };
  } catch (error) {
    console.error('Error geocoding address:', error);
    throw error;
  }
};

export const fetchSuggestions = async (query: string) => {
  try {
    const response = await axios.get(polygonEndpoints.suggestions(query));

    const results = response.data.results.map((result: any) => result.SEARCHVAL);
    return results;
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return [];
  }
};










// ---------------------------------- Image Endpoints ----------------------------------
export const imageEndpoints = {
  create: `${IMAGES_URL}/`,
  processImage: `${IMAGES_URL}/process-image`, // See if add id to the endpoint or body
  getAll: `${IMAGES_URL}/`,
  delete: (id: number) => `${IMAGES_URL}/${id}`,
  getFullImage: (id: number) => `${IMAGES_URL}/${id}/full`,
  deleteImages: `${IMAGES_URL}/`,
  generateReport: (id: number) => `${IMAGES_URL}/generate-report/${id}`,
  getProcessingStatus: (id: number) => `${IMAGES_URL}/processing-status/${id}`,
};




export const uploadFile = async (file: File, label: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('label', label); // Add the label to the form data

  console.log("uploadFile called");

  try {
    const response = await fetch(imageEndpoints.create, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorResponse = await response.json();
      throw new Error(errorResponse.detail || `HTTP error! Status: ${response.status}`);
    }

    return await response.json(); // Assuming response is JSON
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error uploading file: ${error.message}`);
    } else {
      throw new Error('Error uploading file: An unknown error occurred');
    }
  }
};





export const processImage = async (id: number) => {
  try {
    // Construct the URL with the query parameter
    const url = new URL(imageEndpoints.processImage);
    url.searchParams.append('id', id.toString());

    const response = await fetch(url.toString(), {
      method: 'POST', // Use 'GET' if your endpoint expects a GET request
      headers: {
        'Content-Type': 'application/json', // Headers might not be necessary if no body is sent
      },
    });

    if (!response.ok) {
      const errorResponse = await response.json();
      throw new Error(errorResponse.detail || `HTTP error! Status: ${response.status}`);
    }

    const jsonResponse = await response.json();
    console.log(jsonResponse); // Log the response
    return jsonResponse; // Return the response
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error processing image: ${error.message}`);
    } else {
      throw new Error('Error processing image: An unknown error occurred');
    }  
  }
};


export const deleteImages = async (ids: number[]): Promise<void> => {
  try {
    // Ensure ids is an array of integers
    if (!Array.isArray(ids) || !ids.every(id => Number.isInteger(id))) {
      throw new Error('The ids parameter should be an array of integers.');
    }

    const response = await fetch(imageEndpoints.deleteImages, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ids), // Send as a plain array
    });

    if (!response.ok) {
      const errorResponse = await response.json();
      throw new Error(errorResponse.detail || 'Failed to delete images');
    }

    console.log('Images have been deleted successfully.');
  } catch (error) {
    console.error('Error deleting images:', error);
    throw error;
  }
};



export const generateReport = async (id: number) => {
  try {
    const url = imageEndpoints.generateReport(id); // Construct the URL with the image ID

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorResponse = await response.json();
      throw new Error(errorResponse.detail || `Failed to generate report. Status: ${response.status}`);
    }

    // Convert the response to a Blob
    const blob = await response.blob();

    // Create a link element
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(blob);
    link.download = `report_${id}.pdf`;

    // Append the link to the document body and trigger a click to download the file
    document.body.appendChild(link);
    link.click();

    // Clean up the DOM
    link.remove();

    console.log('Report has been generated and downloaded successfully.');
  } catch (error) {
    console.error('Error generating report:', error);
    throw error;
  }
};

export const getProcessingStatus = async (id: number) => {
  try {
    const response = await fetch(imageEndpoints.getProcessingStatus(id), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get processing status for image with id ${id}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error checking processing status:', error);
    throw error;
  }
};







// ---------------------------------- Analytics Endpoints ----------------------------------
export const analyticEndpoints = {
  obstructionTimeSeries: `${ANALYTICS_URL}/obstruction-timeseries`,
  metrics: `${ANALYTICS_URL}/metrics`,
  heatMap: `${ANALYTICS_URL}/heat-map`,
};

// Modify to customise filter
export const getObstructionTimeSeries = async (): Promise<any[]> => {
  try {
    const response = await fetch(analyticEndpoints.obstructionTimeSeries, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch obstruction time series');
    }
    const jsonData: any[] = await response.json();
    return jsonData;
  } catch (error) {
    console.error('Error fetching polygons:', error);
    throw error;
  }
};

export const getMetrics = async (): Promise<MetricsData> => {
  try {
    const response = await fetch(analyticEndpoints.metrics, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch obstruction time series');
    }
    const jsonData: MetricsData = await response.json();
    return jsonData;
  } catch (error) {
    console.error('Error fetching polygons:', error);
    throw error;
  }
};


export const getHeatMapData = async (): Promise<any[]> => {
  try {
    const response = await fetch(analyticEndpoints.heatMap, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      throw new Error('Failed to fetch obstruction time series');
    }
    const jsonData: any[] = await response.json();
    return jsonData;
  } catch (error) {
    console.error('Error fetching polygons:', error);
    throw error;
  }
};




















export const getPresignedUrl = async (label: string) => {
  try {
    const response = await fetch(`${IMAGES_URL}/generate-presigned-url`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ label }),
    });

    if (!response.ok) {
      const errorResponse = await response.json();
      throw new Error(errorResponse.detail || `HTTP error! Status: ${response.status}`);
    }

    return await response.json(); // Assuming it returns { presigned_url, s3_key }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error getting presigned URL: ${error.message}`);
    } else {
      throw new Error('Error getting presigned URL: An unknown error occurred');
    }
  }
};

export const uploadFileToS3 = async (file: File, presignedUrl: string) => {
  try {
    const response = await fetch(presignedUrl, {
      method: 'PUT',
      body: file,
      // headers: {
      //   'Content-Type': file.type,
      // },
      // mode: 'no-cors',
    });

    if (!response.ok) {
      throw new Error(`Failed to upload file to S3: ${response.statusText}`);
    }

    return response;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error uploading file to S3: ${error.message}`);
    } else {
      throw new Error('Error uploading file to S3: An unknown error occurred');
    }
  }
};

export const notifyBackend = async (s3Key: string, label: string) => {
  try {
    const response = await fetch(`${IMAGES_URL}/notify-backend`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ s3_key: s3Key, label }),
    });

    if (!response.ok) {
      const errorResponse = await response.json();
      throw new Error(errorResponse.detail || `HTTP error! Status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Error notifying backend: ${error.message}`);
    } else {
      throw new Error('Error notifying backend: An unknown error occurred');
    }
  }
};






// Chunk size
const CHUNK_SIZE = 480 * 1024 * 1024; // 480MB
// const CHUNK_SIZE = 1 * 1024 * 1024; // 1MB
// const CHUNK_SIZE = 512 * 1024; // 512KB

// export const uploadFileInChunks = async (file: File, label: string): Promise<ImageData> => {
//   const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
//   const filename = file.name;

//   let imageId: string | null = null;

//   for (let chunkNumber = 1; chunkNumber <= totalChunks; chunkNumber++) {
//     const start = (chunkNumber - 1) * CHUNK_SIZE;
//     const end = Math.min(file.size, start + CHUNK_SIZE);
//     const chunk = file.slice(start, end);

//     const formData = new FormData();
//     formData.append('file', chunk);  // The current chunk
//     formData.append('chunk_number', chunkNumber.toString());
//     formData.append('total_chunks', totalChunks.toString());
//     formData.append('label', label);  // The label remains the same
//     formData.append('filename', filename);  // Pass the original filename to the backend

//     try {
//       const response = await fetch(`${IMAGES_URL}/upload-chunk/`, {
//         method: 'POST',
//         body: formData,
//       });

//       if (!response.ok) {
//         const errorResponse = await response.json();
//         throw new Error(errorResponse.detail || `HTTP error! Status: ${response.status}`);
//       }

//       const responseData = await response.json();

//       if (chunkNumber === totalChunks) {
//         // Extract image ID from the response after the final chunk
//         imageId = responseData.id;
//         console.log("Final chunk uploaded, Image ID:", imageId);
//         return responseData as ImageData;  // Return the full image data
//       } else {
//         console.log(`Chunk ${chunkNumber} of ${totalChunks} uploaded successfully.`);
//       }

//     } catch (error) {
//       if (error instanceof Error) {
//         console.error(error.message);
//         throw new Error(`Error uploading chunk ${chunkNumber}: ${error.message}`);
//       } else {
//         console.error('Unexpected error:', error);
//       }
      
//     }
//   }

//   throw new Error("Image ID could not be retrieved.");
// };

export const uploadFileInChunks = async (
  file: File, 
  label: string, 
  onProgress: (progress: number) => void // Progress callback
): Promise<ImageData> => {
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const filename = file.name;

  let imageId: string | null = null;

  for (let chunkNumber = 1; chunkNumber <= totalChunks; chunkNumber++) {
    const start = (chunkNumber - 1) * CHUNK_SIZE;
    const end = Math.min(file.size, start + CHUNK_SIZE);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('file', chunk);  // The current chunk
    formData.append('chunk_number', chunkNumber.toString());
    formData.append('total_chunks', totalChunks.toString());
    formData.append('label', label);  // The label remains the same
    formData.append('filename', filename);  // Pass the original filename to the backend

    try {
      const response = await fetch(`${IMAGES_URL}/upload-chunk/`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorResponse = await response.json();
        throw new Error(errorResponse.detail || `HTTP error! Status: ${response.status}`);
      }

      const responseData = await response.json();

      // Update the progress based on the current chunk number
      const progress = (chunkNumber / totalChunks) * 100;
      onProgress(progress); // Report the progress

      if (chunkNumber === totalChunks) {
        // Extract image ID from the response after the final chunk
        imageId = responseData.id;
        console.log("Final chunk uploaded, Image ID:", imageId);
        return responseData as ImageData;  // Return the full image data
      } else {
        console.log(`Chunk ${chunkNumber} of ${totalChunks} uploaded successfully.`);
      }

    } catch (error) {
      if (error instanceof Error) {
        console.error(error.message);
        throw new Error(`Error uploading chunk ${chunkNumber}: ${error.message}`);
      } else {
        console.error('Unexpected error:', error);
      }
    }
  }

  throw new Error("Image ID could not be retrieved.");
};



import AWS from 'aws-sdk';

// AWS S3 configuration
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Your AWS access key
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // Your AWS secret key
  region: process.env.AWS_REGION, // Your S3 bucket region
});

const s3 = new AWS.S3();

// export const uploadFile = async (file: File, label: string) => {
//   // Ensure that the bucket name is defined
//   // const bucketName = process.env.AWS_BUCKET_NAME;
//   // const prefix = process.env.AWS_PREFIX || "uploads"; // Ensure PREFIX is defined or use a default
//   const bucketName = 'template-a-pafw-sftp-myproject-8twc0tf';
//   const prefix = 'fireaccesswayimage-3jrqz/dataset'; // Ensure PREFIX is defined or use a default

//   if (!bucketName) {
//     throw new Error('S3 bucket name is not defined. Please check your environment variables.');
//   }

//   // Use the PREFIX for the key, maintaining the original functionality
//   const params = {
//     Bucket: bucketName, 
//     Key: `${prefix}/${file.name}`, // Use the prefix as part of the S3 Key
//     Body: file,
//     ContentType: file.type,
//   };

//   console.log("uploadFile called with params:", params);

//   try {
//     // Uploading the file to S3
//     const data = await s3.upload(params).promise();
//     console.log('File uploaded successfully:', data);

//     // Create a payload to send to your backend for DB storage
//     const imagePayload = {
//       filename: file.name,
//       label: label,
//       original_s3_key: data.Key, // The S3 object key
//     };

//     // Save the initial image details to the database
//     const response = await fetch(imageEndpoints.create, {
//       method: 'POST',
//       headers: {
//         'Content-Type': 'application/json',
//       },
//       body: JSON.stringify(imagePayload),
//     });

//     if (!response.ok) {
//       const errorResponse = await response.json();
//       throw new Error(errorResponse.detail || `HTTP error! Status: ${response.status}`);
//     }

//     return await response.json(); // Assuming response is JSON
//   } catch (error) {
//     if (error instanceof Error) {
//       throw new Error(`Error uploading file: ${error.message}`);
//     } else {
//       throw new Error('Error uploading file: An unknown error occurred');
//     }
//   }
// };

