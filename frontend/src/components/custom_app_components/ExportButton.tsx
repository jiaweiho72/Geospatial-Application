'use client';

import { Button } from "@/components/ui/button";
import { DownloadIcon } from "@radix-ui/react-icons";
import { Loader } from "lucide-react";
import { useState } from "react";



const ExportButton: React.FC = () => {
  const [isExporting, setIsExporting] = useState(false);

  const onExport = async () => {
    setIsExporting(true)
    try {
      const { downloadCSV } = await import('@/app/services/api');
      downloadCSV();
    } catch (error) {
      console.error("Error downloading CSV:", error);
    } finally {
      setIsExporting(false);
    }
  };
  return (
    <div className="absolute bottom-5 right-5 z-50">
      <Button
        onClick={onExport}
        className="bg-[hsl(240,5.9%,10%)] text-[hsl(0,0%,98%)] shadow hover:bg-[hsl(240,5.9%,9%)] focus:outline-none focus:ring-2 focus:ring-blue-500"
        variant={undefined} // Ensuring variant does not override the className styles
      >
        {isExporting ? (
          <>
            <Loader className="mr-2 h-4 w-4 animate-spin" />
            Exporting
          </>
        ) : (
          <>
            <DownloadIcon className="mr-2 h-4 w-4" /> 
            Export Data
          </>
        )}
        
      </Button>
    </div>
  );
};

export default ExportButton;
