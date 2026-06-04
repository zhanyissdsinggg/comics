"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cva } from "class-variance-authority";

import { cn } from "@/lib/utils";

function Tabs({ className, orientation = "horizontal", ...props }) {
  return (
    <TabsPrimitive.Root
      data-slot="tabs"
      data-orientation={orientation}
      className={cn(
        "group/tabs flex gap-2 data-horizontal:flex-col",
        className,
      )}
      {...props}
    />
  );
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-full border border-[color:var(--gush-glass-border)] bg-[var(--gush-panel)] p-[4px] text-[color:var(--gush-text-muted)] shadow-[var(--gush-shadow-pill)] backdrop-blur-xl group-data-horizontal/tabs:min-h-[44px] group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none data-[variant=line]:border-0 data-[variant=line]:bg-transparent data-[variant=line]:p-0 data-[variant=line]:shadow-none",
  {
    variants: {
      variant: {
        default: "",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

function TabsList({ className, variant = "default", ...props }) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      data-variant={variant}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "gush-transition-base relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-full border border-transparent px-3.5 py-2 text-sm font-medium whitespace-nowrap text-[color:var(--gush-text-muted)] group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-[color:var(--gush-text)] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-[color:var(--gush-focus-cyan)] disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 group-data-[variant=default]/tabs-list:data-active:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.12),0_14px_26px_rgba(0,0,0,0.22)] group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent group-data-[variant=line]/tabs-list:data-active:border-transparent",
        "data-active:border-[color:var(--gush-border)] data-active:bg-[var(--gush-gradient-primary)] data-active:text-white",
        "after:absolute after:bg-[var(--gush-cyan)] after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-3 group-data-horizontal/tabs:after:bottom-[-4px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-2 group-data-vertical/tabs:after:-right-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants };
