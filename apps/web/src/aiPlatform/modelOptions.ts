import { MODEL_OPTIONS } from '../agentConfig';
import { getFineTunedModels } from './store';

export function listModelSelectOptions(): Array<{ value: string; label: string }> {
  const fineTuned = getFineTunedModels().map((model) => ({
    value: model.modelId,
    label: `${model.name}（微调）`,
  }));
  const seen = new Set(fineTuned.map((item) => item.value));
  const base = MODEL_OPTIONS.filter((item) => !seen.has(item.value));
  return [...fineTuned, ...base];
}
