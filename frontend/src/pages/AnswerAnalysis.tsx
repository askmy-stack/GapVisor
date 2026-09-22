import { useState } from "react";
import DashboardShell from "@/components/layout/DashboardShell";
import DashboardTopbar from "@/components/layout/DashboardTopbar";
import { FilterBar } from "@/components/AnswerAnalysis/FilterBar";
import { AnswerList } from "@/components/AnswerAnalysis/AnswerList";
import { AnswerDetail } from "@/components/AnswerAnalysis/AnswerDetail";

import { answers as MOCK_RECORDS } from "@/data/answer-analysis";

export default function AnswerAnalysis() {
  const [selectedId, setSelectedId] = useState<string>(MOCK_RECORDS[0].id);

  const selectedRecord = MOCK_RECORDS.find(r => r.id === selectedId) || MOCK_RECORDS[0];

  return (
    <DashboardShell>
      <DashboardTopbar
        title="Answer Analysis"
        description="Explore why AI models recommend or omit your brand"
      />
      <main className="flex flex-col h-[calc(100vh-64px)] overflow-hidden">
        <FilterBar />

        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Left Pane - List */}
          <div className="w-full md:w-80 lg:w-[380px] border-r bg-card shrink-0 h-[40vh] md:h-full">
            <AnswerList
              records={MOCK_RECORDS}
              selectedId={selectedId}
              onSelect={setSelectedId}
            />
          </div>

          {/* Right Pane - Detail */}
          <div className="flex-1 bg-background h-[60vh] md:h-full">
            <AnswerDetail record={selectedRecord} />
          </div>
        </div>
      </main>
    </DashboardShell>
  );
}