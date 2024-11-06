"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

interface SliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  trackColor?: string; // Optional prop for track color
  thumbColor?: string; // Optional prop for thumb color
}

const Slider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, SliderProps>(
  ({ className, trackColor = "bg-primary/20", thumbColor = "bg-primary", ...props }, ref) => (
    <SliderPrimitive.Root
      ref={ref}
      className={cn("relative flex w-full touch-none select-none items-center", className)}
      {...props}
    >
      <SliderPrimitive.Track className={cn("relative h-1.5 w-full grow overflow-hidden rounded-full", trackColor)}>
        <SliderPrimitive.Range className={cn("absolute h-full", thumbColor)} />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className={cn("block h-4 w-4 rounded-full border border-primary/50", thumbColor, "shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50")} />
    </SliderPrimitive.Root>
  )
);
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
