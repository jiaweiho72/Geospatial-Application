"use client";

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import * as React from "react";
import { DataTableViewOptions } from "./column_visibility";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import UploadDrawer from "@/components/custom_app_components/UploadDrawer";
import { useFileUpload } from "@/hooks/useFileUpload";
import UploadProgress from "@/components/custom_app_components/UploadProgress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogTrigger, DialogContent, DialogOverlay, DialogClose } from "@/components/ui/dialog"; // Adjust the import path based on your setup
import { ArrowUpDown, Trash } from "lucide-react";
import ConfirmationDialog from '../../../components/custom_app_components/ConfirmationDialog';
import { ReportData } from '@/app/types'
import { Loader } from 'lucide-react';
import Loading from '../../../components/custom_app_components/Loading'
import { revalidateTag } from "next/cache";
import { revalidate } from '@/app/actions'


interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  onProcessingSuccess: () => void;
  loading: boolean;
  onCacheUpdate: (updatedData: TData[]) => void;
}

export function DataTable<TData extends ReportData, TValue>({
  columns,
  data,
  onProcessingSuccess,
  loading,
  onCacheUpdate,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({});
  const [rowSelection, setRowSelection] = React.useState<Record<string, boolean>>({});
  const [globalFilter, setGlobalFilter] = useState<string>("");
  const [tableData, setTableData] = useState(data);
  const [deleting, setDeleting] = useState(false);

  // console.log(data)

  useEffect(() => {
    setTableData(data);
  }, [data]);

  
  const table = useReactTable({
    data: tableData,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onSortingChange: setSorting,
    getSortedRowModel: getSortedRowModel(),
    onColumnFiltersChange: setColumnFilters,
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter, // Add global filter to the state
    },
    // Define a global filter function
    globalFilterFn: (row, columnId) => {
      const value = row.getValue(columnId) as string;
      return value.toLowerCase().includes(globalFilter.toLowerCase());
    },
  });

  useEffect(() => {
    console.log("Row selection changed:", rowSelection);
  }, [rowSelection]);

  const router = useRouter();
  const handleNavigation = (row: any) => {
    router.push(`report/${row.id}`);
  };

  const [drawerOpen, setDrawerOpen] = useState(false);
  const openDrawer = () => setDrawerOpen(true);
  const closeDrawer = () => setDrawerOpen(false);
  const [showUploadProgress, setShowUploadProgress] = useState(false);
  const {
    isUploading,
    uploadSuccess,
    processing,
    imageData,
    errorMessage,
    uploadProgress,
    processingProgress,
    upload,
    processingSuccess,
  } = useFileUpload();

  // Handle the deletion of selected rows
  const handleDeleteSelected = async () => {
    setDeleting(true);
  
    // Directly map rowSelection to selected IDs
    const selectedIds = table.getSelectedRowModel().rows.map(row => row.original.id);
  
    console.log("Selected IDs for deletion:", selectedIds);
  
    if (selectedIds.length === 0) {
      setDeleting(false);
      return;
    }
  
    try {
      const { deleteImages } = await import('@/app/services/api');
      await deleteImages(selectedIds);
      fetchAndUpdateCache();
      // // Filter out deleted items based on selected IDs
      // const newData = data.filter((row) => !selectedIds.includes(row.id));
      // console.log("New data after deletion:", newData);
  
      // setTableData(newData);
      setRowSelection({});  // Clear the row selection
      // onCacheUpdate(newData);
      closeConfirmDialog();
    } catch (error) {
      console.error("Failed to delete images", error);
    } finally {
      setDeleting(false);
    }
  };
  

  
  

  // State for confirmation dialog
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const openConfirmDialog = () => setIsConfirmDialogOpen(true);
  const closeConfirmDialog = () => setIsConfirmDialogOpen(false);

  const handleConfirmDelete = () => {
    setIsConfirmDialogOpen(false);
    handleDeleteSelected();
    // revalidateTag('collection')
    revalidate()
  };

  const handleCloseDialog = () => {
    setIsConfirmDialogOpen(false);
  };

  const fetchAndUpdateCache = useCallback(async () => {
    try {
      const { getReports } = await import('@/app/services/server-api');
      const fetchedData = await getReports({
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      setTableData(fetchedData as TData[]);
      onCacheUpdate(fetchedData as TData[]); // Update cache and state
    } catch (error) {
      console.error('Failed to fetch data after processing success', error);
    }
  }, [onCacheUpdate]);

  useEffect(() => {
    if (processingSuccess) {
      fetchAndUpdateCache(); // Fetch the latest data and update the cache
      onProcessingSuccess(); // Notify the parent to re-fetch if necessary
      // revalidateTag('collection');
      revalidate()
    }
  }, [processingSuccess, fetchAndUpdateCache, onProcessingSuccess]);

  return (
    <div>
      <ConfirmationDialog
        isOpen={isConfirmDialogOpen}
        onClose={handleCloseDialog}
        onConfirm={handleConfirmDelete}
        title='Deletion'
        description="Are you sure you want to delete these item(s)? This action is permanent and cannot be undone."
      />
      {/* Upload progress container */}
      {showUploadProgress && (
        <UploadProgress
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          processing={processing}
          processingProgress={processingProgress}
          uploadSuccess={uploadSuccess}
          errorMessage={errorMessage}
          imageData={imageData}
          processingSuccess={processingSuccess}
        />
      )}

      {/* Search bar and delete button */}
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Search..."
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
        
        <div className="flex space-x-2 items-center">
          {Object.keys(rowSelection).some((key) => rowSelection[key]) && (
            <Button 
              variant="destructive" 
              onClick={openConfirmDialog}
              size="sm"
              className="ml-auto hidden h-8 lg:flex"
            >
              <Trash size={18}/>
            </Button>
          )}
{/* 
          <Select>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Theme" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="light">Light</SelectItem>
              <SelectItem value="dark">Dark</SelectItem>
              <SelectItem value="system">System</SelectItem>
            </SelectContent>
          </Select> */}

          <UploadDrawer
            onShowProgress={() => setShowUploadProgress(true)}
            onCloseDrawer={() => setDrawerOpen(false)}
            upload={upload}
            isUploading={isUploading}
            processing={processing}
            processingProgress={processingProgress}
            uploadProgress={0}
            uploadSuccess={false}
            errorMessage={""}
            imageData={undefined}
          />
        </div>
      </div>

      {/* Actual table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {/* Handle Loading of Table */}
            {loading || deleting ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24">
                 <Loading/>
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer hover:bg-secondary"
                  onClick={() => handleNavigation(row.original)}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center">
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Bottom pagination */}
      <div className="flex items-center justify-end space-x-2 py-4">
        <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
        >
          Previous
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
