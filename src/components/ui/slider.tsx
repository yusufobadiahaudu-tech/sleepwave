import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";
import { cn } from "@/lib/utils";

function Slider({
  className,
  trackClassName,
  rangeClassName,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root> & {
  trackClassName?: string;
  rangeClassName?: string;
}) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex h-11 w-full touch-none items-center select-none",
        className,
      )}
      {...props}
    >
      <SliderPrimitive.Track
        className={cn(
          "relative h-1.5 w-full grow overflow-hidden rounded-full bg-elevated",
          trackClassName,
        )}
      >
        <SliderPrimitive.Range
          className={cn("absolute h-full rounded-full bg-accent", rangeClassName)}
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        className="block size-4 rounded-full bg-fg shadow-[0_0_0_4px_color-mix(in_oklab,var(--color-bg)_70%,transparent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={props["aria-label"]}
      />
    </SliderPrimitive.Root>
  );
}

export { Slider };
