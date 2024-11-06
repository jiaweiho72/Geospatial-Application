"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import Image from 'next/image';
import { Dialog, DialogTrigger, DialogContent, DialogOverlay, DialogClose } from "@/components/ui/dialog"; // Adjust the import path based on your setup
import { Badge } from "@/components/ui/badge"; // Import your badge component if using Shadcn or create a custom one
import 'react-medium-image-zoom/dist/styles.css';
import { DialogTitle } from "@radix-ui/react-dialog";
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
import { ZoomableImage } from '@/components/custom_app_components/ZoomableImage';
import Zoom from 'react-medium-image-zoom'

// Define the structure of your data
export type ReportDetailData = {
  id: string;
  // created_at: string;
  label: string,
  location: string,
  filename: string;
  url: string;
  data: Record<string, any>;
  polygon: Record<string, any>;
};

export const columns: ColumnDef<ReportDetailData>[] = [
  {
    accessorKey: "url",
    header: "Drone Map",
    cell: ({ row }) => {
      const url = row.getValue("url") as string;
      return (
        <div
          onClick={(e) => {
            e.stopPropagation(); // Prevents the row onClick from firing
          }}
        >
          {/* Thumbnail Image */}
          {/* <Dialog>
            <DialogTrigger asChild>
              <div className="overflow-hidden w-20 h-20 relative cursor-pointer my-1">
                <Image
                  src={url}
                  alt={"Thumbnail"}
                  fill
                  className="rounded-lg object-cover"
                />
              </div>
            </DialogTrigger>
  
            <DialogContent className="z-50 flex items-center justify-center p-0 m-0 overflow-hidden border-none bg-black bg-opacity-75">
              <DialogTitle></DialogTitle>
              <div className="h-screen w-screen">
                <Image
                  src={url}
                  alt={"Image Not Loaded"}
                  fill={true}
                  className="object-contain"
                />
              </div>
            </DialogContent>
          </Dialog> */}
          <Zoom>
            <div className="overflow-hidden w-20 h-20 relative cursor-pointer my-1">
              <img
                src={url}
                alt="Thumbnail"
                className="rounded-lg w-full h-full object-cover" // Use object-cover or object-contain based on preference
              />
            </div>
          </Zoom>
        </div>


      );
    },
  },
  // {
  //   accessorKey: "filename",
  //   header: ({ column }) => (
  //     <button
  //       // variant="ghost"
  //       onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
  //       // className="flex items-center justify-between space-x-2"
  //       className="h-9 pr-4 py-2 hover:text-accent-foreground inline-flex items-center justify-start whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
  //     >
  //       Filename
  //       <ArrowUpDown className="ml-2 h-4 w-4" />
  //     </button>
  //     // <Button
  //     //   variant="ghost"
  //     //   onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
  //     // >
  //     //   Filename
  //     //   <ArrowUpDown className="ml-2 h-4 w-4" />
  //     // </Button>
  //   ),
  // },
  {
    accessorFn: row => row.polygon.name,
    id: "name",
    header: "Premise",
    cell: ({ row }) => {
      const val = row.getValue("name") as string;
      return(
        <div>
          {val ? val : <span className="text-gray-500 italic">nil</span>}
        </div>
      )
    }
  },
  {
    accessorFn: row => row.polygon.address,
    id: "address",
    header: "Address",
    cell: ({ row }) => {
      const val = row.getValue("address") as string;
      return(
        <div>
          {val ? val : <span className="text-gray-500 italic">nil</span>}
        </div>
      )
    }
  },
  {
    accessorFn: row => row.polygon.type, 
    id: "type",
    header: "Type",
    cell: ({ row }) => {
      const val = row.getValue("type") as string;
      return(
        <div>
          {val ? val : <span className="text-gray-500 italic">nil</span>}
        </div>
      )
    }
  },
  {
    accessorFn: row => row.data?.label, 
    id: "label",
    header: "Label",
  },
  {
    accessorFn: row => row.data?.description, // Use accessorFn to extract nested data
    id: "description",
    header: "Description",
  },
  {
    accessorFn: row => row.data?.is_vehicle,
    id: "is_vehicle",
    // header: "Vehicle",
    header: ({ column }) => (
      <div className="text-center">
        Vehicle
      </div>
    ),
    cell: ({ row }) => {
      const bool = row.getValue("is_vehicle") as boolean;

      // Determine the badge variant based on the boolean value
      const badgeVariant = bool ? "red" : "green";

      return (
        <div className="text-center">
          <Badge
            variant={badgeVariant}
            // className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            className="capitalize"
          >
          {/* <Badge variant="outline" className="capitalize"> */}
            {bool ? "Present" : "Absent"}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorFn: row => row.data?.is_flammable,
    id: "is_flammable",
    header: ({ column }) => (
      <div className="text-center">
        Flammable
      </div>
    ),
    cell: ({ row }) => {
      const bool = row.getValue("is_flammable") as boolean;

      // Determine the badge variant based on the boolean value
      const badgeVariant = bool ? "red" : "green";

      return (
        <div className="text-center">
          <Badge
            variant={badgeVariant}
            // className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            className="capitalize"
          >
          {/* <Badge variant="outline" className="capitalize"> */}
            {bool ? "Yes" : "No"}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorFn: row => row.data?.is_permanent,
    id: "is_permanent",
    header: ({ column }) => (
      <div className="text-center">
        Permanent
      </div>
    ),
    cell: ({ row }) => {
      const bool = row.getValue("is_permanent") as boolean;

      // Determine the badge variant based on the boolean value
      const badgeVariant = bool ? "red" : "green";

      return (
        <div className="text-center">
          <Badge
            variant={badgeVariant}
            // className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            className="capitalize"
          >
          {/* <Badge variant="outline" className="capitalize"> */}
            {bool ? "Yes" : "No"}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorFn: row => row.data?.sufficient_clearance,
    id: "sufficient_clearance",
    header: ({ column }) => (
      <div className="text-center">
        Sufficient Clearance
      </div>
    ),
    cell: ({ row }) => {
      const bool = row.getValue("sufficient_clearance") as boolean;

      // Determine the badge variant based on the boolean value
      const badgeVariant = bool ? "green" : "red";

      return (
        <div className="text-center">
          <Badge
            variant={badgeVariant}
            // className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium"
            className="capitalize"
          >
          {/* <Badge variant="outline" className="capitalize"> */}
            {bool ? "Yes" : "No"}
          </Badge>
        </div>
      );
    },
  },
  
  {
    id: "actions",
    cell: ({ row }) => {
      const report = row.original;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              {/* <MoreHorizontal className="h-4 w-4" /> */}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => navigator.clipboard.writeText(report.id)}
            >
              Copy Report ID
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>View Report Details</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];