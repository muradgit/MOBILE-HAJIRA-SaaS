"use client";

import React, { useState } from "react";
import { 
  Search, 
  MoreVertical, 
  ChevronLeft, 
  ChevronRight, 
  Edit2, 
  Trash2 
} from "lucide-react";
import { cn } from "@/src/lib/utils";

interface Column {
  header: string;
  accessorKey: string;
  cell?: (item: any) => React.ReactNode;
}

interface DataTableProps {
  columns: Column[];
  data: any[];
  onEdit?: (item: any) => void;
  onDelete?: (item: any) => void;
  searchPlaceholder?: string;
  itemsPerPage?: number;
}

/**
 * Reusable Data Table Component for MOBILE-HAJIRA-SaaS
 * Features: Search, Row Actions, Responsive Layout, Pagination.
 */
export const DataTable: React.FC<DataTableProps> = ({
  columns,
  data,
  onEdit,
  onDelete,
  searchPlaceholder = "সার্চ করুন...",
  itemsPerPage = 10
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Filter logic
  const filteredData = data.filter(item => 
    Object.values(item).some(val => 
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  // Pagination logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedData = filteredData.slice(startIndex, startIndex + itemsPerPage);

  const toggleMenu = (id: string) => {
    setOpenMenuId(openMenuId === id ? null : id);
  };

  return (
    <div className="space-y-4 font-sans">
      {/* Search Bar */}
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-[#6f42c1] transition-colors" />
        <input 
          type="text"
          placeholder={searchPlaceholder}
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setCurrentPage(1);
          }}
          className="w-full bg-white border border-gray-200 rounded-xl pl-11 pr-4 py-3 text-sm font-medium outline-none focus:ring-2 focus:ring-[#6f42c1] focus:border-transparent transition-all shadow-sm"
        />
      </div>

      {/* Table Container */}
      <div className="bg-white border border-gray-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {columns.map((col, idx) => (
                  <th key={idx} className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest">
                    {col.header}
                  </th>
                ))}
                {(onEdit || onDelete) && (
                  <th className="px-6 py-4 text-[11px] font-black text-gray-400 uppercase tracking-widest text-right">
                    অ্যাকশন
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedData.length > 0 ? (
                paginatedData.map((item, rowIdx) => (
                  <tr key={rowIdx} className="hover:bg-purple-50/30 transition-colors">
                    {columns.map((col, colIdx) => (
                      <td key={colIdx} className="px-6 py-4 text-sm font-medium text-gray-700 whitespace-nowrap">
                        {col.cell ? col.cell(item) : item[col.accessorKey]}
                      </td>
                    ))}
                    {(onEdit || onDelete) && (
                      <td className="px-6 py-4 text-right relative">
                        <button 
                          onClick={() => toggleMenu(`row-${rowIdx}`)}
                          className="p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        
                        {openMenuId === `row-${rowIdx}` && (
                          <div className="absolute right-6 top-12 w-32 bg-white border border-gray-100 rounded-xl shadow-xl z-10 py-1 overflow-hidden scale-in-center">
                            {onEdit && (
                              <button 
                                onClick={() => { onEdit(item); setOpenMenuId(null); }}
                                className="w-full px-4 py-2 text-left text-xs font-bold text-gray-600 hover:bg-purple-50 hover:text-[#6f42c1] flex items-center gap-2"
                              >
                                <Edit2 className="w-3 h-3" /> এডিট
                              </button>
                            )}
                            {onDelete && (
                              <button 
                                onClick={() => { onDelete(item); setOpenMenuId(null); }}
                                className="w-full px-4 py-2 text-left text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="w-3 h-3" /> মুছুন
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={columns.length + (onEdit || onDelete ? 1 : 0)} className="px-6 py-12 text-center text-gray-400 font-medium italic">
                    কোন তথ্য পাওয়া যায়নি
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
            {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredData.length)} / {filteredData.length} entries
          </p>
          <div className="flex gap-2">
            <button 
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(prev => prev - 1)}
              className="p-2 border border-gray-100 rounded-lg bg-white shadow-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-[#6f42c1]" />
            </button>
            <button 
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(prev => prev + 1)}
              className="p-2 border border-gray-100 rounded-lg bg-white shadow-sm disabled:opacity-30 disabled:cursor-not-allowed hover:bg-gray-50 transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-[#6f42c1]" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
