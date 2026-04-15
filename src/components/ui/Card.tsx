import React from "react";
import { cn } from "@/src/lib/utils";

export const Card = ({ children, className, title, icon: Icon }: { children: React.ReactNode, className?: string, title?: string, icon?: any }) => (
  <div className={cn("bg-white rounded-2xl border border-[#E4E3E0] shadow-sm overflow-hidden", className)}>
    {title && (
      <div className="px-6 py-4 border-b border-[#E4E3E0] flex items-center gap-2 bg-gray-50/50">
        {Icon && <Icon className="w-4 h-4 text-[#6f42c1]" />}
        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-500">{title}</h3>
      </div>
    )}
    <div className={cn(title ? "p-6" : "")}>
      {children}
    </div>
  </div>
);
