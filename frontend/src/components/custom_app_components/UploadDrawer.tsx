'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Drawer, DrawerTrigger, DrawerContent, DrawerTitle,  } from '@/components/ui/drawer';
import { Progress } from '@/components/ui/progress';
import { BsCheckCircle, BsXCircle } from 'react-icons/bs';
import Uploader from '@/components/upload/uploader';
import { Upload } from 'lucide-react';
import Image from 'next/image';

enum ProcessingStatus {
  STARTED = 0,
  EXTRACTION_COMPLETE = 25,
  ANNOTATION_COMPLETE = 50,
  CROPPING_COMPLETE = 75,
  COMPLETE = 100,
  ERROR = -1,
}

interface UploadDrawerProps {
  onShowProgress: (show: boolean) => void;
  onCloseDrawer: () => void;
  upload: (file: File, label: string) => Promise<void>;
  isUploading: boolean;
  processing: boolean;
  processingProgress: ProcessingStatus;
  uploadProgress: number;
  uploadSuccess: boolean;
  errorMessage: string;
  imageData: any;
}

const statusMessages: Record<ProcessingStatus, string> = {
  [ProcessingStatus.STARTED]: "Processing started. Extracting tiff information ...",
  [ProcessingStatus.EXTRACTION_COMPLETE]: "Extraction complete. Annotating Fire Access Ways ...",
  [ProcessingStatus.ANNOTATION_COMPLETE]: "Annotation drawn. Cropping Fire Access Ways ...",
  [ProcessingStatus.CROPPING_COMPLETE]: "Cropping complete. Finishing up ...",
  [ProcessingStatus.COMPLETE]: "Processing complete!",
  [ProcessingStatus.ERROR]: "An error occurred.",
};

export default function UploadDrawer({
  onShowProgress,
  onCloseDrawer,
  upload,
  isUploading,
  processing,
  processingProgress,
  uploadProgress,
  uploadSuccess,
  errorMessage,
  imageData,
  // refreshTable, // Add this
}: UploadDrawerProps) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>(statusMessages[ProcessingStatus.STARTED]);

  useEffect(() => {
    setStatusMessage(statusMessages[processingProgress] || "Processing...");
  }, [processingProgress]);

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    // onShowProgress(); // Call this to show progress
  };

  return (
    <>
      <Drawer open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <DrawerTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            className="ml-auto hidden h-8 lg:flex"
            onClick={() => {
              setIsDrawerOpen(true);
            }}
          >
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
        </DrawerTrigger>
        <DrawerContent className="items-center">
          <DrawerTitle />
          <div className="p-6 w-1/2">
            <Uploader 
              onCloseDrawer={handleCloseDrawer} 
              upload={upload} 
              isUploading={isUploading} 
              processing={processing}
              onShowProgress={onShowProgress}
            />
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
