const PRESENTATION_MODE_KEY = 'agentos_presentation_mode';

export function isPresentationMode(): boolean {
  return localStorage.getItem(PRESENTATION_MODE_KEY) === '1';
}

export function setPresentationMode(enabled: boolean) {
  if (enabled) {
    localStorage.setItem(PRESENTATION_MODE_KEY, '1');
  } else {
    localStorage.removeItem(PRESENTATION_MODE_KEY);
  }
}

export function togglePresentationMode(): boolean {
  const next = !isPresentationMode();
  setPresentationMode(next);
  return next;
}

export async function enterPresentationFullscreen(): Promise<boolean> {
  if (!document.documentElement.requestFullscreen) return false;
  if (document.fullscreenElement) return true;
  try {
    await document.documentElement.requestFullscreen();
    return true;
  } catch {
    return false;
  }
}

export async function exitPresentationFullscreen(): Promise<void> {
  if (!document.fullscreenElement) return;
  try {
    await document.exitFullscreen();
  } catch {
    // ignore — browser may block exit
  }
}
