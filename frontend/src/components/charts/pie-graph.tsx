'use client';

import React from 'react';
import { TrendingUp } from 'lucide-react';
import { Label, Pie, PieChart, Cell } from 'recharts';

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent
} from '@/components/ui/chart';

import { useEffect, useState } from 'react';
import { StatusColors } from '@/app/constants/colours'
const chartConfig = {
  count: {
    label: 'Count'
  },
  clear: {
    label: 'Clear',
    color: 'hsl(var(--chart-1))'
    // color: StatusColors.clear
  },
  temporary: {
    label: 'Temporary',
    color: 'hsl(var(--chart-2))'
    // color: StatusColors.temporary
  },
  permanent: {
    label: 'Permanent',
    color: 'hsl(var(--chart-3))'
    // color: StatusColors.permanent
  },
} satisfies ChartConfig;

export function PieGraph() {
  const [chartData, setChartData] = useState<any[]>([]);

  const fetchData = async () => {
    try {
      const { getMetrics } = await import('@/app/services/api');
      const fetchedData = await getMetrics();

      const statusData = fetchedData.status_counts;

      const transformedData = Object.entries(statusData).map(([status, count]) => ({
        status,
        count,
      }));

      setChartData(transformedData);
    } catch (err) {
      console.error('Failed to load reports from database', err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalCount = React.useMemo(() => {
    return chartData.reduce((acc, curr) => acc + curr.count, 0);
  }, [chartData]);

  const getFillColor = (status: string): string => {
    const configItem = chartConfig[status as keyof typeof chartConfig];
    return 'color' in configItem ? configItem.color : '#8884d8'; // default color if color is not defined
  };

  return (
    <Card className="flex flex-col">
      <CardHeader className="items-center pb-0">
        <CardTitle>Latest Obstruction Status</CardTitle>
        <CardDescription>Based on Permanence</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <ChartContainer
          config={chartConfig}
          className="mx-auto aspect-square max-h-[360px]"
        >
          <PieChart>
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Pie
              data={chartData}
              dataKey="count"
              nameKey="status"
              innerRadius={60}
              strokeWidth={5}
            >
              {chartData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getFillColor(entry.status)}
                />
              ))}
              <Label
                content={({ viewBox }) => {
                  if (viewBox && 'cx' in viewBox && 'cy' in viewBox) {
                    return (
                      <text
                        x={viewBox.cx}
                        y={viewBox.cy}
                        textAnchor="middle"
                        dominantBaseline="middle"
                      >
                        <tspan
                          x={viewBox.cx}
                          y={viewBox.cy}
                          className="fill-foreground text-3xl font-bold"
                        >
                          {totalCount.toLocaleString()}
                        </tspan>
                        <tspan
                          x={viewBox.cx}
                          y={(viewBox.cy || 0) + 24}
                          className="fill-muted-foreground"
                        >
                          Access Ways
                        </tspan>
                      </text>
                    );
                  }
                  return null;
                }}
              />
            </Pie>
          </PieChart>
        </ChartContainer>
      </CardContent>
      <CardFooter className="flex-col gap-2 text-sm">
        {/* <div className="flex items-center gap-2 font-medium leading-none">
          Trending up by 5.2% this month <TrendingUp className="h-4 w-4" />
        </div> */}
        <div className="leading-none text-muted-foreground">
          Showing latest obstruction status of Fire Access Ways
        </div>
      </CardFooter>
    </Card>
  );
}
