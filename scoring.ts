import { RESORTS } from './resorts';

type Resort = typeof RESORTS[number];
type Answers = Record<string, string | string[]>;

// Mínimo de resorts que deben sobrevivir al filtro de imprescindibles.
// Si quedan menos, se relaja (drop) el imprescindible más restrictivo hasta llegar a este número.
// El régimen de comidas NO entra aquí: es un filtro fijo que nunca se relaja.
const MIN_RESULTS = 3;

// Preguntas que suman puntos. El régimen no suma: ya es un filtro (sumaría lo mismo a todos).
// logistica_fauna tampoco: marca los mismos resorts que avistamiento_fauna y contaría doble.
const scoredQuestions = ['perfil_foodie', 'atmosfera_isla', 'experiencia_snorkel', 'avistamiento_fauna', 'tipo_animal', 'diseno_habitacion', 'tipo_traslado'];

// Respuestas "sin preferencia": no suman puntos ni cuentan en el máximo
// (si no, inflan el % de afinidad de todos los resorts por igual).
export const NO_PREFERENCE: Record<string, string[]> = {
  atmosfera_isla: ['D'],          // Nos da igual
  avistamiento_fauna: ['A', 'C'], // No especialmente / Nos gustaría, pero no decide el resort
  tipo_animal: ['D'],             // Nos da igual
  diseno_habitacion: ['C'],       // Nos gustan ambos estilos
  tipo_traslado: ['D'],           // Nos da igual
};

// Si la fauna grande se verá desde una isla local, no debe influir en qué resort se elige.
const faunaFromLocalIsland = (answers: Answers) => answers['logistica_fauna'] === 'A';

// ¿Esta pregunta cuenta para la afinidad con las respuestas dadas?
const counts = (qId: string, answers: Answers): boolean => {
  const answer = answers[qId];
  if (!answer || (Array.isArray(answer) && answer.length === 0)) return false;
  if (!Array.isArray(answer) && NO_PREFERENCE[qId]?.includes(answer)) return false;
  if ((qId === 'avistamiento_fauna' || qId === 'tipo_animal') && faunaFromLocalIsland(answers)) return false;
  // tipo_animal solo se pregunta si la fauna es prioridad (B)
  if (qId === 'tipo_animal' && answers['avistamiento_fauna'] !== 'B') return false;
  return true;
};

// Franja de precio (€=1 … €€€€=4). Sin dato: va detrás en los empates.
const franjaOf = (resort: Resort): number => {
  const f = (resort as any).franja;
  return typeof f === 'number' && f > 0 ? f : 99;
};

// Filtro fijo de régimen: solo resorts que ofrecen el régimen elegido.
const matchesBoard = (resort: Resort, answers: Answers): boolean => {
  const board = answers['nivel_despreocupacion'];
  if (!board || Array.isArray(board)) return true;
  const values: string[] = (resort as any)['nivel_despreocupacion'] || [];
  return values.includes(board);
};

// Comprueba si un resort cumple un criterio imprescindible concreto
const resortMeetsPriority = (resort: Resort, qId: string, answers: Answers) => {
  const userValue = answers[qId];
  if (!userValue) return true; // No respondida (oculta) → no filtra
  if (!Array.isArray(userValue) && NO_PREFERENCE[qId]?.includes(userValue)) return true;

  // Caso especial: si el imprescindible es ver fauna y además eligieron un animal concreto, filtrar por ese animal
  if (qId === 'avistamiento_fauna') {
    if (faunaFromLocalIsland(answers)) return true;
    if (answers['tipo_animal'] && answers['tipo_animal'] !== 'D') {
      const animalValue = answers['tipo_animal'];
      const resortAnimals = (resort as any)['tipo_animal'];
      if (resortAnimals && !resortAnimals.includes(animalValue)) return false;
    }
  }

  const resortValues = (resort as any)[qId];
  if (!resortValues) return true;

  if (Array.isArray(userValue)) {
    return userValue.some(val => resortValues.includes(val));
  }
  return resortValues.includes(userValue as string);
};

// Aplica un conjunto de imprescindibles como filtro duro sobre una lista base
const applyFilter = (base: Resort[], priorities: string[], answers: Answers) => {
  if (priorities.length === 0) return base;
  return base.filter(resort => priorities.every(qId => resortMeetsPriority(resort, qId, answers)));
};

// Puntúa y ordena: más afinidad primero; a igual afinidad, el más económico (franja) primero.
const scoreList = (list: Resort[], answers: Answers) => {
  const active = scoredQuestions.filter(q => counts(q, answers));
  const maxScore = active.length || 1; // evita división por cero

  const scored = list.map(resort => {
    let score = 0;
    const matches: Record<string, boolean> = {};

    active.forEach(qId => {
      const answer = answers[qId];
      const values: string[] = (resort as any)[qId] || [];
      matches[qId] = Array.isArray(answer) ? answer.some(val => values.includes(val)) : values.includes(answer as string);
      if (matches[qId]) score++;
    });

    // Sin ninguna pregunta que puntúe (todo "nos da igual"), todos encajan igual.
    const percentage = active.length === 0 ? 1 : score / maxScore;
    return { ...resort, score, percentage, matches };
  });

  scored.sort((a, b) => b.score - a.score || franjaOf(a) - franjaOf(b));
  return scored;
};

export type ScoredResort = ReturnType<typeof scoreList>[number];

export interface ScoringResult {
  resorts: ScoredResort[];
  isFallback: boolean;        // true si hubo que relajar algún imprescindible
  droppedCriteria: string[];  // qIds de los imprescindibles que no se pudieron cumplir
}

export const getScoredResorts = (answers: Answers): ScoringResult => {
  // 1) Régimen: filtro fijo, nunca se relaja.
  const base = RESORTS.filter(r => matchesBoard(r, answers));

  // 2) Imprescindibles elegidos por la pareja (el régimen ya no se elige aquí).
  const rawPriorities = answers['filtros_eliminatorios'];
  let activePriorities: string[] = (rawPriorities && Array.isArray(rawPriorities))
    ? rawPriorities.filter(p => p !== 'nivel_despreocupacion')
    : [];

  let filtered = applyFilter(base, activePriorities, answers);
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
      const trialResults = applyFilter(base, trial, answers);
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
