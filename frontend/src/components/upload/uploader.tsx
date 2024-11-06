'use client';

import { useCallback, ChangeEvent, useState } from 'react';
import toast from 'react-hot-toast';
// import LoadingDots from './loading-dots';
import { Ellipsis } from 'lucide-react';
import { File } from 'lucide-react'

interface UploaderProps {
  onCloseDrawer: () => void;
  upload: (file: File, label: string) => Promise<void>;
  isUploading: boolean;
  processing: boolean;
  onShowProgress: (show: boolean) => void;
}


export default function Uploader({ onCloseDrawer, upload, isUploading, processing, onShowProgress }: UploaderProps) {
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

  const onChangePicture = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files && event.currentTarget.files[0];
    if (file) {
      setFile(file);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (file) {
      try {
        onCloseDrawer();
        await upload(file, label);
        toast.success('File uploaded successfully');
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Error uploading file');
      }
    }
  };
  

  const saveDisabled = isUploading || processing || !file || !label;

  return (
    <form className="grid gap-6" onSubmit={handleSubmit}>
      <div className="space-y-1 mb-4">
        <h2 className="text-xl font-semibold">Upload a file</h2>
        <p className="text-sm text-gray-500">Accepted formats: .tif, .tiff</p>
      </div>

      <div>
        <label htmlFor="label" className="block text-sm font-medium text-foreground">
          Label
        </label>
        <input
          id="label"
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Enter label for the file"
          className="mt-1 p-2 border rounded w-full"
          required
        />
      </div>

      <label
        htmlFor="image-upload"
        className={`group relative mt-2 flex h-auto min-h-72 cursor-pointer flex-col items-center justify-center rounded-md border border-gray-300 bg-primary-foreground shadow-sm transition-all hover:bg-accent ${
          dragActive ? 'border-2 border-black' : ''
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(true);
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragActive(false);

          const file = e.dataTransfer.files && e.dataTransfer.files[0];
          if (file) {
            setFile(file);
          }
        }}
      >
        <input
          id="image-upload"
          name="image"
          type="file"
          accept=".tif,.tiff"
          className="sr-only"
          onChange={onChangePicture}
        />
        {!file && (
          <div
            className={`absolute z-[3] flex h-full w-full flex-col items-center justify-center rounded-md px-10 transition-all ${
              dragActive ? 'border-2 border-black' : ''
            }`}
          >
            <svg
              className={`h-7 w-7 text-gray-500 transition-all duration-75 group-hover:scale-110 group-active:scale-95 ${
                dragActive ? 'scale-110' : 'scale-100'
              }`}
              xmlns="http://www.w3.org/2000/svg"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
              <path d="M12 12v9"></path>
              <path d="m16 16-4-4-4 4"></path>
            </svg>
            <p className="mt-2 text-center text-sm text-gray-500">
              Drag and drop or click to upload.
            </p>
            <p className="mt-2 text-center text-sm text-gray-500">
              Max file size: None
            </p>
            <span className="sr-only">File upload</span>
          </div>
        )}
        {file && (
          <div className="flex items-center justify-center space-x-2 text-xl font-semibold">
            <File size={24} />
            <span>{file.name}</span>
          </div>
        )}
      </label>

      <div className="flex justify-end gap-4 mt-4">
      <button
        type="button"
        onClick={onCloseDrawer}
        className="flex h-10 px-4 items-center justify-center rounded-md border border-border bg-background text-foreground hover:bg-secondary hover:text-secondary-foreground focus:outline-none transition-colors"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={saveDisabled}
        className={`${
          saveDisabled
            ? 'cursor-not-allowed border-border bg-muted text-muted-foreground'
            : 'border-primary bg-primary text-primary-foreground hover:bg-primary-foreground hover:text-primary'
        } flex h-10 px-4 items-center justify-center rounded-md border text-sm transition-all focus:outline-none`}
        onClick={() => onShowProgress(true)}
      >
        {isUploading || processing ? (
          <Ellipsis />
        ) : (
          <p className="text-sm">Confirm upload</p>
        )}
      </button>

      </div>
    </form>
  );
}
