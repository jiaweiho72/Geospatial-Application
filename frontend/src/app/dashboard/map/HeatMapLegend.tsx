import React, { useState } from 'react';
import { useHeatMapContext } from '@/context/HeatMapContext';
import { useMap } from 'react-leaflet';
import { Slider } from "@/components/ui/slider"; // Using ShadCN slider for smoother interactions

const HeatMapLegend: React.FC = () => {
  const map = useMap();
  const { heatMapMax, setHeatMapMax } = useHeatMapContext();
  const [inputValue, setInputValue] = useState<number>(heatMapMax);

  const MIN_VALUE = 0;
  const MAX_VALUE = 500;
  const STEP = 10;

  const handleMaxChange = (newValue: number) => {
    setInputValue(newValue);
    setHeatMapMax(newValue);
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(event.target.value, 10);
    setInputValue(newValue);
    // if (!isNaN(newValue) && newValue >= MIN_VALUE && newValue <= MAX_VALUE) {
    //   setHeatMapMax(newValue);
    // }
    if (!isNaN(newValue) && newValue >= MIN_VALUE) {
      setHeatMapMax(newValue);
    }
  };

  const handleSliderChange = (value: number) => {
    setInputValue(value);
    setHeatMapMax(value);
  };

  // Disable map zoom when input is focused
  const handleFocus = () => {
    map.dragging.disable();
    map.doubleClickZoom.disable(); // Disable double-click zoom
    map.scrollWheelZoom.disable();
  };

  const handleBlur = () => {
    map.dragging.enable();
    map.doubleClickZoom.enable(); // Re-enable double-click zoom
    map.scrollWheelZoom.enable();
  };

  // Adjusted color stops for four categories
  const colorStops = [
    { colorClass: 'bg-blue-400', label: 'Low', ratio: 0.0 },
    { colorClass: 'bg-green-400', label: 'Medium Low', ratio: 0.33 },
    { colorClass: 'bg-yellow-400', label: 'Medium High', ratio: 0.67 },
    { colorClass: 'bg-red-400', label: 'High', ratio: 1.0 },
  ];

  // Function to calculate intensity ranges based on heatMapMax
  const calculateIntensityRanges = (max: number) => {
    const ranges: { label: string, lower: number, upper: number }[] = [];
    for (let i = 0; i < colorStops.length; i++) {
      const lowerBound = Math.floor((max / colorStops.length) * i);
      const upperBound = Math.floor((max / colorStops.length) * (i + 1));
      ranges.push({
        label: colorStops[i].label,
        lower: lowerBound,
        upper: upperBound,
      });
    }
    return ranges;
  };

  const intensityRanges = calculateIntensityRanges(heatMapMax);

  return (
    <div className="absolute bottom-20 right-5 p-3 bg-white bg-opacity-90 rounded-lg shadow-lg z-[1000] border border-gray-300 w-64">
      <h4 className="text-sm font-semibold text-gray-800 mb-2">Detection Intensity</h4>

      {/* Max Intensity Label and Input */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-xs text-gray-600">Max Intensity:</label>
        <input
          type="number"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus} // Disable map interactions on focus
          onBlur={handleBlur} // Re-enable on blur
          min={MIN_VALUE}
          // max={MAX_VALUE}
          className="w-16 text-xs p-1 border rounded border-gray-300 bg-gray-100 text-gray-600 focus:border-blue-500 hover:bg-gray-200 selection:bg-blue-200 selection:text-blue-800"
        />
      </div>

      {/* ShadCN Slider */}
      <Slider
        value={[inputValue]}
        max={MAX_VALUE}
        step={STEP}
        onValueChange={(value) => handleSliderChange(value[0])}
        className="my-4"
        // trackColor="bg-gradient-to-r from-white via-green-400 to-red-600"
        trackColor="bg-gray-300"

        thumbColor="bg-red-600"
      />

      {/* Intensity Labels */}
      <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
        <span>Low</span>
        <span>High</span>
      </div>
      <div className="h-2 w-full rounded-md bg-gradient-to-r from-blue-400 via-green-400 to-red-600 mb-2"></div>

      {/* Intensity Ranges */}
      <div className="flex flex-col space-y-1 text-xs">
        {intensityRanges.map((range, index) => (
          <div className="flex items-center" key={index}>
            <span className={`inline-block w-3 h-3 mr-2 rounded-full ${colorStops[index].colorClass} border border-gray-300`}></span>
            <span className="text-gray-700">
              {range.label} ({range.lower} - {range.upper > range.lower ? range.upper : range.upper + '>'})
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default HeatMapLegend;
