// "use client";
// "use server";

import { ReportData, GetReportsParams } from "../types"
import { revalidateTag } from "next/cache";


// const API_BASE_URL = 'http://localhost:8000';

const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;
// const NEXT_PUBLIC_API_BASE_URL = process.env.API_BASE_URL;


// const NEXT_PUBLIC_API_BASE_URL = 'http://host.docker.internal :8000';
const IMAGES_URL = `${NEXT_PUBLIC_API_BASE_URL}/images`;




const imageEndpoints = {
  create: `${IMAGES_URL}/`,
  processImage: `${IMAGES_URL}/process-image`, // See if add id to the endpoint or body
  getAll: `${IMAGES_URL}/`,
  delete: (id: number) => `${IMAGES_URL}/${id}`,
  getFullImage: (id: number) => `${IMAGES_URL}/${id}/full`,
  deleteImages: `${IMAGES_URL}/`,
};



export const getReports = async (params?: GetReportsParams): Promise<ReportData[]> => {
  try {
    // Construct query string
    const queryString = new URLSearchParams(params as any).toString();
    
    // Create the URL with query parameters if present
    const url = queryString ? `${imageEndpoints.getAll}?${queryString}` : imageEndpoints.getAll;
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // cache: 'force-cache',
      // cache: 'no-cache',
      next: { 
        tags: ['collection'], 
        revalidate: 60,
      },
      // cache: 'default',
      // cache: 'reload',
      // next: { revalidate: 1 },
    });

    if (!response.ok) {
      throw new Error('Failed to get Reports');
    }
    return await response.json();
  } catch (error) {
    console.error('Error getting reports:', error);
    throw error;
  }
};

export const getFullImageById = async (id: number): Promise<ReportData> => {
  try {
    // Construct the URL with the image ID
    const url = imageEndpoints.getFullImage(id);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // cache: 'no-cache',
      next: { 
        tags: ['collection'], 
        revalidate: 60,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to get Image');
    }

    // Parse the response to match the expected type
    return await response.json() as ReportData;
  } catch (error) {
    console.error('Error getting image:', error);
    throw error;
  }
};

