import {
  EXPERIENCE_TOUR_PROGRESS_GROUPS,
  EXPERIENCE_TOUR_STEPS,
  resetExperienceTourDone,
} from './experienceTour';

const PROGRESS_KEY = 'agentos_experience_progress';

export interface ExperienceProgressState {
  completedGroups: string[];
  lastStepIndex: number;
  tourFinished: boolean;
  startedAt?: string;
}

export interface ExperienceProgressSummary {
  completed: number;
  total: number;
  approveComplete: boolean;
  tourFinished: boolean;
  lastStepIndex: number;
  /** 验收完成后在 Hero 显示进度徽章 */
  showBadge: boolean;
}

export function readExperienceProgress(): ExperienceProgressState | null {
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as ExperienceProgressState;
  } catch {
    return null;
  }
}

function writeExperienceProgress(state: ExperienceProgressState) {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(state));
}

export function resetExperienceProgress() {
  localStorage.removeItem(PROGRESS_KEY);
  resetExperienceTourDone();
}

export function initExperienceProgress() {
  writeExperienceProgress({
    completedGroups: [],
    lastStepIndex: 0,
    tourFinished: false,
    startedAt: new Date().toISOString(),
  });
}

export function markExperienceGroupComplete(groupId: string) {
  const current = readExperienceProgress();
  if (!current) return;
  if (current.completedGroups.includes(groupId)) return;
  writeExperienceProgress({
    ...current,
    completedGroups: [...current.completedGroups, groupId],
  });
}

export function syncExperienceProgressStep(stepIndex: number) {
  const current = readExperienceProgress();
  if (!current) return;

  const passedGroups = EXPERIENCE_TOUR_PROGRESS_GROUPS.filter((group) => {
    const lastStepId = group.stepIds[group.stepIds.length - 1];
    const lastIndex = EXPERIENCE_TOUR_STEPS.findIndex((step) => step.id === lastStepId);
    return lastIndex !== -1 && stepIndex > lastIndex;
  }).map((group) => group.id);

  writeExperienceProgress({
    ...current,
    lastStepIndex: stepIndex,
    completedGroups: [...new Set([...current.completedGroups, ...passedGroups])],
  });
}

export function markExperienceTourFinishedInProgress() {
  const current = readExperienceProgress();
  if (!current) return;
  writeExperienceProgress({
    ...current,
    tourFinished: true,
    lastStepIndex: EXPERIENCE_TOUR_STEPS.length - 1,
    completedGroups: EXPERIENCE_TOUR_PROGRESS_GROUPS.map((group) => group.id),
  });
}

export function summarizeExperienceProgress(state: ExperienceProgressState | null): ExperienceProgressSummary | null {
  if (!state) return null;
  const total = EXPERIENCE_TOUR_PROGRESS_GROUPS.length;
  const completed = state.completedGroups.length;
  const approveComplete = state.completedGroups.includes('approve');
  return {
    completed,
    total,
    approveComplete,
    tourFinished: state.tourFinished,
    lastStepIndex: state.lastStepIndex,
    showBadge: approveComplete || state.tourFinished,
  };
}
