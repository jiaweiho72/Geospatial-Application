import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader } from "lucide-react";

interface DownloadReportButtonProps {
  onClick: () => void;
  isLoading: boolean;
}

const DownloadReportButton: React.FC<DownloadReportButtonProps> = ({ onClick, isLoading }) => {
  return (
    <Button 
      variant="outline"
      size="sm"
      className="ml-auto hidden h-8 lg:flex"
      onClick={onClick}
    >
      {isLoading ? (
        <>
          <Loader className="mr-2 h-4 w-4 animate-spin" />
          Preparing...
          
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4"/>
          Download
        </>
      )}
    </Button>
  );
};

export default DownloadReportButton;
