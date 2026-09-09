import { Scenario, ConversationMode, WwhamQuestion, DialogueOption } from './types';
import { ADMIN_SCENARIOS } from './adminScenarios';
import { SLANG_SCENARIOS } from './slangScenarios';
import { CLINICAL_SCENARIOS } from './clinicalScenarios';

export type { Scenario, ConversationMode, WwhamQuestion, DialogueOption };
export { ADMIN_SCENARIOS } from './adminScenarios';
export { SLANG_SCENARIOS } from './slangScenarios';
export { CLINICAL_SCENARIOS } from './clinicalScenarios';

export const OTC_SCENARIOS: Scenario[] = [
  ...ADMIN_SCENARIOS,
  ...SLANG_SCENARIOS,
  ...CLINICAL_SCENARIOS,
];
