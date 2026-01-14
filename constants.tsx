
import { EvaluationCategory } from './types';

export const EVALUATION_CATEGORIES: EvaluationCategory[] = [
  { id: 'pttc', name: 'PTTC', targets: ['MT...', 'MT...', 'MT...', 'MT...', 'MT...'] },
  { id: 'ptnt', name: 'PTNT', targets: ['MT...', 'MT...', 'MT...', 'MT...', 'MT...'] },
  { id: 'ptnn', name: 'PTNN', targets: ['MT...', 'MT...', 'MT...', 'MT...', 'MT...'] },
  { id: 'tcknxh', name: 'TC, KN, XH', targets: ['MT...', 'MT...', 'MT...', 'MT...', 'MT...'] },
  { id: 'pttm', name: 'PTTM', targets: ['MT...', 'MT...', 'MT...', 'MT...', 'MT...'] },
];

export const ALL_TARGETS_INITIAL = EVALUATION_CATEGORIES.flatMap(cat => 
  cat.targets.map((t, i) => `${cat.id}_${i}`)
);
