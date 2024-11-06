'use client';

import { useState, useEffect } from 'react';
import { Bar, BarChart, CartesianGrid, XAxis } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';

export const description = 'An interactive bar chart';

const chartConfig = {
  views: {
    label: 'Obstruction Count'
  },
  desktop: {
    label: 'Desktop',
    color: 'hsl(var(--chart-1))'
  },
  mobile: {
    label: 'Mobile',
    color: 'hsl(var(--chart-2))'
  }
} satisfies ChartConfig;

export function BarGraph() {
  const [activeChart, setActiveChart] =
    useState<keyof typeof chartConfig>('views');

  const [chartData, setChartData] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const { getObstructionTimeSeries } = await import('@/app/services/api');
      const fetchedData = await getObstructionTimeSeries();
  
      // Define the date range
      const endDate = new Date();  // Current date
      const startDate = new Date();
      startDate.setDate(endDate.getDate() - 30);  // Last 30 days
  
      // Helper function to format the date as 'YYYY-MM-DD'
      const formatDate = (date: Date) => {
        return date.toISOString().split('T')[0];
      };
  
      // Create a map to store obstruction counts, initialized to 0 for each day in the range
      const dateMap: Record<string, number> = {};
  
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        dateMap[formatDate(d)] = 0; // Set default obstruction count to 0
      }
  
      // Populate the dateMap with fetched data where available
      fetchedData.forEach(item => {
        const formattedDate = formatDate(new Date(item.date)); // Convert item.date to a consistent format
        if (dateMap[formattedDate] !== undefined) {
          dateMap[formattedDate] = item.obstruction_count || 0;
        }
      });
  
      // Transform the dateMap back into an array suitable for the chart
      const transformedData = Object.entries(dateMap).map(([date, count]) => ({
        date,
        views: count
      }));
  
      setChartData(transformedData);
    } catch (err) {
      console.error('Failed to load reports from database', err);
    }
  };
  

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
        <div className="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
          <CardTitle>Daily Obstructions</CardTitle>
          <CardDescription>
            Showing total obstructions each day
          </CardDescription>
        </div>
        <div className="flex">
          {['views'].map((key) => {
            const chart = key as keyof typeof chartConfig;
            return (
              <button
                key={chart}
                data-active={activeChart === chart}
                className="relative flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-left even:border-l data-[active=true]:bg-muted/50 sm:border-l sm:border-t-0 sm:px-8 sm:py-6"
                onClick={() => setActiveChart(chart)}
              >
                <span className="text-xs text-muted-foreground">
                  {chartConfig[chart].label}
                </span>
                <span className="text-lg font-bold leading-none sm:text-3xl">
                </span>
              </button>
            );
          })}
        </div>
      </CardHeader>
      <CardContent className="px-2 sm:p-6">
        <ChartContainer
          config={chartConfig}
          className="aspect-auto h-[325px] w-full"
        >
          <BarChart
            accessibilityLayer
            data={chartData}
            margin={{
              left: 12,
              right: 12
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                });
              }}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  className="w-[150px]"
                  nameKey="views"
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    });
                  }}
                />
              }
            />
            <Bar dataKey={activeChart} fill={`#38bdf8`} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
