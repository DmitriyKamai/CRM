"use client"

import {
  CircleCheck,
  Info,
  LoaderCircle,
  OctagonX,
  TriangleAlert,
} from "lucide-react"
import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: <CircleCheck className="h-4 w-4" />,
        info: <Info className="h-4 w-4" />,
        warning: <TriangleAlert className="h-4 w-4" />,
        error: <OctagonX className="h-4 w-4" />,
        loading: <LoaderCircle className="h-4 w-4 animate-spin" />,
      }}
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "sonner-toast-glass group toast w-[var(--width)] surface-glass rounded-xl px-4 py-3 pr-11 text-sm text-foreground flex flex-row items-start gap-3",
          content: "min-w-0 flex-1 flex flex-col gap-0.5",
          title: "font-medium leading-snug text-foreground",
          description: "text-xs leading-snug text-muted-foreground mt-0.5",
          icon: "shrink-0 mt-0.5 text-foreground [&_svg]:size-4",
          closeButton:
            "flex size-7 shrink-0 items-center justify-center rounded-full shadow-none cursor-pointer",
          actionButton:
            "shrink-0 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90",
          cancelButton:
            "shrink-0 rounded-md border border-border/70 bg-background/35 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm hover:bg-background/50",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
