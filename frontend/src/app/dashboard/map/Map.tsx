'use client';

import React, { useState, useEffect, useRef, useMemo } from "react";

import L, { LatLng } from 'leaflet';
import { MapContainer, TileLayer, Tooltip, Popup, Polygon, FeatureGroup, ZoomControl, Marker } from "react-leaflet";
import { EditControl } from "react-leaflet-draw";
import "leaflet/dist/leaflet.css";
import 'leaflet-draw/dist/leaflet.draw.css';

import { createPolygon, getPolygons, updatePolygon, deletePolygon, geocodeAddress } from "../../services/api";
import { CreatePolygonData, UpdatePolygonData, PolygonData, StatusEnum } from "../../types";

import ErrorMessage from '../../../components/custom_app_components/ErrorMesssage';
import SearchBar from '../../../components/custom_app_components/SearchBar';
import Attribution from "../../../components/custom_app_components/Attribution";
import ConfirmationDialog from '../../../components/custom_app_components/ConfirmationDialog';

import MarkerClusterGroup from "react-leaflet-cluster"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { Toaster } from "@/components/ui/toaster"
import { IoLocationOutline, IoMap } from "react-icons/io5";
import { BarChart, MapPin } from "lucide-react";

import { StatusColors } from '@/app/constants/colours'; 
// Note - Leaflet ID is to track/interact with the drawings in leafletJS. The other ID is created by the database.
import HeatLayer from './HeatLayer'; // Import the HeatLayer component
import HeatMapLegend from './HeatMapLegend'; // Import the HeatMapLegend component
import { HeatMapProvider } from '@/context/HeatMapContext';

const heatMapMax = parseInt(process.env.NEXT_PUBLIC_HEAT_MAP_MAX || '30', 10);


// Variable constants
const mapUrls = [
  'https://www.onemap.gov.sg/maps/tiles/Default/{z}/{x}/{y}.png', 
  'https://www.onemap.gov.sg/maps/tiles/Satellite/{z}/{x}/{y}.png',
  // 'https://www.onemap.gov.sg/maps/tiles/Default_HD/{z}/{x}/{y}.png',
]
const default_coordinates: L.LatLng = L.latLng(1.3521, 103.8198); // Center of Singapore
const DEFAULT_ZOOM = 12
let sw = L.latLng(1.144, 103.535);
let ne = L.latLng(1.494, 104.502);
let bounds = L.latLngBounds(sw, ne);

// Formatting icons
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.3.1/images/marker-shadow.png",
});

