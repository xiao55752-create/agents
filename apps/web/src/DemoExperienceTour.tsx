import { useEffect, useRef, useState } from 'react';
import type { Page } from './architecture/types';
import { setAiPlatformTab } from './aiPlatform/store';
import {
  EXPERIENCE_TOUR_PROGRESS_GROUPS,
  EXPERIENCE_TOUR_STEPS,
  groupIndexForStep,
  isGroupComplete,
  markExperienceTourDone,
  stepIndexForGroup,
  subStepLabel,
  type ExperienceTourStep,
} from './demo/experienceTour';
import { markExperienceTourFinishedInProgress, syncExperienceProgressStep } from './demo/experienceProgress';
import { TourSpotlight } from './TourSpotlight';

interface DemoExperienceTourProps {
  pendingRunId: string | null;
  /** 演示待验收任务是否已通过 Gate */
  pendingRunApproved?: boolean;
  initialStepIndex?: number;
  onNavigate: (page: Page) => void;
  onFocusPendingRun: (runId: string) => void;
  onProgressUpdate?: () => void;
  onClose: () => void;
  onComplete: () => void;
}

export function DemoExperienceTour({
  pendingRunId,
  pendingRunApproved = false,
  initialStepIndex = 0,
  onNavigate,
  onFocusPendingRun,
  onProgressUpdate,
  onClose,
  onComplete,
}: DemoExperienceTourProps) {
  const [stepIndex, setStepIndex] = useState(initialStepIndex);
  const autoAdvancedRef = useRef(false);
  const step = EXPERIENCE_TOUR_STEPS[stepIndex]!;
  const isLast = stepIndex >= EXPERIENCE_TOUR_STEPS.length - 1;
  const isApprovalStep = step.id === 'approve-gate' || step.id === 'approve-list';
  const currentGroupIndex = groupIndexForStep(stepIndex);
  const stepSubLabel = subStepLabel(stepIndex);
  const spotlightSelector = step.spotlight ? `[data-tour="${step.spotlight}"]` : undefined;

  useEffect(() => {
    const start = Math.min(Math.max(initialStepIndex, 0), EXPERIENCE_TOUR_STEPS.length - 1);
    applyStep(EXPERIENCE_TOUR_STEPS[start]!);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 仅挂载时定位到起始步
  }, []);

  useEffect(() => {
    syncExperienceProgressStep(stepIndex);
    onProgressUpdate?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- 按 stepIndex 同步进度
  }, [stepIndex]);

  useEffect(() => {
    autoAdvancedRef.current = false;
  }, [stepIndex]);

  useEffect(() => {
    if (!pendingRunApproved || autoAdvancedRef.current) return;
    if (step.id !== 'approve-gate' && step.id !== 'approve-list') return;

    const agentsIndex = EXPERIENCE_TOUR_STEPS.findIndex((item) => item.id === 'agents');
    if (agentsIndex === -1 || stepIndex >= agentsIndex) return;

    const timer = window.setTimeout(() => {
      autoAdvancedRef.current = true;
      const target = EXPERIENCE_TOUR_STEPS[agentsIndex]!;
      applyStep(target);
      setStepIndex(agentsIndex);
    }, 1400);

    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- applyStep 依赖 props，按步骤 id 触发即可
  }, [pendingRunApproved, step.id, stepIndex]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        finish(false);
        return;
      }
      if (event.key === 'ArrowRight' && !event.shiftKey) {
        event.preventDefault();
        next();
        return;
      }
      if (event.key === 'ArrowLeft' || (event.key === 'ArrowRight' && event.shiftKey)) {
        event.preventDefault();
        if (stepIndex > 0) prev();
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- next/prev/finish 随 stepIndex 变化
  }, [stepIndex, isLast, pendingRunApproved, step.id]);

  function finish(showSummary: boolean) {
    if (showSummary) {
      markExperienceTourDone();
      markExperienceTourFinishedInProgress();
      onProgressUpdate?.();
    }
    onClose();
    if (showSummary) onComplete();
  }

  function applyStep(target: ExperienceTourStep) {
    if (target.aiTab) setAiPlatformTab(target.aiTab);
    onNavigate(target.page);
    if (target.focusPendingRun && pendingRunId && !pendingRunApproved) {
      onFocusPendingRun(pendingRunId);
    }
  }

  function goToStep(index: number) {
    if (index < 0 || index >= EXPERIENCE_TOUR_STEPS.length || index === stepIndex) return;
    const target = EXPERIENCE_TOUR_STEPS[index]!;
    applyStep(target);
    setStepIndex(index);
  }

  function goToGroup(groupIndex: number) {
    goToStep(stepIndexForGroup(groupIndex));
  }

  function next() {
    if (isLast) {
      applyStep(step);
      finish(true);
      return;
    }

    if (pendingRunApproved && isApprovalStep) {
      const agentsIndex = EXPERIENCE_TOUR_STEPS.findIndex((item) => item.id === 'agents');
      if (agentsIndex !== -1) {
        applyStep(EXPERIENCE_TOUR_STEPS[agentsIndex]!);
        setStepIndex(agentsIndex);
        return;
      }
    }

    const nextStep = EXPERIENCE_TOUR_STEPS[stepIndex + 1]!;
    applyStep(nextStep);
    setStepIndex((value) => value + 1);
  }

  function prev() {
    goToStep(stepIndex - 1);
  }

  function goNow() {
    applyStep(step);
  }

  return (
    <>
      <TourSpotlight selector={spotlightSelector} />
      <div className="experience-tour-backdrop">
        <div className="experience-tour-card" role="dialog" aria-label="5 分钟体验引导">
          <div className="experience-tour-progress" aria-label="体验阶段">
            {EXPERIENCE_TOUR_PROGRESS_GROUPS.map((group, index) => (
              <button
                key={group.id}
                type="button"
                className={`experience-tour-progress-item${isGroupComplete(index, stepIndex) ? ' is-done' : ''}${index === currentGroupIndex ? ' is-current' : ''}`}
                onClick={() => goToGroup(index)}
                aria-current={index === currentGroupIndex ? 'step' : undefined}
                aria-label={`${group.label}阶段`}
              >
                <span className={isGroupComplete(index, stepIndex) ? 'experience-tour-dot active' : 'experience-tour-dot'} />
                <span className="experience-tour-progress-label">{group.label}</span>
              </button>
            ))}
          </div>

          {step.moduleLabel ? (
            <span className="experience-tour-route">
              {step.moduleLabel}
              {stepSubLabel ? <em>{stepSubLabel}</em> : null}
            </span>
          ) : null}
          <span className="section-kicker">
            5 分钟体验 · 第 {currentGroupIndex + 1}/{EXPERIENCE_TOUR_PROGRESS_GROUPS.length} 阶段 · 步骤 {stepIndex + 1}/{EXPERIENCE_TOUR_STEPS.length}
          </span>
          <h2>{step.title}</h2>
          <p className="experience-tour-desc">{step.description}</p>
          {isApprovalStep && pendingRunApproved ? (
            <p className="experience-tour-success" role="status">
              验收已通过 · 1.4 秒后自动进入智能体配置
            </p>
          ) : null}
          <p className="experience-tour-tip">{step.tip}</p>
          <p className="experience-tour-keys">← → 切换步骤 · Esc 跳过</p>

          <div className="experience-tour-actions">
            <button type="button" className="btn btn-ghost" onClick={() => finish(false)}>
              跳过
            </button>
            {stepIndex > 0 ? (
              <button type="button" className="btn btn-ghost" onClick={prev}>
                上一步
              </button>
            ) : null}
            {step.page !== 'overview' || stepIndex > 0 ? (
              <button type="button" className="btn btn-ghost" onClick={goNow}>
                去这一步
              </button>
            ) : null}
            <button type="button" className="btn btn-primary" onClick={next}>
              {isLast ? '查看总结' : pendingRunApproved && isApprovalStep ? '立即前往智能体' : '下一步'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
