import * as React from "react"
import { cn } from "../../utils/cn"

const Button = React.forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'outline', size?: 'sm' | 'md' | 'lg' | 'icon' }>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
          {
            'bg-gradient-to-b from-sky-400 to-sky-500 text-white hover:from-sky-500 hover:to-sky-600 shadow-[0_0_20px_-5px_rgba(14,165,233,0.4)] border-t border-white/20': variant === 'primary',
            'bg-slate-800/50 text-slate-300 hover:bg-slate-700/50 hover:text-white border border-white/5 hover:border-white/10': variant === 'secondary',
            'hover:bg-white/5 text-slate-400 hover:text-white': variant === 'ghost',
            'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20': variant === 'danger',
            'border border-white/10 bg-transparent hover:bg-white/5 text-slate-300 hover:text-white': variant === 'outline',
            'h-9 px-3': size === 'sm',
            'h-10 px-4 py-2': size === 'md',
            'h-11 px-8': size === 'lg',
            'h-10 w-10': size === 'icon',
          },
          className
        )}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button }
