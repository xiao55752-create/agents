import { useState } from 'react';
import type { Page } from './architecture/types';
import { markOnboardingDone, ONBOARDING_STEPS } from './assistant/onboarding';

interface OnboardingGuideProps {
  onNavigate: (page: Page) => void;
  onClose: () => void;
}

export function OnboardingGuide({ onNavigate, onClose }: OnboardingGuideProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const step = ONBOARDING_STEPS[stepIndex]!;
  const isLast = stepIndex >= ONBOARDING_STEPS.length - 1;

  function finish() {
    markOnboardingDone();
    onClose();
  }

  function next() {
    if (isLast) {
      finish();
      return;
    }
    setStepIndex((value) => value + 1);
  }

  return (
    <div className="onboarding-backdrop" onClick={finish}>
      <div className="onboarding-modal" onClick={(e) => e.stopPropagation()}>
        <div className="onboarding-progress">
          {ONBOARDING_STEPS.map((item, index) => (
            <span key={item.id} className={index <= stepIndex ? 'onboarding-dot active' : 'onboarding-dot'} />
          ))}
        </div>

        <span className="section-kicker">新手引导 · {stepIndex + 1}/{ONBOARDING_STEPS.length}</span>
        <h2>{step.title}</h2>
        <p className="onboarding-desc">{step.description}</p>
        <p className="onboarding-tip">{step.tip}</p>

        <div className="onboarding-actions">
          <button type="button" className="btn btn-ghost" onClick={finish}>
            跳过
          </button>
          {step.page && (
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => {
                onNavigate(step.page!);
                next();
              }}
            >
              去体验一下
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={next}>
            {isLast ? '开始使用' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  );
}
