import * as React from "react"
import { cn } from "../../utils/cn"

interface SliderProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  valueLabel?: string
}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, label, valueLabel, ...props }, ref) => {
    return (
      <div className="space-y-2">
        {(label || valueLabel) && (
           <div className="flex items-center justify-between text-xs text-muted-foreground">
             {label && <label>{label}</label>}
             {valueLabel && <span>{valueLabel}</span>}
           </div>
        )}
        <input
          type="range"
          className={cn("w-full", className)}
          ref={ref}
          {...props}
        />
      </div>
    )
  }
)
Slider.displayName = "Slider"

export { Slider }
