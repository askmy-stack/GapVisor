import { useMemo, useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import DashboardTopbar from "@/components/layout/DashboardTopbar";
import { FilterBar } from "@/components/AnswerAnalysis/FilterBar";
import { AnswerList } from "@/components/AnswerAnalysis/AnswerList";
import { AnswerDetail } from "@/components/AnswerAnalysis/AnswerDetail";

import { answers as MOCK_RECORDS } from "@/data/answer-analysis";
import {
  applyAnswerFilters,
  defaultAnswerFilters,
  type AnswerFilterState,
} from "@/components/AnswerAnalysis/answer-filters";

export default function AnswerAnalysis() {
  const [selectedId, setSelectedId] = useState<string>(MOCK_RECORDS[0].id);

  const [filters, setFilters] = useState<AnswerFilterState>(defaultAnswerFilters);
  const records = useMemo(() => applyAnswerFilters(MOCK_RECORDS, filters), [filters]);

  const selectedRecord = records.find(r => r.id === selectedId) ?? records[0];

  return (
    <DashboardShell>
      <DashboardTopbar
        title="Answer Analysis"
        description="Explore why AI models recommend or omit your brand"
      />
      <main className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        <FilterBar value={filters} onChange={setFilters} />

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Pane - List */}
          <div className="w-full md:w-80 lg:w-[380px] border-r bg-card shrink-0 h-[40vh] md:h-full">
            {records.length === 0 && (
              <div className="p-6 text-sm text-muted-foreground">
                No answers match these filters.{" "}
                <button type="button" className="text-foreground underline" onClick={() => setFilters(defaultAnswerFilters)}>
                  Clear filters
                </button>
              </div>
            )}
            <AnswerList
              records={records}
              selectedId={selectedRecord?.id ?? ""}
              onSelect={setSelectedId}
            />
          </div>

          {/* Right Pane - Detail */}
          <div className="flex-1 bg-background h-[60vh] md:h-full">
            {selectedRecord ? (
              <AnswerDetail record={selectedRecord} />
            ) : (
              <div className="h-full flex items-center justify-center p-6 text-sm text-muted-foreground">
                Pick an answer to see the detail.
              </div>
            )}
          </div>
        </div>
      </main>
    </DashboardShell>
  );
}