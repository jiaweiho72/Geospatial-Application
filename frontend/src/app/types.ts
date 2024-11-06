// ---------------------------------- Polygon ----------------------------------
export interface PolygonBase {
  name: string;
  address: string;
  type: string;
  coordinates: number[][];
  latest_status?: StatusEnum;
}

export interface Polygon extends PolygonBase {
  id: number;
}

export interface PolygonData {
  id: string;
  leafletID: string;
  name: string;
  address: string;
  type: string;
  coordinates: L.LatLng[];
  latest_status?: StatusEnum;
}

export interface CreatePolygonData {
  name: string;
  address: string;
  type: string;
  coordinates: L.LatLng[];
}

export interface UpdatePolygonData {
  id: string;
  name: string;
  address: string;
  type: string;
  coordinates: L.LatLng[];
}

// ---------------------------------- Image ----------------------------------
export interface CroppedImageAnalysisData {
  data:string;
}

export interface CroppedImageData {
  id: number;
  filename: string;
  url: string;
  data: Record<string, any>;
}

export interface ImageData {
  id: number;
  filename: string;
  annotated_url: string;
  cropped_images: CroppedImageData[];
}

export type ReportData = {
  id: number;
  created_at: string;
  label: string,
  location: string,
  filename: string | null;
  annotated_url: string | null;
};


export interface GetReportsParams {
  skip?: number;  // Optional
  limit?: number; // Optional
  sort_by?: string; // Optional
  sort_order?: 'asc' | 'desc'; // Optional
}


// ---------------------------------- Analytics ----------------------------------
export interface MetricsData {
  status_counts: { [key: string]: number };
  total_polygon_count: number,
  total_image_count: number,
  total_cropped_images: number,
  is_vehicle_count: number,
  is_flammable_count: number
}

export enum StatusEnum {
  Clear = "clear",
  Temporary = "temporary",
  Permanent = "permanent",
}
