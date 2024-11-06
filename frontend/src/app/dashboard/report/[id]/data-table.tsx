'use client'

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
} from "@tanstack/react-table"

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import React, { useState } from 'react';
import UploadDrawer from '@/components/custom_app_components/UploadDrawer';
import Loading from '../../../../components/custom_app_components/Loading'
// import { generateReport } from '@/app/services/api'
import DownloadReportButton from '@/components/custom_app_components/DownloadReportButton'
// import { Download } from "lucide-react";


interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[]
  data: TData[]
  loading: boolean;
  id: number;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  loading,
  id,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([])
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>({})
  const [rowSelection, setRowSelection] = React.useState({})
  const [globalFilter, setGlobalFilter] = useState<string>("")
  const [isDownloading, setIsDownloading] = useState(false);

  const table = useReactTable({
    data,
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
  })

  const handleDownloadPDF = async () => {
    setIsDownloading(true)
    try {
      const { generateReport } = await import('@/app/services/api');
      await generateReport(id);
    } catch (error) {
      console.error('Failed to generate and download report:', error);
      // Optionally, show a user-friendly error message here
      alert('An error occurred while downloading the report. Please try again later.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div>
      {/* Search bar */}
      <div className="flex items-center justify-between py-4">
        <Input
          placeholder="Search..."
          value={globalFilter}
          onChange={(event) => setGlobalFilter(event.target.value)}
          className="max-w-sm"
        />
        <DownloadReportButton onClick={handleDownloadPDF} isLoading={isDownloading} />
      </div>

      {/* Actual table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader className="ml-10">
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
                  )
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24">
                  <Loading />
                </TableCell>
              </TableRow >
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className="cursor-pointer hover:bg-secondary "
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
  )
}
