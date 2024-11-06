import { useState } from 'react';
import { ImageData } from '@/app/types';

// ---------------------- Original Method -----------------------
// export const useFileUpload = () => {
//   const [isUploading, setIsUploading] = useState(false);
//   const [uploadSuccess, setUploadSuccess] = useState<boolean | null>(null);
//   const [processing, setProcessing] = useState(false);
//   const [imageData, setImageData] = useState<ImageData | null>(null);
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);
//   const [uploadProgress, setUploadProgress] = useState<number>(0); // Dummy progress
//   const [processingProgress, setProcessingProgress] = useState<number>(0); // Dummy progress
//   const [processingId, setProcessingId] = useState<string | null>(null); // Store processing ID
//   const [processingSuccess, setProcessingSuccess] = useState(false);

//   const upload = async (file: File, label: string) => {
//     setIsUploading(true);
//     setUploadSuccess(null);
//     setProcessing(false);
//     setErrorMessage(null);
//     setUploadProgress(0);
//     setProcessingProgress(0);
//     setProcessingSuccess(false);

//     try {
//       const { uploadFile, processImage, getProcessingStatus } = await import('@/app/services/api');
      
//       // Upload the file
//       const response = await uploadFile(file, label);
//       console.log('File uploaded successfully:', response);

//       if (!response.id) {
//         throw new Error('Upload response does not contain an id');
//       }

//       setUploadSuccess(true);

//       // Start processing the image
//       setProcessing(true);
//       setProcessingId(response.id); // Store the processing ID

//       const updatedResponse = await processImage(response.id);

//       // Polling for processing status
//       const pollProcessingStatus = async () => {
//         const interval = setInterval(async () => {
//           try {
//             // const statusResponse = await fetch(`http://localhost:8000/images/processing-status/${response.id}`);
//             // const statusData = await statusResponse.json();
//             const statusData = await getProcessingStatus(response.id);

//             console.log(statusData.status);
//             setProcessingProgress(statusData.status);
      
//             if (statusData.status === 100) {
//               clearInterval(interval);
//               setProcessing(false);
//               setImageData(updatedResponse); 
//               setProcessingSuccess(true)
//               console.log('Processed image data:', updatedResponse);
//             } else if (statusData.status === -1) { // Catch the error status
//               clearInterval(interval);
//               setProcessing(false);
//               setErrorMessage('Error occurred during processing');
//               console.error('Processing error:', statusData); // Log the error
//             }
//           } catch (err) {
//             console.error('Error checking processing status:', err);
//             clearInterval(interval);
//             setErrorMessage('Error checking processing status');
//           }
//         }, 1000); // Check every second
//       };
      

//       // Start polling
//       pollProcessingStatus();

//     } catch (error) {
//       if (error instanceof Error) {
//         console.error(error.message);
//         setErrorMessage(error.message);
//       } else {
//         console.error('Unexpected error:', error);
//         setErrorMessage('Unexpected error occurred');
//       }
//       setUploadSuccess(false);
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   return { isUploading, uploadSuccess, processing, imageData, errorMessage, upload, uploadProgress, processingProgress, processingSuccess };
// };






// ------------------------ Chunk Method --------------------------
// export const useFileUpload = () => {
//   const [isUploading, setIsUploading] = useState(false);
//   const [uploadSuccess, setUploadSuccess] = useState<boolean | null>(null);
//   const [processing, setProcessing] = useState(false);
//   const [imageData, setImageData] = useState<ImageData | null>(null);
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);
//   const [uploadProgress, setUploadProgress] = useState<number>(0); // Dummy progress
//   const [processingProgress, setProcessingProgress] = useState<number>(0); // Dummy progress
//   const [processingId, setProcessingId] = useState<number | null>(null); // Store processing ID
//   const [processingSuccess, setProcessingSuccess] = useState(false);

//   const upload = async (file: File, label: string) => {
//     setIsUploading(true);
//     setUploadSuccess(null);
//     setProcessing(false);
//     setErrorMessage(null);
//     setUploadProgress(0);
//     setProcessingProgress(0);
//     setProcessingSuccess(false);
  
