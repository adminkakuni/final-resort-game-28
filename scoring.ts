import { RESORTS } from './resorts';

type Resort = typeof RESORTS[number];

// Mínimo de resorts que deben sobrevivir al filtro de imprescindibles.
// Si quedan menos, se relaja (drop) el criterio más restrictivo hasta llegar a este número.
const MIN_RESULTS = 3;

const scoredQuestions = ['nivel_despreocupacion', 'perfil_foodie', 'atmosfera_isla', 'experiencia_snorkel', 'avistamiento_fauna', 'logistica_fauna', 'tipo_animal', 'diseno_habitacion', 'tipo_traslado'];

// Comprueba si un resort cumple un criterio imprescindible concreto
const resortMeetsPriority = (resort: Resort, qId: string, answers: Record<string, string | string[]>) => {
  const userValue = answers[qId];
  if (!userValue) return true; // No respondida (oculta) → no filtra

  // Caso especial: si el imprescindible es ver fauna y además eligieron un animal concreto, filtrar por ese animal
  if (qId === 'avistamiento_fauna' && answers['tipo_animal'] && answers['tipo_animal'] !== 'D') {
    const animalValue = answers['tipo_animal'];
    const resortAnimals = (resort as any)['tipo_animal'];
    if (resortAnimals && !resortAnimals.includes(animalValue)) return false;
  }

  const resortValues = (resort as any)[qId];
  if (!resortValues) return true;

  if (Array.isArray(userValue)) {
    return userValue.some(val => resortValues.includes(val));
  }
  return resortValues.includes(userValue as string);
};

// Aplica un conjunto de imprescindibles como filtro duro
const applyFilter = (priorities: string[], answers: Record<string, string | string[]>) => {
  if (priorities.length === 0) return RESORTS;
  return RESORTS.filter(resort => priorities.every(qId => resortMeetsPriority(resort, qId, answers)));
};

// Puntúa y ordena una lista de resorts según las preferencias (no eliminatorias)
const scoreList = (list: Resort[], answers: Record<string, string | string[]>) => {
  const maxScore = scoredQuestions.filter(q => {
    if (!answers[q]) return false;
    if (Array.isArray(answers[q]) && (answers[q] as string[]).length === 0) return false;
    if ((q === 'tipo_traslado' || q === 'tipo_animal') && answers[q] === 'D') return false;
    return true;
  }).length || 1; // evita división por cero

  const scored = list.map(resort => {
    let score = 0;
    const matches: Record<string, boolean> = {};

    scoredQuestions.forEach(qId => {
      const answer = answers[qId];
      if (!answer) return;

      if (Array.isArray(answer)) {
        matches[qId] = answer.some(val => (resort as any)[qId]?.includes(val));
      } else {
        matches[qId] = (resort as any)[qId]?.includes(answer);
      }

      if (matches[qId]) {
        if ((qId === 'tipo_traslado' || qId === 'tipo_animal') && answer === 'D') return;
        score++;
      }
    });

    const percentage = score / maxScore;
    return { ...resort, score, percentage, matches };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored;
};

export type ScoredResort = ReturnType<typeof scoreList>[number];

export interface ScoringResult {
  resorts: ScoredResort[];
  isFallback: boolean;        // true si hubo que relajar algún imprescindible
  droppedCriteria: string[];  // qIds de los imprescindibles que no se pudieron cumplir
}

export const getScoredResorts = (answers: Record<string, string | string[]>): ScoringResult => {
  const rawPriorities = answers['filtros_eliminatorios'];
  let activePriorities: string[] = (rawPriorities && Array.isArray(rawPriorities)) ? [...rawPriorities] : [];

  let filtered = applyFilter(activePriorities, answers);
  let isFallback = false;
  const droppedCriteria: string[] = [];

  // Relajado progresivo: mientras queden menos de MIN_RESULTS y haya imprescindibles que soltar,
  // quitamos el criterio MÁS restrictivo (el que, al quitarlo, deja más resorts).
  while (filtered.length < MIN_RESULTS && activePriorities.length > 0) {
    let bestTrial: string[] = activePriorities;
    let bestResults: Resort[] = filtered;
    let bestCount = -1;
    let removedCriterion = activePriorities[activePriorities.length - 1];

    for (let i = 0; i < activePriorities.length; i++) {
      const trial = activePriorities.filter((_, idx) => idx !== i);
      const trialResults = applyFilter(trial, answers);
      if (trialResults.length > bestCount) {
        bestCount = trialResults.length;
        bestTrial = trial;
        bestResults = trialResults;
        removedCriterion = activePriorities[i];
      }
    }

    droppedCriteria.push(removedCriterion);
    activePriorities = bestTrial;
    filtered = bestResults;
    isFallback = true;
  }

  return {
    resorts: scoreList(filtered, answers),
    isFallback,
    droppedCriteria,
  };
};
