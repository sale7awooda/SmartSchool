"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CircleCheckIcon, InfoIcon, TriangleAlertIcon, OctagonXIcon, Loader2Icon } from "lucide-react"

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      icons={{
        success: (
          <CircleCheckIcon className="size-4" />
        ),
        info: (
          <InfoIcon className="size-4" />
        ),
        warning: (
          <TriangleAlertIcon className="size-4" />
        ),
        error: (
          <OctagonXIcon className="size-4" />
        ),
        loading: (
          <Loader2Icon className="size-4 animate-spin" />
        ),
      }}
      style={
        {
          "--normal-bg": "var(--popover)",
          "--normal-text": "var(--popover-foreground)",
          "--normal-border": "var(--border)",
          "--border-radius": "var(--radius)",
        } as React.CSSProperties
      }
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster.info]:text-white group-[.toaster.success]:text-white group-[.toaster.error]:text-white group-[.toaster.warning]:text-white group-[.toaster]:border-border shadow-lg font-sans border-2",
          title: "font-bold",
          description: "opacity-100 whitespace-pre-wrap font-medium",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground font-bold",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground font-bold",
          error: "group-[.toaster]:bg-rose-600 group-[.toaster]:text-white group-[.toaster]:border-rose-700",
          success: "group-[.toaster]:bg-emerald-600 group-[.toaster]:text-white group-[.toaster]:border-emerald-700",
          warning: "group-[.toaster]:bg-amber-600 group-[.toaster]:text-white group-[.toaster]:border-amber-700",
          info: "group-[.toaster]:bg-sky-600 group-[.toaster]:text-white group-[.toaster]:border-sky-700",
        },
      }}
      richColors
      expand
      {...props}
    />
  )
}

export { Toaster }
