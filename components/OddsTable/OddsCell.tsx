import React from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { OddsEntry } from "./types";
import { getChangeInfo } from "./oddsUtils";

interface OddsCellProps {
  nextVal: OddsEntry;
  prevVal?: OddsEntry;
}

export default function OddsCell({ nextVal, prevVal }: OddsCellProps) {
  const { pChange, wChange } = getChangeInfo(prevVal, nextVal);

  const pBg =
    pChange === "up"
      ? "bg-emerald-100"
      : pChange === "down"
      ? "bg-rose-100"
      : "bg-gray-100";
  const wBg =
    wChange === "up"
      ? "bg-emerald-100"
      : wChange === "down"
      ? "bg-rose-100"
      : "bg-gray-100";

  return (
    <div className="px-2 py-2 text-sm whitespace-nowrap bg-white rounded-lg shadow-sm border border-gray-100">
      <div
        className={`flex items-center justify-center mb-1.5 rounded-md ${pBg} px-2 py-1`}
      >
        <span className="font-medium text-gray-700">P:</span>
        <span className="ml-2 font-medium">{nextVal.fixedP.toFixed(1)}</span>
        {pChange === "up" && (
          <ArrowUp className="w-3 h-3 text-emerald-500 ml-1" />
        )}
        {pChange === "down" && (
          <ArrowDown className="w-3 h-3 text-rose-500 ml-1" />
        )}
        {pChange === "none" && <Minus className="w-3 h-3 text-gray-300 ml-1" />}
      </div>
      <div
        className={`flex items-center justify-center rounded-md ${wBg} px-2 py-1`}
      >
        <span className="font-medium text-gray-700">W:</span>
        <span className="ml-2 font-medium">{nextVal.fixedW.toFixed(1)}</span>
        {wChange === "up" && (
          <ArrowUp className="w-3 h-3 text-emerald-500 ml-1" />
        )}
        {wChange === "down" && (
          <ArrowDown className="w-3 h-3 text-rose-500 ml-1" />
        )}
        {wChange === "none" && <Minus className="w-3 h-3 text-gray-300 ml-1" />}
      </div>
    </div>
  );
}
