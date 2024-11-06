'use client'

import { useState, useEffect, useCallback } from 'react';
import { DataTable } from './data-table';
import { columns } from './columns';
import { ReportData } from '@/app/types';
import { ContentLayout } from '@/components/admin-panel/content-layout';
import DynamicBreadcrumb from "@/components/custom_app_components/DynamicBreadcrumb";
import Loading from '@/components/custom_app_components/Loading'


export default function ReportPage() {
  const [data, setData] = useState<ReportData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [processingSuccess, setProcessingSuccess] = useState<boolean>(false);

  const cacheKey = 'reportData';

  const fetchData = async () => {
    try {
      const { getReports } = await import('@/app/services/server-api');
      const fetchedData = await getReports({
        sort_by: 'created_at',
        sort_order: 'desc',
      });
      setData(fetchedData as ReportData[]);
    } catch (err) {
      console.error('Failed to load reports from database', err);
      setError('Failed to load reports from database');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // revalidate();
    console.log("revalidating after upload")
  }, [processingSuccess]);

  // Memoize the onProcessingSuccess function using useCallback
  const onProcessingSuccess = useCallback(() => {
    setProcessingSuccess((prev) => !prev);
  }, []);

  const handleCacheUpdate = useCallback((updatedData: ReportData[]) => {
    // setData(updatedData);
    // localStorage.setItem(cacheKey, JSON.stringify(updatedData)); // Update the cache
  }, []);


  if (error) {
    return <div>{error}</div>;
  }

  return (
    <ContentLayout title="Report">
      <DynamicBreadcrumb />
      <div className="container mx-auto py-10">
        {loading ? (
          // This is what will be displayed while loading
          <div className="flex justify-center items-center h-full" />
        ) : (
          // This is what will be displayed once loading is complete
          <DataTable 
            columns={columns} 
            data={data} 
            loading={loading}
            onProcessingSuccess={onProcessingSuccess}
            onCacheUpdate={handleCacheUpdate} // Pass the cache update function
          />
        )}
      </div>
    </ContentLayout>
  );
}
