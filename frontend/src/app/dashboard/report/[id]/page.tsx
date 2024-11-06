'use client';

import React, { useState, useEffect, useRef } from "react";
import { ContentLayout } from '@/components/admin-panel/content-layout';
import DynamicBreadcrumb from "@/components/custom_app_components/DynamicBreadcrumb";
import { DataTable } from './data-table';
import { columns } from './columns';
import Image from 'next/image';
import Loading from '@/components/custom_app_components/Loading';
import { Dialog, DialogTrigger, DialogContent, DialogOverlay, DialogClose } from "@/components/ui/dialog"; // Adjust the import path based on your setup
import { DialogTitle } from "@radix-ui/react-dialog";
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import { ZoomIn } from "lucide-react";
import { ZoomableImage } from '@/components/custom_app_components/ZoomableImage';
import Zoom from 'react-medium-image-zoom'
import "react-medium-image-zoom/dist/styles.css";

// import 'react-medium-image-zoom/dist/styles.css'

interface ReportDetailsProps {
  params: { id: number };
}

const ReportDetails = ({ params }: ReportDetailsProps) => {
  const [image, setImage] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  // const contentRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLDivElement>(null);
  const [magnifierStyle, setMagnifierStyle] = useState({
    display: 'none',
    left: 0,
    top: 0,
    backgroundPosition: '0% 0%',
    backgroundSize: '200px 200px',  // Set initial size
  });

  useEffect(() => {
    const fetchImage = async () => {
      try {
        const { getFullImageById } = await import('@/app/services/server-api');
        const imageData = await getFullImageById(params.id);
        setImage(imageData);
      } catch (err) {
        setError('Failed to load image');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchImage();
  }, [params.id]);


  if (error) return <div>{error}</div>;

  return (
    <ContentLayout title="Report">
      <DynamicBreadcrumb />
      {loading ? (
        <div className="flex justify-center items-center h-full ">
          <Loading />
        </div>
      ) : (
        // <div ref={contentRef}>
        <div>
          <div 
            // className="flex justify-center w-full h-full mt-4"
            className="flex justify-center w-full h-full mt-4"

          >
            {image ? (
              <div
                ref={imageRef}
                // className="relative min-h-[30rem] min-w-[40rem] overflow-hidden"
                // className="relative overflow-hidden"
                className="flex justify-center w-6/12 h-6/12 mt-4"
              >
                {image.annotated_url ? (
                  <div className="overflow-hidden my-1">
                    <Zoom>
                      <img
                        src={image.annotated_url}
                        alt={image.filename}
                        // layout="fill"
                        // objectFit="contain"
                        className="rounded-lg"
                      />
                    </Zoom>
                  </div>
                  
                  
                ) : (
                  <p className="text-red-500">No annotated image available</p>
                )}
                <div
                  className="absolute w-[150px] h-[150px] rounded-full bg-white border-2 border-gray-300 z-50"
                  style={{
                    ...magnifierStyle,
                    backgroundImage: `url(${image.annotated_url})`,
                  }}
                />
              </div>
            ) : (
              <div />
            )}
          </div>

          <div className="w-full p-6 overflow-auto">
            <DataTable 
              columns={columns} 
              data={image?.cropped_images || []} 
              id={image?.id}
              loading={loading}
            />
          </div>
        </div>
      )}
    </ContentLayout>
  );
};

export default ReportDetails;
