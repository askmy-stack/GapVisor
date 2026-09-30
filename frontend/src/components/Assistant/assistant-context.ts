import { createContext, useContext } from "react";

export interface AssistantContextValue {
  openAssistant: () => void;
}

const noop: AssistantContextValue = { openAssistant: () => {} };

/** Lets any control inside DashboardShell open the assistant panel. */
export const AssistantContext = createContext<AssistantContextValue>(noop);

export function useAssistant() {
  return useContext(AssistantContext);
}
