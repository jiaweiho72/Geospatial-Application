"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreHorizontal } from "lucide-react"

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
import { DialogTitle } from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { ReportData } from "@/app/types";
import Zoom from 'react-medium-image-zoom'
import 'react-medium-image-zoom/dist/styles.css';
import { Controlled as ControlledZoom } from 'react-medium-image-zoom'
import React, { useCallback, useState } from 'react'

// Define the structure of your data
// export type ReportData = {
//   id: number;
//   created_at: string;
//   label: string,
//   location: string,
//   filename: string;
//   annotated_url: string;
// };



export const columns: ColumnDef<ReportData>[] = [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        className="ml-4"
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
      />
    ),
    cell: ({ row }) => (
      <div 
        // className="border border-white" 
        onClick={(e) => {
          e.stopPropagation(); // Prevents the row onClick from firing
        }}
      > 
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="my-4 ml-4"
          onClick={(e) => {
            e.stopPropagation(); // Prevents the row onClick from firing
          }}
        />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "annotated_url",
    header: "Drone Map",
    cell: ({ row }) => {
      const annotated_url = row.getValue("annotated_url") as string | null;
      if (!annotated_url) {
        return (
          <div className="w-20 h-20 flex items-center justify-center bg-gray-200 rounded-lg">
            <span className="text-sm text-gray-500">No Image</span>
          </div>
        );
      }

      // const [isZoomed, setIsZoomed] = useState(false)
      // const handleZoomChange = useCallback((shouldZoom) => {
      //   if (!shouldZoom) {
      //     // Prevent the row's onClick from being triggered when the zoom closes
      //     const handleOutsideClick = (e: MouseEvent) => {
      //       e.stopPropagation(); // Stop the click event from propagating to the row
      //       document.removeEventListener("click", handleOutsideClick, true); // Clean up the listener
      //     };
          
      //     // Apply click listener to stop propagation when zoom closes
      //     document.addEventListener("click", handleOutsideClick, true);
      //   }
      
      //   // Set zoom state
      //   setIsZoomed(shouldZoom);
      // }, []);

      return (
        
        <Dialog
          onOpenChange={(isOpen) => {
            if (!isOpen) {
              // Prevent the row's onClick from being triggered when the dialog closes
              const handleOutsideClick = (e: MouseEvent) => {
                e.stopPropagation();
                document.removeEventListener("click", handleOutsideClick, true);
              };
              document.addEventListener("click", handleOutsideClick, true);
            }
          }}
        >
          <DialogTrigger asChild>
            <div
              className="w-20 h-20 relative cursor-pointer my-1"
              onClick={(e) => e.stopPropagation()} // Prevents clicks on the image from affecting the row
            >
              <Image
                src={annotated_url}
                alt={"Thumbnail"}
                fill
                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                className="rounded-lg object-cover"
              />
            </div>
          </DialogTrigger>
          <DialogContent
            className="z-50 flex items-center justify-center p-0 m-0 overflow-hidden border-none bg-black bg-opacity-75"
            onClick={(e) => e.stopPropagation()} // Prevents clicks on the dialog content from affecting the row
          >
            <DialogTitle></DialogTitle>
            <div
              className="relative w-full h-full max-w-full max-h-full flex items-center justify-center"
            >
              <Image
                src={annotated_url}
                alt={"Full Image"}
                layout="intrinsic"
                width={800}
                height={600}
                className="object-contain"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          </DialogContent>
        </Dialog>
        // <ControlledZoom
        //     isZoomed={isZoomed}
        //     onZoomChange={handleZoomChange}
        // >
        //   <div
        //     className="w-20 h-20 relative cursor-pointer my-1"
        //     onClick={(e) => e.stopPropagation()} // Prevents clicks on the image from affecting the row
        //   >
        //     <img
        //       src={annotated_url}
        //       alt="Thumbnail"
        //       className="rounded-lg w-full h-full object-cover"
        //       onClick={(e) => e.stopPropagation()}
        //     />
        //   </div>
        // </ControlledZoom>
      );
    },
  },  
  
  {
    accessorKey: "label",
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-9 pr-4 py-2 hover:text-accent-foreground inline-flex items-center justify-start whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        Label
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </button>
    ),
  },
  {
    accessorKey: "location",
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-9 pr-4 py-2 hover:text-accent-foreground inline-flex items-center justify-start whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        Location
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </button>
    ),
  },
  {
    accessorKey: "filename",
    header: ({ column }) => (
      <button
        onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
        className="h-9 pr-4 py-2 hover:text-accent-foreground inline-flex items-center justify-start whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
      >
        Filename
        <ArrowUpDown className="ml-2 h-4 w-4" />
      </button>
    ),
  },
  
  {
    accessorKey: "created_at",
    header: ({ column }) => (
      <div className="text-right">
        <button
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="h-9 pl-4 py-2 hover:text-accent-foreground inline-flex items-center justify-end whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
        >
          Created At
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </button>
      </div>
    ),
    cell: ({ row }) => {
      // Retrieve the date from the row data
      const createdAt = new Date(row.getValue("created_at"));
    
      // Format the date and time in Singapore time zone
      const options: Intl.DateTimeFormatOptions = {
        day: "numeric",
        month: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        timeZone: "Asia/Singapore", // Singapore time zone
        timeZoneName: "short" // Optional: shows time zone abbreviation (e.g., GMT+8)
      };
      
      // Format the date and time
      const formattedDateTime = createdAt.toLocaleDateString("en-SG", options);
    
      return <div className="text-right">{formattedDateTime}</div>;
    },
    
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const payment = row.original
      const router = useRouter();
      const handleNavigation = (row: any) => {
        router.push(`report/${row.id}`);
      };
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleNavigation} className="hover:cursor-pointer">View report</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
];
