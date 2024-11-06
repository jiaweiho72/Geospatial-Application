import dynamic from "next/dynamic";
import React from "react";
// import '../../globals.css';
import ExportButton from "@/components/custom_app_components/ExportButton";
import Map from "./Map"


const Page = () => {
  return (
    <div>
      <ExportButton/>
      <Map/>
    </div>
  );
};
export default Page;
