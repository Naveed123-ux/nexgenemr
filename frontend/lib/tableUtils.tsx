// src/utils/tableUtils.tsx

import { ColumnDef } from "@tanstack/react-table";
import { ArrowUpDown } from "lucide-react";
import React from "react";

export type DynamicData = Record<string, any>;

// --- Helper Functions ---

const formatColumnHeader = (key: string): string => {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

/**
 * Determines the color class for Length of Stay based on hours
 * @param value The length of stay value (e.g., "150h" or "250h")
 * @returns Color classes for text
 */
const getLengthOfStayColor = (value: string): string => {
  // Extract numeric value from string like "200h"
  const hours = parseInt(value.replace(/[^0-9]/g, ""));

  if (isNaN(hours)) return "text-gray-800";

  if (hours < 200) {
    return "text-green-600 font-semibold"; // Green for < 200 hours
  } else if (hours >= 200 && hours < 400) {
    return "text-yellow-600 font-semibold"; // Yellow for 200-399 hours
  } else {
    return "text-red-600 font-semibold"; // Red for >= 400 hours
  }
};

const renderCellContent = (value: any, columnKey: string): React.ReactNode => {
  if (
    value === null ||
    value === undefined ||
    value === "N/A" ||
    value === "n/a" ||
    value === ""
  ) {
    return <span className="text-gray-400 italic text-sm">—</span>;
  }

  const stringValue = String(value);

  // Special handling for Length of Stay column
  if (
    columnKey === "length_of_stay" ||
    columnKey === "lengthOfStay" ||
    columnKey === "length of stay"
  ) {
    const colorClass = getLengthOfStayColor(stringValue);
    return <span className={colorClass}>{stringValue}</span>;
  }

  // Handle other status values
  switch (stringValue.toLowerCase()) {
    case "active":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800">
          {stringValue}
        </span>
      );
    case "inactive":
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
          {stringValue}
        </span>
      );
    default:
      return stringValue;
  }
};

// --- Fully Automatic Column Generator ---

/**
 * Creates table columns directly from the API data. No configuration needed.
 * It discovers all keys from the data and creates a column for each one.
 * @param data The array of data from the API.
 * @returns An array of ColumnDef objects for TanStack Table.
 */
export const createColumnsFromData = (
  data: DynamicData[]
): ColumnDef<DynamicData>[] => {
  if (!data || data.length === 0) return [];

  // 1. Discover all unique keys from the actual API data.
  const allKeys = new Set<string>();
  data.forEach((row) => {
    Object.keys(row).forEach((key) => allKeys.add(key));
  });

  // 2. Create a column for every key that was found.
  const dynamicColumns: ColumnDef<DynamicData>[] = Array.from(allKeys).map(
    (key) => {
      return {
        accessorKey: key,
        header: () => (
          <div className="flex items-center gap-2 text-left py-3 px-4 font-semibold text-gray-600 text-sm">
            <span>{formatColumnHeader(key)}</span>
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
          </div>
        ),
        cell: ({ row }) => (
          <div className="py-3 px-4 text-gray-800 text-sm">
            {renderCellContent(row.getValue(key), key)}
          </div>
        ),
      };
    }
  );

  // The Actions column has been removed. We now only return the dynamic columns.
  return dynamicColumns;
};
