"use client";

import { useState } from "react";
import type { MarketReport } from "@/lib/types";

interface ReportCardProps {
  report: MarketReport | null;
}

export function ReportCard({ report }: ReportCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (!report) {
    return (
      <div className="bg-card border border-card-border rounded-lg p-6 text-center text-secondary">
        No AI report available yet. Reports are generated daily at market close.
      </div>
    );
  }

  const date = new Date(report.generatedAt).toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-card border border-card-border rounded-lg p-6">
      <div className="flex justify-between items-start mb-3">
        <h2 className="text-lg font-semibold text-foreground">
          AI Market Report
        </h2>
        <span className="text-xs text-secondary">{date}</span>
      </div>

      <p className="text-foreground mb-4">{report.summary}</p>

      {/* Key risks */}
      <div className="mb-4">
        <h3 className="text-sm font-medium text-secondary mb-2">Key Risks</h3>
        <ul className="list-disc list-inside text-sm text-foreground space-y-1">
          {report.keyRisks.map((risk, i) => (
            <li key={i}>{risk}</li>
          ))}
        </ul>
      </div>

      {/* Expandable full analysis */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-sm text-primary hover:underline"
      >
        {expanded ? "Show less" : "Read full analysis"}
      </button>

      {expanded && (
        <div className="mt-4 space-y-4 text-sm text-foreground">
          <div>
            <h3 className="font-medium text-secondary mb-1">Factor Analysis</h3>
            <p>{report.factorAnalysis}</p>
          </div>
          <div>
            <h3 className="font-medium text-secondary mb-1">Outlook</h3>
            <p>{report.outlook}</p>
          </div>
          <div>
            <h3 className="font-medium text-secondary mb-1">
              Data at time of report
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              <div>
                Gold: ${report.dataSnapshot.goldPrice.toFixed(2)}
              </div>
              <div>
                Silver: ${report.dataSnapshot.silverPrice.toFixed(2)}
              </div>
              <div>VIX: {report.dataSnapshot.vix.toFixed(1)}</div>
              <div>DXY: {report.dataSnapshot.dxy.toFixed(2)}</div>
              <div>
                Real Rate: {report.dataSnapshot.realRate.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
