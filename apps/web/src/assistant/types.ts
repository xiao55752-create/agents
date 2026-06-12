import type { Page } from '../architecture/types';
import type { RunStatus } from '../types';

export type AiTab = 'models' | 'data' | 'training';

export type AssistantAction =
  | { type: 'navigate'; page: Page; label?: string }
  | { type: 'create_task' }
  | { type: 'open_onboarding' }
  | { type: 'open_ai'; tab?: AiTab }
  | { type: 'focus_pending' }
  | { type: 'open_selected_task' };

export interface AssistantSelectedRun {
  id: string;
  title: string;
  status: RunStatus;
}

export interface AssistantContext {
  page: Page;
  totalRuns: number;
  pendingApprovalCount: number;
  agentCount: number;
  budgetWarningCount: number;
  selectedRun: AssistantSelectedRun | null;
}

export interface AssistantReply {
  text: string;
  actions?: AssistantAction[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  actions?: AssistantAction[];
}

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  page?: Page;
  tip: string;
}
