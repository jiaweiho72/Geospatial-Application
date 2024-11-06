import React, { useEffect, useState } from 'react';
import { useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import 'leaflet.heat';
import { getHeatMapData } from "../../services/api";
const heatMapMax = parseInt(process.env.NEXT_PUBLIC_HEAT_MAP_MAX || '30', 10);
import { useHeatMapContext } from '@/context/HeatMapContext';


interface HeatMapData {
  id: number;
  name: string;
  coordinates: [number, number][];
  obstruction_count: number;
}

// Define the structure for a heat point
interface HeatPoint {
  latlng: L.LatLng;
  count: number;
}

const HeatLayer: React.FC = () => {
  const map = useMap();
  const { heatMapMax } = useHeatMapContext();
  const [polygons, setPolygons] = useState<HeatMapData[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data: HeatMapData[] = await getHeatMapData();
        setPolygons(data);
      } catch (error) {
        console.error("Error Fetching heatmap Data", error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    if (!map || polygons.length === 0) return;

    // Convert polygons into heatmap points
    const heatPoints: [number, number, number][] = polygons.map(polygon => {
      const center = getPolygonCenter(polygon.coordinates);
      return [...center, polygon.obstruction_count] as [number, number, number]; // [lat, lng, intensity]
    });

    const heatLayer = (L as any).heatLayer(heatPoints, {
      radius: 20,
      blur: 15,
      maxZoom: 10,
      max: heatMapMax, // Update this based on your max obstruction count
      minOpacity: 0.3,
      gradient: {
        0.0: 'blue',
        0.2: 'cyan',
        0.4: 'lime',
        0.6: 'yellow',
        0.8: 'orange',
        1.0: 'red'
      }
    }).addTo(map);

    // Create a tooltip
    const tooltip = L.tooltip({ permanent: false, opacity: 0.7 });

    // Function to show tooltip on hover
    const showTooltip = (e: any) => {
      const latlng = e.latlng; // Get the latitude and longitude of the mouse position
      const closestPoint = getClosestHeatPoint(latlng, heatPoints);

      if (closestPoint) {
        tooltip.setLatLng(closestPoint.latlng)
          .setContent(`Obstruction Count: ${closestPoint.count}`)
          .openOn(map);
      } else {
        tooltip.remove(); // Remove tooltip if no point is close enough
      }
    };

    // Function to hide tooltip
    const hideTooltip = () => {
      tooltip.remove();
    };

    // Listen for mousemove events
    map.on('mousemove', showTooltip);
    map.on('mouseout', hideTooltip);

    // Cleanup heat layer and event listeners on component unmount
    return () => {
      map.removeLayer(heatLayer);
      map.off('mousemove', showTooltip);
      map.off('mouseout', hideTooltip);
    };
  }, [map, polygons, heatMapMax]);

  // Function to calculate the center of a polygon
  const getPolygonCenter = (coordinates: [number, number][]) => {
    let lat = 0;
    let lng = 0;
    coordinates.forEach(coord => {
      lat += coord[0];
      lng += coord[1];
    });
    return [lat / coordinates.length, lng / coordinates.length] as [number, number];
  };

  // Function to find the closest heat point based on mouse position
  const getClosestHeatPoint = (latlng: L.LatLng, heatPoints: [number, number, number][]): HeatPoint | null => {
    let closestPoint: HeatPoint | null = null;
    let closestDistance = Infinity;
    const hoverRadius = 50; // Define a hover radius to detect proximity

    heatPoints.forEach(point => {
      const [lat, lng, count] = point;
      const distance = latlng.distanceTo(L.latLng(lat, lng));
      
      if (distance < closestDistance && distance <= hoverRadius) {
        closestDistance = distance;
        closestPoint = { latlng: L.latLng(lat, lng), count }; // Now TypeScript knows this is a HeatPoint
      }
    });

    return closestPoint;
  };

  return null;
};

export default HeatLayer;
