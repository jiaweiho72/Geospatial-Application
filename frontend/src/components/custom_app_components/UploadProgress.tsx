import React, { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import Image from 'next/image';
import { Separator } from '@/components/ui/separator';

interface UploadProgressProps {
  isUploading: boolean;
  uploadProgress: number;
  processing: boolean;
  processingProgress: number; // Changed type to number
  uploadSuccess: boolean | null;
  errorMessage: string | null;
  imageData: any;
  processingSuccess: boolean | null;
}

enum ProcessingStatus {
  STARTED = 0,
  EXTRACTION_COMPLETE = 25,
  ANNOTATION_COMPLETE = 50,
  CROPPING_COMPLETE = 75,
  COMPLETE = 100,
  ERROR = -1,
}

const statusMessages: Record<number, string> = {
  [ProcessingStatus.STARTED]: 'Processing started. Extracting TIFF information...',
  [ProcessingStatus.EXTRACTION_COMPLETE]: 'Extraction complete. Annotating Fire Access Ways...',
  [ProcessingStatus.ANNOTATION_COMPLETE]: 'Annotation drawn. Starting polygon cropping...',
  [ProcessingStatus.CROPPING_COMPLETE]: 'Analysis complete. Finishing up...',
  [ProcessingStatus.COMPLETE]: 'Processing complete!',
  [ProcessingStatus.ERROR]: 'An error occurred.',
};

export default function UploadProgress({
  isUploading,
  uploadProgress,
  processing,
  processingProgress,
  uploadSuccess,
  errorMessage,
  imageData,
  processingSuccess,
}: UploadProgressProps) {
  const [statusMessage, setStatusMessage] = useState<string>(statusMessages[ProcessingStatus.STARTED]);

  // Update status message based on processingProgress
  useEffect(() => {
    if (processingProgress > ProcessingStatus.ANNOTATION_COMPLETE && processingProgress < ProcessingStatus.CROPPING_COMPLETE) {
      // For progress between 50 and 75, show dynamic message
      const progressDuringCropping = ((processingProgress - ProcessingStatus.ANNOTATION_COMPLETE) / (ProcessingStatus.CROPPING_COMPLETE - ProcessingStatus.ANNOTATION_COMPLETE)) * 100;
      setStatusMessage(`Analysing Fire Access Ways... ${progressDuringCropping.toFixed(0)}% complete`);
    } else if (statusMessages[processingProgress]) {
      setStatusMessage(statusMessages[processingProgress]);
    } else {
      setStatusMessage(`Processing... ${processingProgress}% complete`);
    }
  }, [processingProgress]);

  return (
    <div className="m-4 p-8 bg-card text-card-foreground shadow-lg rounded-lg w-full max-w-xl mx-auto flex flex-col justify-center items-center space-y-6">
      {isUploading && (
        <div className="w-full text-center">
          {/* <Loader2 className="mx-auto animate-spin text-muted-foreground" size={32} /> */}
          <p className="text-muted-foreground mt-4">Step 1/2: Upload</p>
          <Progress value={uploadProgress} className="w-full mt-4" />
          <p 
            className="mt-4 bg-gradient-to-r from-gray-500 via-gray-200 to-gray-500 bg-[length:150%_150%] bg-clip-text text-transparent animate-gradient-text-slow"
          >
            {`Uploading drone image... ${uploadProgress.toFixed(0)}% complete`}
          </p>
        </div>
      )}

      {processing && (
        <div className="w-full text-center">
          {/* <Loader2 className="mx-auto animate-spin text-muted-foreground" size={32} /> */}
          <p 
            className="text-muted-foreground mt-4"
          >
            Step 2/2: Processing
          </p>
          <Progress value={processingProgress} className="w-full mt-4 bg-muted" />
          <p 
            // className="text-muted-foreground mt-4"
            className="mt-4 bg-gradient-to-r from-gray-500 via-gray-200 to-gray-500 bg-[length:150%_150%] bg-clip-text text-transparent animate-gradient-text-slow"
            // className="mt-4 bg-gradient-to-br from-gray-500 via-gray-200 to-gray-500 bg-[length:200%_200%] bg-clip-text text-transparent animate-diagonal-gradient-text"

          >
            {statusMessage}
          </p>
        </div>
      )}

      {uploadSuccess && processingSuccess && (
        <div className="text-center">
          <CheckCircle className="mx-auto text-green-600" size={40} />
          <p className="mt-6 text-green-600 text-lg font-semibold">File uploaded and processed successfully!</p>
        </div>
      )}

      {(uploadSuccess === false || processingSuccess === false) && errorMessage && (
        <div className="text-center">
          <XCircle className="mx-auto text-destructive" size={40} />
          <p className="mt-6 text-destructive text-lg font-semibold">Error: {errorMessage}</p>
        </div>
      )}

      {/* Uncomment to show the processed image */}
      {/* {imageData && (
        <div className="mt-6 w-full text-center">
          <h3 className="text-lg font-semibold mb-4">Processed Image</h3>
          <div className="rounded-md overflow-hidden border border-border">
            <Image
              src={imageData.annotated_url}
              alt="Processed Image"
              layout="responsive"
              width={700}
              height={475}
              className="rounded-md"
            />
          </div>
        </div>
      )} */}

      <Separator className="mt-6 w-full" />
    </div>
  );
}
