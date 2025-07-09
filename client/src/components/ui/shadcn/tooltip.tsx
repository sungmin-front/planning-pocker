import * as React from "react"
import * as TooltipPrimitive from "@radix-ui/react-tooltip"

import { cn } from "@/lib/utils"

const TooltipProvider = TooltipPrimitive.Provider

const Tooltip = TooltipPrimitive.Root

const TooltipTrigger = TooltipPrimitive.Trigger

const TooltipPortal = ({ children, ...props }: React.ComponentProps<typeof TooltipPrimitive.Portal>) => (
  <TooltipPrimitive.Portal container={document.body} {...props}>
    {children}
  </TooltipPrimitive.Portal>
)

const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-10 rounded-md border bg-gray-900 text-white px-3 py-1.5 text-sm shadow-lg relative dark:bg-gray-900 dark:text-white",
      className
    )}
    {...props}
  />
))
TooltipContent.displayName = TooltipPrimitive.Content.displayName

const TooltipArrow = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Arrow>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Arrow>
>(({ className, ...props }, ref) => (
  <TooltipPrimitive.Arrow
    ref={ref}
    className={cn("fill-gray-900", className)}
    width={10}
    height={5}
    {...props}
  />
))
TooltipArrow.displayName = TooltipPrimitive.Arrow.displayName

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider, TooltipPortal, TooltipArrow }
