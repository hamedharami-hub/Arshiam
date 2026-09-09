export * from './types';
export * from './part1';
export * from './part2';
export * from './part3';
export * from './matcher';

import { ALL_OTC_HANDBOOK_DISEASES } from './matcher';
import { OTCDiseaseGuide } from './types';

export const OTC_DISEASES = ALL_OTC_HANDBOOK_DISEASES;
export type HandbookDisease = OTCDiseaseGuide;
