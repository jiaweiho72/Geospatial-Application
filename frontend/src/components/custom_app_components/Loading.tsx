import React from 'react';
import { ImSpinner8 } from "react-icons/im";
import { LoaderCircle, CircleEllipsis, Map } from 'lucide-react';


const Loading = () => {
  return (
    // <div className="flex items-center justify-center h-screen">
    //     <ImSpinner8 size={100} className="text-gray-500 text-lg animate-spin transition-colors duration-300"/>
    // </div>
    <div className="flex items-center justify-center h-full">
      <Map size={20} className="animate-bounce text-primary"/>
    </div>
  );
};

export default Loading;