//     try {
//       const { uploadFileInChunks, processImage, getProcessingStatus } = await import('@/app/services/api');
  
//       // Upload the file in chunks and get the image data with the ID
//       // const imageData = await uploadFileInChunks(file, label);
//       const imageData = await uploadFileInChunks(file, label, (progress: number) => {
//         setUploadProgress(progress);  // Update progress as chunks are uploaded
//       });
      
//       setUploadProgress(100);
//       setUploadSuccess(true);
  
//       // Start processing the image
//       setProcessing(true);
//       setProcessingId(imageData.id);  // Store the processing ID
  
//       const updatedResponse = await processImage(imageData.id);
  
//       // Polling for processing status
//       const pollProcessingStatus = async () => {
//         const interval = setInterval(async () => {
//           try {
//             const statusData = await getProcessingStatus(imageData.id);
//             setProcessingProgress(statusData.status);
  
//             if (statusData.status === 100) {
//               clearInterval(interval);
//               setProcessing(false);
//               setImageData(updatedResponse);
//               setProcessingSuccess(true);
//               console.log('Processed image data:', updatedResponse);
//             } else if (statusData.status === -1) {
//               clearInterval(interval);
//               setProcessing(false);
//               setErrorMessage('Error occurred during processing');
//             }
//           } catch (err) {
//             clearInterval(interval);
//             setErrorMessage('Error checking processing status');
//           }
//         }, 1000);
//       };
  
//       // Start polling
//       pollProcessingStatus();
  
//     } catch (error) {
//       setUploadSuccess(false);
//       if (error instanceof Error) {
//         setErrorMessage(error.message);
//       } else {
//         setErrorMessage('Unexpected error occurred');
//       }
      
//     } finally {
//       setIsUploading(false);
//     }
//   };
  

//   return { isUploading, uploadSuccess, processing, imageData, errorMessage, upload, uploadProgress, processingProgress, processingSuccess };
// };





// ---------------- Frontend Presigned upload version --------------------
// export const useFileUpload = () => {
//   const [isUploading, setIsUploading] = useState(false);
//   const [uploadSuccess, setUploadSuccess] = useState<boolean | null>(null);
//   const [processing, setProcessing] = useState(false);
//   const [imageData, setImageData] = useState<ImageData | null>(null);
//   const [errorMessage, setErrorMessage] = useState<string | null>(null);
//   const [uploadProgress, setUploadProgress] = useState<number>(0);
//   const [processingProgress, setProcessingProgress] = useState<number>(0);
//   const [processingId, setProcessingId] = useState<string | null>(null);
//   const [processingSuccess, setProcessingSuccess] = useState(false);

//   const upload = async (file: File, label: string) => {
//     setIsUploading(true);
//     setUploadSuccess(null);
//     setProcessing(false);
//     setErrorMessage(null);
//     setUploadProgress(0);
//     setProcessingProgress(0);
//     setProcessingSuccess(false);

//     try {
//       const { getPresignedUrl, uploadFileToS3, notifyBackend, processImage, getProcessingStatus } = await import('@/app/services/api');
      
//       // 1. Get the presigned URL from the backend
//       const { presigned_url, s3_key } = await getPresignedUrl(label);

//       console.log(presigned_url)
      
//       // 2. Upload the file to S3 using the presigned URL
//       await uploadFileToS3(file, presigned_url);
//       setUploadSuccess(true);
      
//       // 3. Notify the backend about the successful S3 upload
//       const response = await notifyBackend(s3_key, label);

//       // Store the processing ID returned by the backend
//       setProcessingId(response.id);
      
//       // 4. Call the process-image endpoint to trigger background processing
//       await processImage(response.id);
//       setProcessing(true);

//       // Polling for processing status
//       const pollProcessingStatus = async () => {
//         const interval = setInterval(async () => {
//           try {
//             // Check the processing status via backend API
//             const statusData = await getProcessingStatus(response.id);

//             setProcessingProgress(statusData.status); // Update progress

