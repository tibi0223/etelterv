import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"

type SliderProps = React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> & {
  showValue?: boolean
  formatValue?: (n: number) => string
  formatRange?: (a: number, b: number) => string
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>(({ className, showValue, formatValue, formatRange, onValueChange, ...props }, ref) => {
  // Determine how many thumbs to render based on value/defaultValue length
  const controlledValue = (props as any).value as number[] | undefined
  const defaultValue = (props as any).defaultValue as number[] | undefined

  const [internalValue, setInternalValue] = React.useState<number[]>(
    () => (controlledValue ?? defaultValue ?? [0]) as number[]
  )

  React.useEffect(() => {
    if (Array.isArray(controlledValue)) setInternalValue(controlledValue)
  }, [controlledValue?.join(",")])

  const thumbCount = Array.isArray(controlledValue)
    ? controlledValue.length
    : Array.isArray(defaultValue)
    ? defaultValue.length
    : 1

  const min = (props as any).min ?? 0
  const max = (props as any).max ?? 100

  const handleChange = (vals: number[]) => {
    setInternalValue(vals)
    onValueChange?.(vals)
  }

  const toPercent = (n: number) => ((n - min) / (max - min)) * 100
  const renderSingleLabel = (val: number, index: number) => {
    return (
      <div
        key={`label-${index}`}
        className="absolute -top-6 -translate-x-1/2 text-[10px] sm:text-xs font-medium text-gray-600 dark:text-slate-300 bg-transparent border-0 rounded-none px-0 py-0 shadow-none pointer-events-none select-none"
        style={{ left: `${toPercent(val)}%` }}
      >
        {formatValue ? formatValue(val) : String(val)}
      </div>
    )
  }

  const renderRangeLabel = (a: number, b: number) => {
    const center = (a + b) / 2
    return (
      <div
        className="absolute -top-6 -translate-x-1/2 text-[10px] sm:text-xs font-medium text-gray-600 dark:text-slate-300 bg-transparent border-0 rounded-none px-0 py-0 shadow-none pointer-events-none select-none"
        style={{ left: `${toPercent(center)}%` }}
      >
        {formatRange ? formatRange(a, b) : `${a}\u2013${b}`}
      </div>
    )
  }

  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        className
      )}
      onValueChange={handleChange}
      {...props}
    >
      {showValue && Array.isArray(internalValue) && (
        internalValue.length === 2
          ? renderRangeLabel(internalValue[0], internalValue[1])
          : internalValue.map(renderSingleLabel)
      )}
      <SliderPrimitive.Track className="relative h-3 sm:h-2 w-full grow overflow-hidden rounded-full bg-gray-200 dark:bg-slate-700">
        <SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-purple-500 to-pink-500" />
      </SliderPrimitive.Track>
      {Array.from({ length: thumbCount }).map((_, i) => (
        <SliderPrimitive.Thumb
          key={i}
          className="block h-7 w-7 sm:h-5 sm:w-5 rounded-full border-2 border-purple-500 bg-white dark:bg-slate-900 shadow-md ring-offset-background transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50"
        />
      ))}
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }
