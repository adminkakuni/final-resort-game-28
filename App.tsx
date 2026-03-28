import React, { useState, useEffect, useRef } from 'react';
import { STEPS, WEBHOOK_URL_CONTACT, WEBHOOK_URL_RESULTS, PRIVACY_URL } from './constants';
import { QuizState, ContactInfo, Recommendation, StepType } from './types';
import { Button } from './components/Button';
import { OptionCard } from './components/OptionCard';
import { ProgressBar } from './components/ProgressBar';
import { ArrowLeft, Check, AlertCircle, ExternalLink } from 'lucide-react';
import { RESORTS } from './resorts';
import { isValidPhoneNumber } from 'libphonenumber-js';
import Markdown from 'react-markdown';

const STORAGE_KEY = 'maldives_quiz_state';

// Generate a simple session ID
const generateSessionId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 15);
};

// Calculate scored resorts
const getScoredResorts = (answers: Record<string, string | string[]>) => {
  let filtered = RESORTS;

  // 1. Filter by eliminatory questions
  
  // Priorities (q_priorities) - Eliminatory
  if (answers['q_priorities'] && Array.isArray(answers['q_priorities']) && answers['q_priorities'].length > 0) {
    const selectedPriorities = answers['q_priorities'] as string[];
    filtered = filtered.filter(resort => {
      return selectedPriorities.every(qId => {
        const userValue = answers[qId];
        if (!userValue) return true; // If they didn't answer it (hidden), it's not a filter
        
        // Special case for q4 priority: if q4.2 was answered, filter by q4.2 too
        if (qId === 'q4' && answers['q4.2']) {
          const animalValue = answers['q4.2'];
          const resortAnimals = (resort as any)['q4.2'];
          if (resortAnimals && !resortAnimals.includes(animalValue)) return false;
        }

        const resortValues = (resort as any)[qId];
        if (!resortValues) return true;

        if (Array.isArray(userValue)) {
          return userValue.some(val => resortValues.includes(val));
        }
        return resortValues.includes(userValue as string);
      });
    });
  }

  // 2. Score the rest
  const scoredQuestions = ['q_despreocupacion', 'q5', 'q1', 'q3', 'q4', 'q4.1', 'q4.2', 'q9', 'q11'];
  const maxScore = scoredQuestions.filter(q => {
    if (!answers[q]) return false;
    if (Array.isArray(answers[q]) && (answers[q] as string[]).length === 0) return false;
    if (q === 'q11' && answers[q] === 'D') return false;
    return true;
  }).length || 1; // avoid division by zero

  const scored = filtered.map(resort => {
    let score = 0;
    const matches: Record<string, boolean> = {};

    scoredQuestions.forEach(qId => {
      const answer = answers[qId];
      if (!answer) return;

      if (Array.isArray(answer)) {
        // For multi-select (if any scored question becomes multi-select in the future)
        matches[qId] = answer.some(val => (resort as any)[qId]?.includes(val));
      } else {
        matches[qId] = (resort as any)[qId]?.includes(answer);
      }

      if (matches[qId]) {
        // Special case for q11 'D' which is not scored
        if (qId === 'q11' && answer === 'D') return;
        score++;
      }
    });
    
    const percentage = score / maxScore;
    return { ...resort, score, percentage, matches };
  });

  // 3. Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  return scored;
};

const getQuestionTitle = (qId: string) => {
  for (const step of STEPS) {
    const q = step.questions?.find(q => q.id === qId);
    if (q) return q.title.replace(/\*\*|\*/g, '');
  }
  return qId;
};

const getOptionLabel = (qId: string, optId: string | string[]) => {
  if (Array.isArray(optId)) {
    return optId.map(id => getOptionLabel(qId, id)).join(', ');
  }
  for (const step of STEPS) {
    const q = step.questions?.find(q => q.id === qId);
    if (q) {
      const opt = q.options.find(o => o.id === optId);
      return opt ? opt.label : optId;
    }
  }
  return optId;
};

// Initial State
const initialState: QuizState = {
  stepIndex: 0,
  answers: {},
  contact: { name: '', email: '', phone: '+34 ', comments: '', privacyAccepted: false },
  isSubmitting: false,
  results: null,
  error: null,
  hasFinished: false
};

export default function App() {
  const [state, setState] = useState<QuizState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const sessionIdRef = useRef<string>(generateSessionId());
  const utmRef = useRef<Record<string, string>>({});

  // Load state and captured UTMs on mount
  useEffect(() => {
    // Capture UTMs
    const params = new URLSearchParams(window.location.search);
    const utms: Record<string, string> = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'].forEach(key => {
      if (params.has(key)) utms[key] = params.get(key) || '';
    });
    utmRef.current = utms;

    // Load from LocalStorage
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure we don't start on a finished state if they refresh
        if (parsed.hasFinished) {
            // Keep results if finished
             setState(parsed);
        } else {
            setState(prev => ({ ...prev, ...parsed, isSubmitting: false, error: null }));
        }
      } catch (e) {
        console.error("Failed to load state", e);
      }
    }
    setIsLoading(false);
  }, []);

  // Persist state
  useEffect(() => {
    if (!isLoading) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }
  }, [state, isLoading]);

  const currentStepConfig = STEPS[state.stepIndex];
  
  const isQuestionVisible = (qId: string): boolean => {
    const q = currentStepConfig.questions?.find(x => x.id === qId);
    if (!q) return true; // If not in current step, assume it was visible in a previous step
    if (!q.dependsOn) return true;
    if (state.answers[q.dependsOn.questionId] !== q.dependsOn.optionId) return false;
    return isQuestionVisible(q.dependsOn.questionId);
  };

  const visibleQuestions = currentStepConfig.questions?.filter(q => isQuestionVisible(q.id));

  // Helper to get total visible steps (approximate for UI)
  const totalSteps = STEPS.length - 1; // Excluding Intro

  // Scroll to top on step change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [state.stepIndex]);

  const handleOptionSelect = (questionId: string, optionId: string) => {
    setValidationError(null); // Clear validation error on interaction
    
    // Find the question to check if it's multi-select
    let isMulti = false;
    for (const step of STEPS) {
      const q = step.questions?.find(q => q.id === questionId);
      if (q) {
        isMulti = !!q.isMultiSelect;
        break;
      }
    }

    setState(prev => {
      const currentAnswers = { ...prev.answers };
      
      if (isMulti) {
        const currentArr = (currentAnswers[questionId] as string[]) || [];
        if (currentArr.includes(optionId)) {
          currentAnswers[questionId] = currentArr.filter(id => id !== optionId);
        } else {
          currentAnswers[questionId] = [...currentArr, optionId];
        }
      } else {
        currentAnswers[questionId] = optionId;
      }
      
      return {
        ...prev,
        answers: currentAnswers
      };
    });
  };

  const handleNext = async () => {
    setValidationError(null);

    // Validation for Contact Step
    if (currentStepConfig.type === StepType.CONTACT) {
      if (!state.contact.name || !state.contact.email || !state.contact.phone || !state.contact.privacyAccepted) {
        setValidationError("Por favor, completa todos los campos obligatorios y acepta la política de privacidad.");
        return;
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(state.contact.email)) {
        setValidationError("Por favor, introduce una dirección de correo electrónico válida.");
        return;
      }

      if (!isValidPhoneNumber(state.contact.phone)) {
        setValidationError("Por favor, introduce un número de teléfono válido con su prefijo internacional (ej. +34).");
        return;
      }

      setState(prev => ({ ...prev, isSubmitting: true, error: null }));

      const payload = {
        session_id: sessionIdRef.current,
        timestamp: new Date().toISOString(),
        ...utmRef.current,
        contact: state.contact,
        is_partial: true // Indicate this is the initial contact submission
      };

      try {
        if (!WEBHOOK_URL_CONTACT.includes("example.com")) {
          await fetch(WEBHOOK_URL_CONTACT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
        setState(prev => ({ ...prev, isSubmitting: false, stepIndex: prev.stepIndex + 1 }));
      } catch (err) {
        console.error(err);
        setState(prev => ({ 
          ...prev, 
          isSubmitting: false, 
          error: "Hubo un error al enviar tus datos. Por favor, inténtalo de nuevo." 
        }));
      }
      return;
    }

    let currentAnswers = { ...state.answers };

    // Validation for Questions
    if (currentStepConfig.type === StepType.QUESTIONS && visibleQuestions) {
      const missing = visibleQuestions.some(q => {
        // q_priorities is optional (user can choose not to have any eliminatory filter)
        if (q.id === 'q_priorities') return false;
        
        const answer = currentAnswers[q.id];
        if (!answer) return true;
        if (Array.isArray(answer) && answer.length === 0) return true;
        
        const visibleOptions = q.options.filter(opt => {
          if (!opt.hiddenIf) return true;
          const hiddenIfAnswer = currentAnswers[opt.hiddenIf.questionId];
          if (Array.isArray(hiddenIfAnswer)) {
            return !opt.hiddenIf.optionIds.some(id => hiddenIfAnswer.includes(id));
          }
          return !opt.hiddenIf.optionIds.includes(hiddenIfAnswer as string);
        });
        
        if (Array.isArray(answer)) {
          return !answer.every(val => visibleOptions.some(opt => opt.id === val));
        }
        return !visibleOptions.some(opt => opt.id === answer);
      });
      
      if (missing) {
        setValidationError("Por favor, selecciona una opción para todas las preguntas antes de continuar.");
        return;
      }

      // Clean up answers for hidden questions in the current step
      currentStepConfig.questions?.forEach(q => {
        if (!visibleQuestions.find(vq => vq.id === q.id)) {
          delete currentAnswers[q.id];
        }
      });
    }

    // If the next step is RESULTS, we need to send the final webhook
    if (STEPS[state.stepIndex + 1]?.type === StepType.RESULTS) {
      setState(prev => ({ ...prev, answers: currentAnswers, isSubmitting: true, error: null }));

      const scoredResorts = getScoredResorts(currentAnswers);
      const recommendedResorts = scoredResorts
        .filter(r => r.percentage >= 0.8)
        .map(r => ({
          name: r.name,
          match_percentage: Math.round(r.percentage * 100)
        }));

      const payload = {
        session_id: sessionIdRef.current,
        timestamp: new Date().toISOString(),
        ...utmRef.current,
        answers: currentAnswers,
        contact: state.contact,
        recommended_resorts: recommendedResorts,
        is_final: true
      };

      try {
        if (!WEBHOOK_URL_RESULTS.includes("example.com")) {
            const res = await fetch(WEBHOOK_URL_RESULTS, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(payload)
            });
            if (!res.ok) {
              console.warn('El webhook devolvió un error:', res.status);
            }
        } else {
            await new Promise(resolve => setTimeout(resolve, 1500)); // Fake delay
        }
      } catch (err) {
        console.error("Error al enviar el webhook:", err);
      } finally {
        setState(prev => ({ 
          ...prev, 
          answers: currentAnswers,
          isSubmitting: false, 
          stepIndex: prev.stepIndex + 1 // Move to RESULTS step
        }));
      }
      return;
    }

    setState(prev => ({ ...prev, answers: currentAnswers, stepIndex: prev.stepIndex + 1 }));
  };

  const handleBack = () => {
    if (state.stepIndex === 0) return;

    setState(prev => ({ ...prev, stepIndex: prev.stepIndex - 1 }));
  };

  const handleContactChange = (field: keyof ContactInfo, value: string | boolean) => {
    setState(prev => ({
      ...prev,
      contact: { ...prev.contact, [field]: value }
    }));
  };

  // ---------------- RENDERERS ----------------

  if (isLoading) return null;

  // LOADING SCREEN (Submitting)
  if (state.isSubmitting) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-16 h-16 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-6"></div>
        <h2 className="font-serif text-2xl text-gray-800 animate-pulse">Analizando vuestro perfil...</h2>
      </div>
    );
  }

  // INTRO SCREEN
  if (currentStepConfig.type === StepType.INTRO) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-beige-100">
        <div className="max-w-2xl text-center space-y-8 animate-fade-in-up">
            <div className="space-y-4">
                <span className="text-xs font-bold tracking-widest uppercase text-gray-500">Quiz de Viaje</span>
                <h1 className="font-serif text-4xl md:text-6xl text-gray-900 leading-tight">
                    Encuentra vuestro resort ideal
                </h1>
            </div>
            
            <div className="space-y-6 text-lg text-gray-700 leading-relaxed max-w-xl mx-auto">
                <p>
                    Maldivas tiene más de 170 resorts… y el problema es que todos parecen iguales en las fotos.
                </p>
                <p>
                    Olvidad las horas comparando en Booking. Responded a este Quiz Visual de 2 minutos (con vídeos de ayuda) para que analicemos vuestro perfil de viajeros.
                </p>
                <div className="bg-white/50 p-6 rounded-xl border border-gray-200">
                    <p className="font-medium text-gray-900">
                        🎯 El Objetivo: Filtrar el ruido y encontrar los 3 Únicos Resorts que realmente encajan con vuestro estilo.
                    </p>
                </div>
            </div>

            <div className="pt-4">
                <Button onClick={handleNext} className="text-lg px-12 py-4">
                    EMPEZAR EL JUEGO →
                </Button>
            </div>
        </div>
      </div>
    );
  }

  // STANDARD WRAPPER FOR QUESTIONS & CONTACT
  return (
    <div className="min-h-screen bg-beige-100 flex flex-col relative">
      <ProgressBar currentStep={state.stepIndex} totalSteps={totalSteps} />
      
      <div className="flex-1 w-full max-w-4xl mx-auto px-6 py-20 md:py-24 flex flex-col justify-center">
        
        {/* Back Button */}
        <button 
          onClick={handleBack}
          className="absolute top-20 left-6 md:left-auto md:-ml-16 p-2 text-gray-400 hover:text-gray-900 transition-colors"
          aria-label="Volver atrás"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="animate-fade-in space-y-10">
          
          {/* Section Title */}
          {currentStepConfig.title && (
            <div className="border-b border-gray-300 pb-4 mb-8">
               <h2 className="text-sm font-bold tracking-widest text-gray-500 uppercase">{currentStepConfig.title}</h2>
            </div>
          )}

          {/* YouTube Embed */}
          {currentStepConfig.youtubeId && (
            <div className="rounded-2xl overflow-hidden shadow-lg aspect-video w-full mb-8 bg-black">
                <iframe 
                    width="100%" 
                    height="100%" 
                    src={currentStepConfig.youtubeId} 
                    title="YouTube video player" 
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                    allowFullScreen
                    className="w-full h-full"
                ></iframe>
            </div>
          )}

          {/* QUESTION LIST RENDERER */}
          {currentStepConfig.type === StepType.QUESTIONS && (
            <div className="space-y-12">
              {/* BANNER ACOMPAÑAMIENTO */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-start gap-4 shadow-sm">
                <ExternalLink className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 text-lg">Catálogo de Resorts Recomendados</h4>
                  <p className="text-blue-800 mt-1 leading-relaxed">
                    ¿Quieres inspirarte mientras respondes? Abre nuestra <a href="https://nueva.kakunitravels.com/resorts-recomendados-maldivas/" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-blue-900 transition-colors">lista de resorts con filtros</a> en otra pestaña para acompañar tus decisiones.
                  </p>
                </div>
              </div>

              {visibleQuestions?.map((q) => {
                const visibleOptions = q.options.filter(opt => {
                  if (q.id === 'q_priorities') {
                    const ans = state.answers[opt.id];
                    // Rule 1: Perfil Foodie (q5) - Hide if not answered
                    if (opt.id === 'q5' && !ans) return false;
                    // Rule 2: Fauna grande (q4) - Hide if "No especialmente" (A) OR if they chose to see it from a local island (q4.1 === 'A')
                    if (opt.id === 'q4') {
                      if (ans === 'A') return false;
                      if (state.answers['q4.1'] === 'A') return false;
                    }
                    // Rule 3: Diseño (q9) - Hide if "Nos gustan ambos estilos" (C)
                    if (opt.id === 'q9' && ans === 'C') return false;
                    // Rule 4: Traslado (q11) - Hide if "Nos da igual" (D)
                    if (opt.id === 'q11' && ans === 'D') return false;
                    // General rule: If a question wasn't answered (e.g. hidden), don't show it as a priority option
                    if (opt.id !== 'q_despreocupacion' && !ans) return false;
                  }

                  if (!opt.hiddenIf) return true;
                  const answer = state.answers[opt.hiddenIf.questionId];
                  if (Array.isArray(answer)) {
                    return !opt.hiddenIf.optionIds.some(id => answer.includes(id));
                  }
                  return !opt.hiddenIf.optionIds.includes(answer as string);
                });

                return (
                <div key={q.id} className="space-y-6">
                  <div className="space-y-2">
                    <h3 className="font-serif text-2xl font-medium text-gray-900">{q.title}</h3>
                    {q.isMultiSelect && (
                      <p className="text-sm text-gray-500 italic">Podéis seleccionar varias opciones.</p>
                    )}
                    {q.text && (
                      <div className="text-gray-600 leading-relaxed prose prose-sm max-w-none">
                        <Markdown>{q.text}</Markdown>
                      </div>
                    )}
                    
                    {q.warningBox && (
                      <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 shadow-sm flex items-start gap-3">
                        <div className="text-amber-800 leading-relaxed text-sm font-medium prose prose-amber prose-sm max-w-none">
                          <Markdown>{q.warningBox}</Markdown>
                        </div>
                      </div>
                    )}

                    {q.infoBox && (
                      <div className="mt-4 bg-slate-50 border border-slate-200 rounded-xl p-5 shadow-sm">
                        <h4 className="font-medium text-slate-900 text-lg mb-2">{q.infoBox.title}</h4>
                        <div className="text-slate-700 leading-relaxed text-sm prose prose-slate prose-sm max-w-none">
                          <Markdown>{q.infoBox.text}</Markdown>
                        </div>
                      </div>
                    )}

                    {/* Specific link for 4.1 */}
                    {q.id === 'q4.1' && (
                      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-start gap-4 shadow-sm">
                        <ExternalLink className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-blue-900 text-lg">¿Dudas sobre combinar Isla Local y Resort?</h4>
                          <p className="text-blue-800 mt-1 leading-relaxed">
                            Descubre cómo funciona esta experiencia y mira ejemplos reales en nuestra <a href="https://nueva.kakunitravels.com/combo-isla-local-y-resort-maldivas-parejas/" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-blue-900 transition-colors">guía de isla local y resort</a>.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className={`grid gap-4 ${visibleOptions.some(o => o.imageUrl) ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-1'}`}>
                    {visibleOptions.map((opt) => {
                      const hasImages = visibleOptions.some(o => o.imageUrl);
                      const isImageLessInImageGrid = hasImages && !opt.imageUrl;
                      
                      const answer = state.answers[opt.id];
                      let answerLabel = answer ? getOptionLabel(opt.id, answer) : 'No respondido';
                      
                      // Custom label for Fauna: show the specific animal if selected from resort
                      if (q.id === 'q_priorities' && opt.id === 'q4' && state.answers['q4.2']) {
                        answerLabel = getOptionLabel('q4.2', state.answers['q4.2']);
                      }
                      
                      const label = q.id === 'q_priorities' ? `${opt.label}: ${answerLabel}` : opt.label;
                      
                      return (
                        <OptionCard
                          key={opt.id}
                          id={opt.id}
                          label={label}
                          description={opt.description}
                          imageUrl={opt.imageUrl}
                          selected={
                            q.isMultiSelect 
                              ? ((state.answers[q.id] as string[]) || []).includes(opt.id)
                              : state.answers[q.id] === opt.id
                          }
                          onClick={() => handleOptionSelect(q.id, opt.id)}
                          isImageLessInImageGrid={isImageLessInImageGrid}
                          isHighlighted={opt.isHighlighted}
                        />
                      );
                    })}
                  </div>
                </div>
                );
              })}
            </div>
          )}

          {/* RESULTS RENDERER */}
          {currentStepConfig.type === StepType.COMMENTS && (
            <div className="space-y-8">
                <div className="space-y-4">
                    <h3 className="font-serif text-3xl font-medium text-gray-900">¿Alguna petición especial?</h3>
                    <p className="text-gray-600">Déjanos cualquier comentario adicional que debamos tener en cuenta para tu viaje.</p>
                </div>
                
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Comentarios (Opcional)</label>
                        <textarea 
                            className="w-full p-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition resize-none"
                            placeholder="Ej: Es nuestra luna de miel, mi pareja es celíaca, nuestro presupuesto máximo es X..."
                            rows={5}
                            value={state.contact.comments || ''}
                            onChange={(e) => handleContactChange('comments', e.target.value)}
                        />
                    </div>
                </div>
            </div>
          )}

          {currentStepConfig.type === StepType.RESULTS && (() => {
            const scoredResorts = getScoredResorts(state.answers);
            const perfectMatches = scoredResorts.filter(r => r.percentage === 1).length;
            const highMatches = scoredResorts.filter(r => r.percentage >= 0.7 && r.percentage < 1).length;

            return (
              <div className="space-y-8">
                <div className="space-y-4 text-center">
                  <h3 className="font-serif text-3xl font-medium text-gray-900">¡Tenemos tus opciones ideales!</h3>
                  <p className="text-gray-600 text-lg">
                    De los más de 170 resorts que existen en Maldivas, hemos analizado tus respuestas para ahorrarte horas de búsqueda y dolores de cabeza. 
                    {perfectMatches > 0 ? (
                      <>
                        Ya tenemos <span className="font-bold text-gray-900">{perfectMatches}</span> {perfectMatches === 1 ? 'opción' : 'opciones'} con un 100% de coincidencia y <span className="font-bold text-gray-900">{highMatches}</span> {highMatches === 1 ? 'opción' : 'opciones'} con más del 70% de coincidencia para tu viaje.
                      </>
                    ) : (
                      <>
                        Ya tenemos <span className="font-bold text-gray-900">{highMatches}</span> {highMatches === 1 ? 'opción' : 'opciones'} con más del 70% de coincidencia para tu viaje.
                      </>
                    )}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-8 text-center space-y-8 shadow-sm">
                  <p className="text-blue-900 text-lg leading-relaxed">
                    Para ver los resultados escríbenos por WhatsApp. Si quieres saber precios exactos para todo tu viaje, empieza vuestro viaje.
                  </p>
                  
                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <a 
                      href={`https://wa.me/34600000000?text=Hola,%20he%20completado%20el%20test%20de%20resorts%20y%20me%20gustaría%20ver%20mis%20resultados.%20Mi%20email%20es:%20${encodeURIComponent(state.contact.email)}`}
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20bd5a] text-white px-6 py-3.5 rounded-xl font-medium transition-colors shadow-sm"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Escríbenos por WhatsApp
                    </a>
                    <a 
                      href="https://kakunitravels.com/empezar-viaje/"
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white px-6 py-3.5 rounded-xl font-medium transition-colors shadow-sm"
                    >
                      Empieza vuestro viaje
                      <ExternalLink className="w-5 h-5" />
                    </a>
                  </div>
                </div>

                {/* MODO PRUEBA: Mostrar resultados */}
                <div className="mt-12 p-6 bg-gray-100 rounded-xl border border-gray-300 text-left">
                  <h4 className="font-bold text-gray-800 mb-4">🛠 MODO PRUEBA: Resultados del algoritmo</h4>
                  <div className="space-y-4">
                    {scoredResorts.slice(0, 10).map((r, i) => (
                      <div key={r.id} className="bg-white p-4 rounded shadow-sm">
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-bold text-lg">{i + 1}. {r.name}</span>
                          <span className={`font-bold text-lg ${r.percentage >= 0.8 ? 'text-green-600' : 'text-orange-500'}`}>
                            {Math.round(r.percentage * 100)}% match
                          </span>
                        </div>
                        <div className="text-sm text-gray-600 space-y-1">
                          {state.answers['q_priorities'] && (
                            <div className="text-blue-600 font-medium">
                              📌 Prioridades (Bloqueantes): {(state.answers['q_priorities'] as string[]).map(qId => {
                                let label = getOptionLabel('q_priorities', qId);
                                if (qId === 'q4' && state.answers['q4.2']) {
                                  label += ` (${getOptionLabel('q4.2', state.answers['q4.2'])})`;
                                }
                                return label;
                              }).join(', ')}
                            </div>
                          )}
                          {Object.entries(r.matches).map(([qId, isMatch]) => {
                            let displayAnswer = getOptionLabel(qId, state.answers[qId]);
                            if (qId === 'q4' && state.answers['q4.2']) {
                              displayAnswer = getOptionLabel('q4.2', state.answers['q4.2']);
                            }
                            return (
                              <div key={qId} className={isMatch ? "text-green-600" : "text-red-500"}>
                                {isMatch ? "✅" : "❌"} <span className="font-semibold">{getQuestionTitle(qId)}</span>: {displayAnswer} 
                                <span className="text-gray-400 text-xs ml-2">
                                  (Resort acepta: {((r as any)[qId] || []).map((optId: string) => getOptionLabel(qId, optId)).join(' | ')})
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* CONTACT FORM RENDERER */}
          {currentStepConfig.type === StepType.CONTACT && (
            <div className="space-y-8">
                <div className="space-y-4">
                    <h3 className="font-serif text-3xl font-medium text-gray-900">Antes de empezar...</h3>
                    <p className="text-gray-600">Déjanos tus datos para poder enviarte el análisis final.</p>
                </div>
                
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">¿Cuál es tu nombre y Apellidos? *</label>
                        <input 
                            type="text" 
                            className="w-full p-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition"
                            placeholder="Tu nombre completo"
                            value={state.contact.name}
                            onChange={(e) => handleContactChange('name', e.target.value)}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">¿Cuál es tu email? *</label>
                        <input 
                            type="email" 
                            className="w-full p-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition"
                            placeholder="tu@email.com"
                            value={state.contact.email}
                            onChange={(e) => handleContactChange('email', e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">Para identificar tu expediente en nuestro sistema.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">¿Cuál es tu número de teléfono? *</label>
                        <input 
                            type="tel" 
                            className="w-full p-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition"
                            placeholder="+34 600 000 000"
                            value={state.contact.phone}
                            onChange={(e) => handleContactChange('phone', e.target.value)}
                        />
                        <p className="text-xs text-gray-500 mt-1">Asegúrate de incluir el prefijo de tu país (ej. +34 para España, +52 para México). Te escribiremos por WhatsApp.</p>
                    </div>

                    <div className="pt-4 flex items-start gap-3">
                        <div className="flex h-6 items-center">
                            <input
                                id="privacy"
                                type="checkbox"
                                className="h-5 w-5 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                                checked={state.contact.privacyAccepted}
                                onChange={(e) => handleContactChange('privacyAccepted', e.target.checked)}
                            />
                        </div>
                        <label htmlFor="privacy" className="text-sm text-gray-600 leading-tight pt-0.5">
                            He leído y acepto la <a href={PRIVACY_URL} className="underline text-gray-900">política de privacidad</a>.
                        </label>
                    </div>

                    {state.error && (
                        <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-center gap-2 text-sm">
                            <AlertCircle size={16} />
                            {state.error}
                        </div>
                    )}
                </div>
            </div>
          )}

          {/* Validation Error Inline */}
          {validationError && (
              <div className="bg-red-50 border border-red-100 text-red-600 p-4 rounded-lg flex items-center gap-3 animate-pulse">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm font-medium">{validationError}</p>
              </div>
          )}

          {/* Navigation Actions */}
          <div className="pt-4 pb-10">
            {currentStepConfig.type === StepType.CONTACT ? (
                <Button 
                    onClick={handleNext} 
                    fullWidth 
                    className="text-lg py-4"
                    disabled={!state.contact.privacyAccepted || state.isSubmitting}
                >
                    {state.isSubmitting ? 'ENVIANDO...' : 'EMPEZAR TEST'}
                </Button>
            ) : STEPS[state.stepIndex + 1]?.type === StepType.RESULTS ? (
                <div className="flex justify-end">
                    <Button 
                        onClick={handleNext} 
                        className="group flex items-center gap-2 text-lg py-4 px-8"
                        disabled={state.isSubmitting}
                    >
                        {state.isSubmitting ? 'CARGANDO...' : 'VER MIS RESULTADOS'}
                        {!state.isSubmitting && <span className="group-hover:translate-x-1 transition-transform">→</span>}
                    </Button>
                </div>
            ) : currentStepConfig.type !== StepType.RESULTS ? (
                <div className="flex justify-end">
                    <Button onClick={handleNext} className="group flex items-center gap-2">
                        {visibleQuestions?.length === 1 ? 'Next' : 'Seguir'} 
                        <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </Button>
                </div>
            ) : null}
          </div>

        </div>
      </div>
    </div>
  );
}