//             if (statusData.status === 100) { // Processing complete
//               clearInterval(interval);
//               setProcessing(false);
//               setImageData(statusData);  // Assuming processed image data comes here
//               setProcessingSuccess(true);
//             } else if (statusData.status === -1) { // Error during processing
//               clearInterval(interval);
//               setProcessing(false);
//               setErrorMessage('Error occurred during processing');
//             }
//           } catch (err) {
//             console.error('Error checking processing status:', err);
//             clearInterval(interval);
//             setErrorMessage('Error checking processing status');
//           }
//         }, 1000); // Check every second
//       };

//       // Start polling
//       pollProcessingStatus();

//     } catch (error) {
//       if (error instanceof Error) {
//         console.error(error.message);
//         setErrorMessage(error.message);
//       } else {
//         console.error('Unexpected error:', error);
//         setErrorMessage('Unexpected error occurred');
//       }
//       setUploadSuccess(false);
//     } finally {
//       setIsUploading(false);
//     }
//   };

//   return {
//     isUploading,
//     uploadSuccess,
//     processing,
//     imageData,
//     errorMessage,
//     upload,
//     uploadProgress,
//     processingProgress,
//     processingSuccess,
//   };
// };


// const NEXT_PUBLIC_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL as string;
// // const NEXT_PUBLIC_API_BASE_URL = process.env.API_BASE_URL;

// console.log(NEXT_PUBLIC_API_BASE_URL)

// const wsBaseUrl = NEXT_PUBLIC_API_BASE_URL.replace(/^http/, 'ws');

// const IMAGES_URL = `${NEXT_PUBLIC_API_BASE_URL}/images`;


export const useFileUpload = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState<boolean | null>(null);
  const [processing, setProcessing] = useState(false);
  const [imageData, setImageData] = useState<ImageData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [processingProgress, setProcessingProgress] = useState<number>(0);
  const [processingSuccess, setProcessingSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState("Starting...");

  const upload = async (file: File, label: string) => {
    setIsUploading(true);
    setUploadSuccess(null);
    setProcessing(false);
    setErrorMessage(null);
    setUploadProgress(0);
    setProcessingProgress(0);
    setProcessingSuccess(false);

    try {
      const { uploadFileInChunks, processImage } = await import('@/app/services/api');

      // Upload file in chunks, update progress
      const imageData = await uploadFileInChunks(file, label, (progress: number) => {
        setUploadProgress(progress);
      });

      setUploadProgress(100);
      setUploadSuccess(true);

      // Start processing the image
      setProcessing(true);
      setImageData(imageData); // Store imageData to reference later
      await processImage(imageData.id);

      // WebSocket connection for processing updates
      const backendUrl = process.env.NEXT_PUBLIC_API_BASE_URL as string;
      const wsProtocol = backendUrl.startsWith('https') ? 'wss' : 'ws';
      const wsUrl = `${wsProtocol}://${backendUrl.replace(/^https?:\/\//, '').replace(/^http?:\/\//, '')}/images/ws/${imageData.id}`;
      const socket = new WebSocket(wsUrl);

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log("WebSocket Message Received in useFileUpload:", data);
        setProcessingProgress(data.progress);

        // Update status message based on progress
        if (data.progress > 50 && data.progress < 75) {
          const cropProgress = ((data.progress - 50) / 25) * 100;
          setStatusMessage(`Cropping polygons... ${cropProgress.toFixed(0)}% complete`);
        } else if (data.progress === 100) {
          setStatusMessage("Processing complete!");
          setProcessing(false);
          setProcessingSuccess(true);
          socket.close();
        } else if (data.progress === -1) {
          setStatusMessage("Error during processing");
          setErrorMessage("An error occurred during processing");
          setProcessing(false);
          socket.close();
        }
      };

      socket.onerror = (error) => {
        console.error("WebSocket error:", error);
        setErrorMessage("WebSocket error");
      };

      socket.onclose = () => {
        console.log("WebSocket connection closed");
      };
    } catch (error) {
      setUploadSuccess(false);
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage("Unexpected error occurred");
      }
    } finally {
      setIsUploading(false);
    }
  };

  return {
    isUploading,
    uploadSuccess,
    processing,
    imageData,
    errorMessage,
    upload,
    uploadProgress,
    processingProgress,
    processingSuccess,
    // statusMessage,
  };
};