const Map: React.FC = () => {
  const [polygons, setPolygons] = useState<PolygonData[]>([]);
  const [popupPosition, setPopupPosition] = useState<LatLng>(default_coordinates);
  const [showPopup, setShowPopup] = useState<boolean>(false);

  const [currentPolygonLeafletId, setCurrentPolygonLeafletId] = useState<string>("null");

  const [name, setName] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [type, setType] = useState<string>("");

  const popupElRef = useRef<L.Popup | null>(null);
  const polygonRef = useRef<L.Polygon | null>(null);

  const [tooltipOpened, setTooltipOpened] = useState<boolean>(true);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAttempted = useRef(false);
  const [mapAddress, setMapAddress] = useState<string>("")
  const [showMarkers, setShowMarkers] = useState<boolean>(false); // State to manage marker visibility
  const [showHeatMap, setShowHeatMap] = useState<boolean>(false); // State to manage marker visibility

  const [mapUrl, setMapUrl] = useState<string>(mapUrls[0])
  const [currentIndex, setCurrentIndex] = useState(0);

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [pendingDeletion, setPendingDeletion] = useState([]);

  const mapRef = useRef<L.Map>(null);
  const { toast } = useToast()

  // Initial database fetching of saved polygons from backend
  useEffect(() => {
    const fetchPolygons = async () => {
      if (fetchAttempted.current) {
        return; // Prevent fetching data again
      }
      fetchAttempted.current = true; // Set flag to true to prevent re-fetching
  
      try {
        setLoading(true);
        const data = await getPolygons();
        setPolygons(data as PolygonData[]);
        console.log('Fetching polygons from database')
      } catch (err) {
        setError('Failed to load polygons from database');
      } finally {
        setLoading(false);
      }
    };
    fetchPolygons();
  }, []);

  // For development - to check state of polygons list
  useEffect(() => {
    console.log("Updated list of Polygons:", polygons);
  }, [polygons]);

  // ---------------------- Helper functions ------------------------------
  const closePopup = () => {
    if (popupElRef.current) {
      popupElRef.current.close();
    }
  }

  // Save edit of polygon details
  const handleEdit = (polygonLeafletId: string) => {
    setPolygons(polygons.map(polygon => {
      if (polygon.leafletID === polygonLeafletId) {
        const updatedPolygon = { ...polygon, name, address, type };
        handleUpdatePolygon(updatedPolygon);
        return updatedPolygon;
      }
      return polygon;
    }));
    closePopup();
    setCurrentPolygonLeafletId("null"); // Reset current polygon leafletID
    toast({
      description: "Changes saved successfully",
      duration:2000,
    })
    console.log("Polygon edited:", polygonLeafletId);
  };

  // Save edit for NEWLY CREATED polygon details
  const handleSave = () => {
    setPolygons(polygons.map(polygon => {
      if (polygon.leafletID === currentPolygonLeafletId) {
        const updatedPolygon = { ...polygon, name, address, type };
        handleUpdatePolygon(updatedPolygon); // Consider returning the response object instead
        return updatedPolygon;
      }
      return polygon;
    }));
    setShowPopup(false); // Only difference from handleEdit -> Because they are different popups
    setCurrentPolygonLeafletId("null");
    toast({
      description: "Saved successfully",
      duration:2000,
    })
    console.log("Polygon saved:", currentPolygonLeafletId);
  };

  // ---------------------- Handle API Calls ------------------------------
  const handleUpdatePolygon = async (polygon: UpdatePolygonData) => {
    try {
      const updatedPolygon: UpdatePolygonData = await updatePolygon(polygon);
      console.log("Updated Polygon:", updatedPolygon);
    } catch (error) {
      console.error("Error updating polygon:", error);
    }
  };

  const handleCreatePolygon = async (latlngs: LatLng[]) => {
    const data: CreatePolygonData = {
      name: "",
      address: "",
      type: "",
      coordinates: latlngs,
    };
    try {
      const response = await createPolygon(data);
      const polygonData: UpdatePolygonData = {
        ...response,
        id: response.id.toString(), // Convert id number to string
      };
      console.log('Polygon created:', polygonData);
      return polygonData;
    } catch (error) {
      console.error('Error creating polygon:', error);
      setError('Failed to create polygon');
      return;
    }
  };
  

  const handleDeletePolygon = async (polygonID: number) => {
    try {
      await deletePolygon(polygonID); // Delete has no response body/payload
      console.log("Polygon Deleted:", polygonID);
    } catch (error) {
      console.error("Error deleting polygon:", error);
    }
  };

  const handleSearch = async (mapAddress: string) => {
    try {
      const { lat, lon } = await geocodeAddress(mapAddress);
      if (mapRef.current) {
        // mapRef.current.setView([lat, lon], 19);
        mapRef.current.flyTo([lat, lon], 18, {
          animate: true,
          duration: 1 // Duration of the fly-to animation in seconds
        });
      }
    } catch (error) {
      console.error('Error searching address:', error);
    }
  };

  const handleRecentre = async () => {
    try {
      if (mapRef.current) {
        // mapRef.current.setView([lat, lon], 19);
        mapRef.current.flyTo([default_coordinates.lat, default_coordinates.lng], DEFAULT_ZOOM, {
          animate: true,
          duration: 0 // Duration of the fly-to animation in seconds
        });
      }
    } catch (error) {
      console.error('Error recentering:', error);
    }
  };


  // ---------------------- Event-based functions ------------------------------
  // On creation of new polygon using drawing tool
  const _created = async (e: any) => {
    const latlngs = e.layer.getLatLngs()[0];
    const leafletID = e.layer._leaflet_id.toString();
    setPopupPosition(latlngs[0]);
    setCurrentPolygonLeafletId(leafletID); // Set current polygon leafletID
    setShowPopup(true); // Show the popup when a polygon is created
    // Reset form fields
    setName("");
    setAddress("");
    setType("");

    const result = await handleCreatePolygon(latlngs);

    const newPolygon: PolygonData = {
      id: result?.id ?? "", // ID generated in the database is in the response payload
      leafletID,
      name: "",
      address: "",
      type: "",
      coordinates: latlngs,
    };
    setPolygons(prevPolygons => [...prevPolygons, newPolygon]); // Add new polygon to polygons
    e.layer.remove() // Remove drawn layer from overlapping layer
  };

  // On addition of new polygon to polygons list, Initialise polygon's leafletID
  const _initialise = (e: any, polygon: PolygonData) => {
    if (!e || !polygon) {
      console.error("Invalid event or polygon data:", { e, polygon });
    }
    const leafletID = e.target?._leaflet_id?.toString();
    if (!leafletID) {
      console.error("Invalid layer or layer leafletID:", e);
    }
    // Initialise the newly created polygon object with the correct leafletID
    setPolygons(prevPolygons =>
      prevPolygons.map(p => {
        // Update leafletID if the polygon id matches current polygon
        if (p.id === polygon.id) {
          // Set currentPolygonLeafletId if p.id matches currentPolygonLeafletId
          // This is for the case where a polygon is assigned a new leaflet_id. 
          // Update the currentPolygonLeafletId with the new leaflet id of the polygon
          if (p.leafletID === currentPolygonLeafletId) {
            setCurrentPolygonLeafletId(leafletID);
          }
          return { ...p, leafletID };
        } else {
          return p;
        }
      })
    );
  };


  const _deleted = (e: any) => {
    const deletedLeafletIds = e.layers.getLayers().map((layer: any) => layer._leaflet_id); // Get the ids of deleted layers
    // if (deletedLeafletIds.length === polygons.length) {
    setPendingDeletion(deletedLeafletIds);
    setIsDialogOpen(true);

  };


  const proceedWithDeletion = (deletedLeafletIds: number[]) => {
    setPolygons((prevPolygons) => {
      const updatedPolygons = prevPolygons.filter((polygon) => {
        if (deletedLeafletIds.includes(parseInt(polygon.leafletID))) {
          handleDeletePolygon(parseInt(polygon.id));
          return false; // Exclude this polygon from the updatedPolygons array
        }
        return true; // Include this polygon in the updatedPolygons array
      });
      return updatedPolygons;
    });
    toast({
      description: "Deleted successfully",
      duration: 2000,
    });
  };

  const handleConfirmDelete = () => {
    proceedWithDeletion(pendingDeletion);
    setIsDialogOpen(false);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    window.location.reload();
  };
  
  // On editing of polygons using drawing control tool
  const _edited = (e: any) => {
    const layers = e.layers._layers;
    // For each layer edited
    for (const id in layers) {
      if (layers.hasOwnProperty(id)) {
        const layer = layers[id];
        if (layer instanceof L.Polygon) {
          updatePolygonCoordinates(layer);
        }
      }
    }
    toast({
      description: "Changes saved successfully",
      duration:2000,
    })
  };

  // Update polygon with new coordinates in the polygons list
  const updatePolygonCoordinates = (layer: L.Polygon) => {
    const updatedLeafletID = (layer as any)._leaflet_id.toString(); // Using any as L.Polygon type does not officially define _leaflet_id as a property
    const newCoordinates = layer.getLatLngs() as L.LatLng[][]; // Explicitly typing as LatLng[][]
    setPolygons((prevPolygons) => {
      const updatedPolygons = prevPolygons.map((polygon) => {
        if (polygon.leafletID === updatedLeafletID) {
          // const coordinates = newCoordinates[0]
          handleUpdatePolygon({...polygon, coordinates: newCoordinates[0]})
          console.log(`Updating Polygon with ID: ${polygon.leafletID}`);
          return {
            ...polygon,
            coordinates: newCoordinates[0], 
          };
        } else {
          return polygon;
        }
      });
      return updatedPolygons;
    });
  };

  const openPopupForPolygon = (polygon: PolygonData) => {
    setCurrentPolygonLeafletId(polygon.leafletID);
    // Prefill form fields
    setName(polygon.name);
    setAddress(polygon.address);
    setType(polygon.type);
  };

  const getPolygonCenter = (polygon: PolygonData) => {
    const latlngs = polygon.coordinates;
    const bounds = L.latLngBounds(latlngs);
    return bounds.getCenter();
  };


  const createCustomClusterIcon = (cluster: any) => {
    const childCount = cluster.getChildCount();
    let c = ' marker-cluster-';
    if (childCount < 10) {
      c += 'small';
    } else if (childCount < 100) {
      c += 'medium';
    } else {
      c += 'large';
    }
  
    return new L.DivIcon({
      html: `<div><span>${childCount}</span></div>`,
      // className: 'marker-cluster' + c,
      className: 'marker-cluster',
      iconSize: new L.Point(40, 40),
    });
  };

  const getColourFromStatus = (status: StatusEnum): string => {
    return StatusColors[status] || '#000000'; // Fallback color if status is unknown
  };

  const memoizedMarkers = useMemo(() => {
    return (
      <MarkerClusterGroup 
        chunkedLoading
        // iconCreateFunction={createCustomClusterIcon}
      >
        {polygons.map(polygon => {
          const center = getPolygonCenter(polygon);
            return ( 
              <Marker key={polygon.id} position={center} riseOnHover={true}>
                <Tooltip 
                  direction="bottom" 
                  offset={[-16, 27]} 
                  opacity={1}
                  position={center}
                  
                >
                  <div>
                    <div><strong>Name:</strong> {polygon?.name}</div>
                    <div><strong>Address:</strong> {polygon?.address}</div>
                    <div><strong>Type:</strong> {polygon?.type}</div>
                    <div>
                      <strong>Latest Status: </strong> 
                      <span style={{ color: getColourFromStatus(polygon.latest_status ?? StatusEnum.Clear) }}>
                        {polygon?.latest_status}
                      </span>
                    </div>
                  </div>
                </Tooltip>
              </Marker>
            )
          })
        }
      </MarkerClusterGroup>
    )
  }, [polygons]);

  const changeMap = () => {
    const nextIndex = (currentIndex + 1) % mapUrls.length;
    setCurrentIndex(nextIndex);
    setMapUrl(mapUrls[nextIndex]);
  }

  


  if (loading) {
    return <div/>
  }
  
  
  return (
    <div>
      {error && <ErrorMessage message={error} />}
      {/* Map component */}
      <div className="h-screen z-0">
        <div className="fixed top-3 right-96 z-40 mr-24 mt-3 flex gap-2">
          <Button 
            variant={"default"}
            
            className="w-full rounded-2xl h-8 text-sm shadow-2xl outline-none bg-[hsl(240,5.9%,10%)] text-[hsl(0,0%,98%)] hover:bg-[hsl(240,5.9%,9%)]"
            onClick={() => setShowHeatMap(!showHeatMap)}
          >
            <BarChart className="mr-1" size={18}/>
            {showHeatMap ? "Hide" : "Show"} Heat
             
          </Button>
          <Button 
            variant={"default"}
            
            className="w-full rounded-2xl h-8 text-sm shadow-2xl outline-none bg-[hsl(240,5.9%,10%)] text-[hsl(0,0%,98%)] hover:bg-[hsl(240,5.9%,9%)]"
            onClick={() => setShowMarkers(!showMarkers)}
          >
            <IoLocationOutline className="mr-1" size={18}/>
            {showMarkers ? "Hide" : "Show"} Marker
             
          </Button>

          <Button 
            variant={"default"}
            className="w-full rounded-2xl h-8 text-sm shadow-2xl outline-none bg-[hsl(240,5.9%,10%)] text-[hsl(0,0%,98%)] hover:bg-[hsl(240,5.9%,9%)]"
            onClick={changeMap}
          >
            <IoMap className="mr-1" size={18}/>
            Change Map 
          </Button>
        </div>

        <ConfirmationDialog
          isOpen={isDialogOpen}
          onClose={handleCloseDialog}
          onConfirm={handleConfirmDelete}
          title='Deletion'
          description="Are you sure you want to delete these item(s)? This action is permanent and cannot be undone."
        />
        
        {/* <SearchBar/> */}
        <SearchBar onSearch={e => handleSearch(e)} recentre={handleRecentre}/>

        <MapContainer 
          center={default_coordinates} 
          zoom={DEFAULT_ZOOM} 
          className="h-full w-full z-0"
          ref={mapRef}
          attributionControl={false}
          zoomControl={false}
        > 
          {showHeatMap && (
            <HeatMapProvider>
              <div>
                <HeatMapLegend />
                <HeatLayer />
              </div>
          </HeatMapProvider>
          )}
          {showMarkers && memoizedMarkers}
          <ZoomControl position="topright"/>
          <TileLayer
            url={mapUrl} // Use current map URL based on index
            detectRetina={true}
            minZoom={9}
            maxZoom={23}
            maxNativeZoom={18}
          />
          <TileLayer
            url={mapUrl} // Use current map URL based on index
            detectRetina={true}
            minZoom={9}
            maxZoom={23}
            maxNativeZoom={18}
          />
          <FeatureGroup>
            <EditControl
              position='topright'
              onCreated={_created}
              onDeleted={_deleted}
              onEdited={_edited}
              onDrawStart={closePopup}
              onEditStart={closePopup}
              onDeleteStart={closePopup}
              draw={{
                polyline: false,
                circlemarker: false,
                rectangle: false,
                circle: false,
                marker: false,
              }}
              edit={{
                remove: true
              }}
            />
            {polygons.map((polygon) => (
              <Polygon 
                key={polygon.id} 
                positions={polygon.coordinates}
                ref={(el) => { 
                  if (el && polygon.leafletID === currentPolygonLeafletId) { 
                    polygonRef.current = el;
                  } 
                }} 
                pathOptions={{ 
                  color: getColourFromStatus(polygon.latest_status ?? StatusEnum.Clear),
                  fill: true,
                }}
                eventHandlers={{
                  click: () => {
                    openPopupForPolygon(polygon);
                    
                  },
                  add: (e) => {
                    _initialise(e, polygon);
                  }, 
                  popupopen: () => {
                    setTooltipOpened(false); // Close tooltip when popup opens
                  },
                  popupclose: () => {
                    setTooltipOpened(true);
                  }
                }}
              >
                {typeof tooltipOpened === 'boolean' && tooltipOpened && (
                  // Render custom Tooltip when tooltipOpened is true
                  <Tooltip 
                    direction="bottom" 
                    offset={[0, 20]} 
                    opacity={1}
                  >
                    <div>
                      <div><strong>Name:</strong> {polygon?.name}</div>
                      <div><strong>Address:</strong> {polygon?.address}</div>
                      <div><strong>Type:</strong> {polygon?.type}</div>
                      <div>
                        <strong>Latest Status: </strong> 
                        <span style={{ color: getColourFromStatus(polygon.latest_status ?? StatusEnum.Clear) }}>
                          {polygon?.latest_status}
                        </span>
                      </div>
                    </div>
                  </Tooltip>
                )}

                <Popup 
                  ref={(el) => { 
                    if (el && polygon.leafletID === currentPolygonLeafletId) { 
                      popupElRef.current = el;
                    } 
                  }} 
                  closeButton={false}
                  closeOnEscapeKey={true}
                >
                  <div 
                    className="flex flex-col space-y-4"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleEdit(polygon.leafletID); // Call handleEdit when Computer's Enter button is pressed
                      }
                    }}
                    tabIndex={0} // Ensure the div is focusable to capture key events
                  >
                    <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="p-2 border border-gray-300 rounded-md bg-white"/>
                    <input type="text" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} className="p-2 border border-gray-300 rounded-md bg-white"/>
                    <input type="text" placeholder="Type" value={type} onChange={(e) => setType(e.target.value)} className="p-2 border border-gray-300 rounded-md bg-white"/>
                    <button onClick={() => handleEdit(polygon.leafletID)} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Save Changes</button>
                  </div>
                </Popup>
              </Polygon>
            ))}
          </FeatureGroup>
          {showPopup && (
            <Popup position={popupPosition} closeButton={false}>
              <div 
                className="flex flex-col space-y-4"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSave(); // Call handleSave when Enter is pressed
                  }
                }}
                tabIndex={0} // Ensure the div is focusable to capture key events
              >
                <input type="text" placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className="p-2 border border-gray-300 rounded-md bg-white" />
                <input type="text" placeholder="Address" value={address} onChange={(e) => setAddress(e.target.value)} className="p-2 border border-gray-300 rounded-md bg-white" />
                <input type="text" placeholder="Type" value={type} onChange={(e) => setType(e.target.value)} className="p-2 border border-gray-300 rounded-md bg-white" />
                <button onClick={handleSave} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600">Save</button>
              </div>
            </Popup>
          )}
          <Attribution/>
          
        </MapContainer>
      </div>
      <Toaster />
      
    </div>
  );
};

export default Map;