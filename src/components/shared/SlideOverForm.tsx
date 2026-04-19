"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/src/lib/utils";

interface SlideOverFormProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

/**
 * Reusable Slide-Over Drawer Component for MOBILE-HAJIRA-SaaS
 * Used for creating/editing forms without page refreshes.
 */
export const SlideOverForm: React.FC<SlideOverFormProps> = ({
  isOpen,
  onClose,
  title,
  children
}) => {
  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => { document.body.style.overflow = "unset"; };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] z-[200]"
          />

          {/* Side Panel */}
          <motion.div 
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed top-0 right-0 h-full w-full sm:max-w-md bg-white shadow-2xl z-[201] flex flex-col"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between bg-white sticky top-0">
              <h2 className="text-lg font-black text-[#6f42c1] font-bengali uppercase tracking-tight">{title}</h2>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors group"
              >
                <X className="w-6 h-6 text-gray-400 group-hover:text-[#6f42c1]" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-6 py-6 font-sans">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
