import React from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import type { OddsEntry } from "./types";
import { getChangeInfo } from "./oddsUtils";

interface OddsCellProps {
  nextVal: OddsEntry;
  prevVal?: OddsEntry;
  isEven?: boolean;
  useSmallText?: boolean;
}

export default function OddsCell({
  nextVal,
  prevVal,
  isEven = false,
  useSmallText = false,
}: OddsCellProps) {
  const { pChange, wChange } = getChangeInfo(prevVal, nextVal);

  // Determine text size based on prop
  const textSize = useSmallText ? "text-[10px]" : "text-xs";
  const iconSize = useSmallText ? "w-2 h-2" : "w-2.5 h-2.5";

  const pBg =
    pChange === "up"
      ? "bg-emerald-100"
      : pChange === "down"
      ? "bg-rose-100"
      : "bg-gray-100";

  const pText =
    pChange === "up"
      ? "text-emerald-700"
      : pChange === "down"
      ? "text-rose-700"
      : "text-gray-700";

  const pBorder =
    pChange === "up"
      ? "border-emerald-500"
      : pChange === "down"
      ? "border-rose-500"
      : "border-gray-200";

  const wBg =
    wChange === "up"
      ? "bg-emerald-100"
      : wChange === "down"
      ? "bg-rose-100"
      : "bg-gray-100";

  const wText =
    wChange === "up"
      ? "text-emerald-700"
      : wChange === "down"
      ? "text-rose-700"
      : "text-gray-700";

  const wBorder =
    wChange === "up"
      ? "border-emerald-500"
      : wChange === "down"
      ? "border-rose-500"
      : "border-gray-200";

  const cellBg = isEven ? "bg-gray-50" : "bg-white";

  return (
    <div
      className={`px-1 py-1 ${textSize} whitespace-nowrap bg-transparent w-full`}
    >
      <div className="flex items-center justify-between gap-1">
        <div
          className={`flex items-center rounded-sm ${pBg} px-1 py-0.5 min-w-[36px] justify-center border ${pBorder}`}
        >
          <span className={`font-medium text-gray-700 ${textSize}`}>P:</span>
          <span className={`ml-1 font-bold ${pText}`}>
            {nextVal.fixedP.toFixed(1)}
          </span>
          {pChange === "up" && (
            <ArrowUp
              className={`${iconSize} text-emerald-700 ml-0.5 flex-shrink-0`}
            />
          )}
          {pChange === "down" && (
            <ArrowDown
              className={`${iconSize} text-rose-700 ml-0.5 flex-shrink-0`}
            />
          )}
          {pChange === "none" && (
            <Minus
              className={`${iconSize} text-gray-400 ml-0.5 flex-shrink-0`}
            />
          )}
        </div>
        <div
          className={`flex items-center rounded-sm ${wBg} px-1 py-0.5 min-w-[36px] justify-center border ${wBorder}`}
        >
          <span className={`font-medium text-gray-700 ${textSize}`}>W:</span>
          <span className={`ml-1 font-bold ${wText}`}>
            {nextVal.fixedW.toFixed(1)}
          </span>
          {wChange === "up" && (
            <ArrowUp
              className={`${iconSize} text-emerald-700 ml-0.5 flex-shrink-0`}
            />
          )}
          {wChange === "down" && (
            <ArrowDown
              className={`${iconSize} text-rose-700 ml-0.5 flex-shrink-0`}
            />
          )}
          {wChange === "none" && (
            <Minus
              className={`${iconSize} text-gray-400 ml-0.5 flex-shrink-0`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
