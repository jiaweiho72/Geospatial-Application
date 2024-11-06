'use client'

import React, { useEffect, useState } from "react";
import { ContentLayout } from '@/components/admin-panel/content-layout';
import DynamicBreadcrumb from "@/components/custom_app_components/DynamicBreadcrumb";
import { AreaGraph } from '@/components/charts/area-graph';
import { BarGraph } from '@/components/charts/bar-graph';
import { PieGraph } from '@/components/charts/pie-graph';
import { CalendarDateRangePicker } from '@/components/date-range-picker';
import PageContainer from '@/components/layout/page-container';
import { RecentSales } from '@/components/recent-sales';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CarFront, Construction, FileText, Flame } from "lucide-react";
import { MetricsData } from '../types';

export default function page() {
    const [metrics, setMetrics] = useState<MetricsData>({ 
        status_counts: {}, 
        total_polygon_count: 0,
        total_image_count: 0,
        total_cropped_images: 0,
        is_vehicle_count: 0,
        is_flammable_count: 0 
    })
    const [error, setError] = useState<string | null>(null); // State to store any errors
    const [loading, setLoading] = useState<boolean>(true);

    const totalPolygonCount = metrics.total_polygon_count ?? 0;
    const clearCount = totalPolygonCount - (metrics.status_counts?.clear ?? 0);
    const percentageClear = totalPolygonCount > 0 ? (clearCount / totalPolygonCount) * 100 : 0;
    const roundedPercentageClear = parseFloat(percentageClear.toFixed(1));

    const totalImageCount = metrics.total_image_count ?? 0;
    const totalCroppedCount = metrics.total_cropped_images ?? 0; // Use 0 as a default value
    const isVehicleCount = metrics.is_vehicle_count ?? 0; // Use 0 as a default value
    const isFlammableCount = metrics.is_flammable_count ?? 0; // Use 0 as a default value

    let roundedPercentageVehicle: number = 0;
    let roundedPercentageFlammable: number = 0;

    // Ensure totalCroppedCount is greater than zero to avoid division by zero
    if (totalCroppedCount > 0) {
        roundedPercentageVehicle = (isVehicleCount / totalCroppedCount) * 100;
        roundedPercentageFlammable = (isFlammableCount / totalCroppedCount) * 100;
    }

    roundedPercentageVehicle = parseFloat(roundedPercentageVehicle.toFixed(0));
    roundedPercentageFlammable = parseFloat(roundedPercentageFlammable.toFixed(0));

    
    

    useEffect(() => {
        // Function to fetch data
        const fetchMetrics = async () => {
          try {
            const { getMetrics } = await import('@/app/services/api');
            const data = await getMetrics(); // Adjust the endpoint as needed
            setMetrics(data); // Update state with the fetched data
          } catch (err) {
            if (err instanceof Error) {
                setError(err.message); // Update state with the error message
            } else {
                setError('An unknown error occurred'); // Handle other types of errors
            }
          } finally {
            setLoading(false);
          }
        }; 
    
        fetchMetrics(); // Call the fetch function when component mounts
    }, []);

    if (error) {
        return <div>Error: {error}</div>;
    }

    // if (!metrics) {
    //     return <div>Loading...</div>; // Optionally display a loading state
    // }

    return (
        <ContentLayout title="Dashboard">
            <DynamicBreadcrumb />
            {loading ? (
                // This is what will be displayed while loading
                <div className="flex justify-center items-center h-full">
                    {/* <Loading /> */}
                </div>
            ) : (
                // <PageContainer scrollable={true}>
                <PageContainer>
                    <div className="space-y-2">
                        <div className="flex items-center justify-between space-y-2">
                        <h2 className="text-2xl font-bold tracking-tight">
                            Hi, Welcome back 👋
                        </h2>
                        {/* <div className="hidden items-center space-x-2 md:flex">
                            <CalendarDateRangePicker />
                            <Button>Download</Button>
                        </div> */}
                        </div>
                        <Tabs defaultValue="overview" className="space-y-4">
                        <TabsList>
                            <TabsTrigger value="overview">Overview</TabsTrigger>
                            <TabsTrigger value="analytics" disabled>
                            Analytics
                            </TabsTrigger>
                        </TabsList>
                        <TabsContent value="overview" className="space-y-4">
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Current Status
                                </CardTitle>
                                <Construction className="mr-2 h-4 w-4 text-muted-foreground"/>
                                </CardHeader>
                                <CardContent>
                                <div className="text-2xl font-bold">
                                    {clearCount} / {totalPolygonCount}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {roundedPercentageClear}% of Fire Access Ways obstructed
                                </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Total Reports
                                </CardTitle>
                                <FileText className="mr-2 h-4 w-4 text-muted-foreground"/>
                                </CardHeader>
                                <CardContent>
                                <div className="text-2xl font-bold">
                                    {totalImageCount}
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {totalCroppedCount} observations in total
                                </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Is Vehicle
                                </CardTitle>
                                <CarFront className="mr-2 h-4 w-4 text-muted-foreground"/>
                                </CardHeader>
                                <CardContent>
                                <div className="text-2xl font-bold">
                                    {roundedPercentageVehicle}%
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {isVehicleCount} cases in total
                                </p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">
                                    Is Flammable
                                </CardTitle>
                                <Flame className="mr-2 h-4 w-4 text-muted-foreground"/>
                                </CardHeader>
                                <CardContent>
                                <div className="text-2xl font-bold">
                                    {roundedPercentageFlammable}%
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    {isFlammableCount} cases in total
                                </p>
                                </CardContent>
                            </Card>
                            </div>
                            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-7">
                                <div className="col-span-4">
                                    <BarGraph />
                                </div>
                                {/* <Card className="col-span-4 md:col-span-3">
                                    <CardHeader>
                                    <CardTitle>Recent Sales</CardTitle>
                                    <CardDescription>
                                        You made 265 sales this month.
                                    </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                    <RecentSales />
                                    </CardContent>
                                </Card>
                                <div className="col-span-4">
                                    <AreaGraph />
                                </div> */}
                                <div className="col-span-4 md:col-span-3">
                                    <PieGraph />
                                </div> 
                            </div>
                        </TabsContent>
                        </Tabs>
                    </div>
                </PageContainer>
            )}
        </ContentLayout>
    );
}

