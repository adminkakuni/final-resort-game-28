import React, { useState, useEffect, useRef } from 'react';
import { STEPS, WEBHOOK_URL_RESULTS, PRIVACY_URL } from './constants';
import { QuizState, ContactInfo, Recommendation, StepType } from './types';
import { Button } from './components/Button';
import { OptionCard } from './components/OptionCard';
import { ProgressBar } from './components/ProgressBar';
import { ArrowLeft, Check, AlertCircle, ExternalLink, ChevronDown, Info, PhoneCall, Calendar } from 'lucide-react';
import { RESORTS } from './resorts';
import { getScoredResorts } from './scoring';
import Markdown from 'react-markdown';
import { IntroScreen } from './components/screens/IntroScreen';
import { motion, AnimatePresence } from 'framer-motion';
import PhoneInput, { isValidPhoneNumber } from 'react-phone-number-input';
import 'react-phone-number-input/style.css';
const STORAGE_KEY = 'maldives_quiz_state';
const SESSION_STORAGE_KEY = 'maldives_quiz_session_id';

// Generate a simple session ID
const generateSessionId = () => {
  return typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 15);
};

const getOrGenerateSessionId = () => {
  if (typeof window === 'undefined') return generateSessionId();
  const saved = localStorage.getItem(SESSION_STORAGE_KEY);
  if (saved) return saved;
  const newId = generateSessionId();
  localStorage.setItem(SESSION_STORAGE_KEY, newId);
  return newId;
};

const getDeviceType = () => {
  if (typeof window === 'undefined') return 'desktop';
  const ua = navigator.userAgent;
  if (/Tablet|iPad|Playbook|Silk/i.test(ua)) return 'tablet';
  if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated/i.test(ua)) return 'mobile';
  return 'desktop';
};

// Tracking de clics en CTAs de la pantalla de resultados (alimenta cta_clicado en Airtable vía Make)
const trackCtaClick = (cta: string, contact: { name: string; email: string }, sessionId: string) => {
  if (!WEBHOOK_URL_RESULTS || WEBHOOK_URL_RESULTS.includes("example.com")) return;
  try {
    fetch(WEBHOOK_URL_RESULTS, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true, // garantiza que el evento sale aunque el navegador esté abriendo WhatsApp/itinerario
      body: JSON.stringify({
        session_id: sessionId,
        timestamp: new Date().toISOString(),
        event: 'cta_click',
        cta,
        email: contact.email,
        name: contact.name,
        is_final: false
      })
    }).catch(() => {});
  } catch (e) {
    console.error("Failed to track CTA click:", e);
  }
};

// Calculate scored resorts extracted to scoring.ts

/**
 * Reads a cookie value by name from document.cookie.
 * Returns an empty string if the cookie does not exist.
 */
const getCookie = (name: string): string => {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(new RegExp('(?:^|;\\s*)' + name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '=([^;]*)'));
  return match ? decodeURIComponent(match[1]) : '';
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
  contact: { name: '', email: '', phone: '', comments: '', trip_motive: '', trip_status: '', trip_month: '', trip_year: '2026', privacyAccepted: false },
  isSubmitting: false,
  results: null,
  error: null,
  hasFinished: false
};

export default function App() {
  const [state, setState] = useState<QuizState>(initialState);
  const [isLoading, setIsLoading] = useState(true);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [expandedInfos, setExpandedInfos] = useState<Record<string, boolean>>({});
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sessionIdRef = useRef<string>(getOrGenerateSessionId());
  const utmRef = useRef<Record<string, string>>({});

  // Keys that identify Facebook/ad tracking parameters
  const TRACKING_STORAGE_KEY = 'maldives_tracking_params';

  // Load state and captured UTMs/FB tracking params on mount
  useEffect(() => {
    // 1. Capture all tracking params from the URL
    const params = new URLSearchParams(window.location.search);
    const freshTracking: Record<string, string> = {};
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid', 'src', 'fbc', 'fbp', 'ref', 'ref_session'].forEach(key => {
      if (params.has(key)) freshTracking[key] = params.get(key) || '';
    });

    // 2. Read _fbc and _fbp from browser cookies (Facebook sets these automatically)
    const cookieTracking: Record<string, string> = {
      fbc: getCookie('_fbc'),
      fbp: getCookie('_fbp'),
    };

    // 3. Merge: cookies < localStorage < URL params (highest priority wins)
    let merged: Record<string, string> = {};
    try {
      const storedTracking = localStorage.getItem(TRACKING_STORAGE_KEY);
      if (storedTracking) merged = JSON.parse(storedTracking);
    } catch (_) {}
    // Strip empty-string cookie values so they don't overwrite real stored values
    const cleanCookies = Object.fromEntries(Object.entries(cookieTracking).filter(([, v]) => v !== ''));
    merged = { ...cleanCookies, ...merged, ...freshTracking };

    // 4. Persist merged tracking params so they survive navigation
    localStorage.setItem(TRACKING_STORAGE_KEY, JSON.stringify(merged));
    utmRef.current = merged;

    const device = getDeviceType();
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
    setState(prev => ({ ...prev, device_type: device, user_agent: ua }));

    // Load quiz state from LocalStorage
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

  // Check if all visible questions in the current step are single-select and answered
  const canAutoAdvance = (answers: Record<string, string | string[]>) => {
    if (!visibleQuestions) return false;
    // Don't auto-advance on multi-select steps or the priorities step
    if (visibleQuestions.some(q => q.isMultiSelect)) return false;
    // Check all visible questions are answered
    return visibleQuestions.every(q => {
      const ans = answers[q.id];
      return ans && (!Array.isArray(ans) || ans.length > 0);
    });
  };

  const handleOptionSelect = (questionId: string, optionId: string, isMultiPrp: boolean, validIds?: string[]) => {
    // IDENTIFY 
    const isMulti = isMultiPrp || questionId === 'filtros_eliminatorios';
    
    setState(prev => {
      const answers = { ...prev.answers };
      
      if (!isMulti) {
        answers[questionId] = optionId;
        setValidationError(null);
        return { ...prev, answers };
      }

      // MULTI-SELECT LOGIC
      let currentArr: string[] = [];
      const raw = answers[questionId];
      if (Array.isArray(raw)) {
        currentArr = [...raw];
      } else if (raw) {
        currentArr = [raw as string];
      }

      // Cleanup
      if (validIds && validIds.length > 0) {
        currentArr = currentArr.filter(id => validIds.includes(id));
      }
      currentArr = Array.from(new Set(currentArr)).filter(Boolean);

      // Action
      if (currentArr.includes(optionId)) {
        // UNSELECT
        const nextArr = currentArr.filter(id => id !== optionId);
        answers[questionId] = nextArr;
        setValidationError(null);
      } else {
        // SELECT
        let nextArr = [...currentArr, optionId];
        
        // SLIDING WINDOW: If more than 2, remove the oldest one
        if (questionId === 'filtros_eliminatorios' && nextArr.length > 2) {
          nextArr = nextArr.slice(-2); // Keep only the last 2 selections
          setValidationError(null);
        } else {
          setValidationError(null);
        }
        
        answers[questionId] = nextArr;
      }

      return { ...prev, answers };
    });
  };

  const handleNext = async () => {
    setValidationError(null);

    // Validation for Contact Step
    if (currentStepConfig.type === StepType.CONTACT) {
      if (!state.contact.name || !state.contact.email || !state.contact.trip_motive || !state.contact.trip_status || !state.contact.trip_month || !state.contact.privacyAccepted) {
        setValidationError("Por favor, completa todos los campos obligatorios y acepta la política de privacidad.");
        return;
      }

      // Normalizar email: evita duplicados en el upsert de Airtable (busca por email)
      const emailClean = state.contact.email.trim().toLowerCase();
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailClean)) {
        setValidationError("Por favor, introduce una dirección de correo electrónico válida.");
        return;
      }

      // WhatsApp: obligatorio si la idea de viaje es "HOT" (lead caliente); opcional en el resto
      const phoneDigits = (state.contact.phone || '').replace(/\D/g, '');
      const phoneClean = phoneDigits.length > 3 ? state.contact.phone.trim() : '';
      if (state.contact.trip_status === 'HOT' && !phoneClean) {
        setValidationError("Para planificar vuestro viaje necesitamos vuestro WhatsApp. Por favor, añadidlo.");
        return;
      }
      if (phoneClean && !isValidPhoneNumber(phoneClean)) {
        setValidationError("El número de WhatsApp no parece válido. Revisadlo o dejadlo vacío si lo preferís.");
        return;
      }

      setState(prev => ({ ...prev, isSubmitting: true, error: null }));

      // IP para matching de Facebook CAPI — se pide AQUÍ (tras aceptar la política de
      // privacidad en el checkbox), nunca al cargar la página (RGPD/ePrivacy).
      // Máximo 3s de espera: si ipify no responde, el submit sigue sin IP.
      let clientIp = '';
      try {
        const ipController = new AbortController();
        const ipTimeout = setTimeout(() => ipController.abort(), 3000);
        const ipRes = await fetch('https://api.ipify.org?format=json', { signal: ipController.signal });
        clearTimeout(ipTimeout);
        const ipData = await ipRes.json();
        if (ipData.ip) clientIp = ipData.ip;
      } catch (_) {
        // Sin IP no pasa nada: el matching de CAPI usará email/teléfono/fbc/fbp
      }

      const currentAnswers = { ...state.answers };
      const { resorts: scoredResorts } = getScoredResorts(currentAnswers);
      const recommendedResorts = scoredResorts
        .filter(r => r.percentage >= 0.5)
        .slice(0, 5)
        .map(r => ({
          name: r.name,
          match_percentage: Math.round(r.percentage * 100)
        }));

      // TODOS los resorts con afinidad >= 50% (sin límite de 5) — para guardarlos en Airtable
      const allMatches = scoredResorts
        .filter(r => r.percentage >= 0.5)
        .map(r => ({
          name: r.name,
          match_percentage: Math.round(r.percentage * 100)
        }));

      // Map answers to labels for the webhook
      const mappedAnswers = Object.entries(currentAnswers).reduce((acc, [qId, optId]) => {
        acc[qId] = getOptionLabel(qId, optId as string | string[]);
        return acc;
      }, {} as Record<string, string>);

      const tracking = utmRef.current;
      const payload = {
        session_id: sessionIdRef.current,
        timestamp: new Date().toISOString(),
        device_type: state.device_type,
        user_agent: state.user_agent,
        client_ip_address: clientIp,
        ...tracking,
        // Facebook Ads tracking fields
        fbclid: tracking['fbclid'] || '',
        src:    tracking['src']    || '',
        fbc:    tracking['fbc']    || '',
        fbp:    tracking['fbp']    || '',
        answers: mappedAnswers,
        contact: {
          name: state.contact.name.trim(),
          email: emailClean,
          phone: phoneClean,
          comments: state.contact.comments,
          trip_motive: state.contact.trip_motive,
          trip_status: state.contact.trip_status,
          trip_month: state.contact.trip_month,
          trip_year: state.contact.trip_year || '2026',
          privacyAccepted: state.contact.privacyAccepted
        },
        recommended_resorts: recommendedResorts,
        // Lista completa >= 50%: como array y como texto plano listo para un campo Long Text de Airtable
        all_resorts_50: allMatches,
        all_resorts_50_text: allMatches.map(r => `${r.name} — ${r.match_percentage}%`).join('\n'),
        is_final: true
      };

      try {
        // Enviar todo al webhook de resultados
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

        setState(prev => ({ 
          ...prev, 
          isSubmitting: false, 
          stepIndex: prev.stepIndex + 1 
        }));
      } catch (err) {
        console.error("Error al enviar el webhook:", err);
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
        // filtros_eliminatorios is optional (user can choose not to have any eliminatory filter)
        if (q.id === 'filtros_eliminatorios') return false;
        
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

    // Move to next step
    setState(prev => ({ ...prev, answers: currentAnswers, stepIndex: prev.stepIndex + 1 }));
  };

  const handleBack = () => {
    if (state.stepIndex === 0) return;
    setValidationError(null);
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
    return <IntroScreen onNext={handleNext} />;
  }

  // STANDARD WRAPPER FOR QUESTIONS & CONTACT
  return (
    <div className="min-h-screen bg-beige-100 flex flex-col relative">
      <ProgressBar currentStep={state.stepIndex} totalSteps={totalSteps} />
      <div className={`flex-1 w-full ${currentStepConfig.type === StepType.RESULTS ? 'max-w-6xl' : 'max-w-4xl'} mx-auto px-6 py-20 md:py-24 flex flex-col justify-center`}>
        
        {/* Back Button */}
        <button 
          onClick={handleBack}
          className="absolute top-[4.5rem] md:top-20 left-4 md:left-auto md:-ml-16 p-2 text-gray-400 hover:text-gray-900 transition-colors group z-20"
          aria-label="Volver al paso anterior"
        >
          <ArrowLeft size={24} className="group-hover:-translate-x-1 transition-transform" />
        </button>

        <AnimatePresence mode="wait">
        <motion.div 
          key={state.stepIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.3 }}
          className="space-y-10"
        >          
          {/* Section Title */}
            <div className="border-b border-gray-300 pb-6 mb-10">
               <h2 className="text-sm font-bold tracking-[0.2em] text-sky-800 uppercase bg-sky-50 px-4 py-1.5 rounded-full inline-block">{currentStepConfig.title}</h2>
            </div>

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
              {/* BANNER ACOMPAÑAMIENTO — Solo en la primera pantalla de preguntas */}
              {state.stepIndex === 2 && (
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 flex items-start gap-4 shadow-sm">
                <ExternalLink className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-medium text-blue-900 text-lg">Catálogo de Resorts Recomendados</h4>
                  <p className="text-blue-800 mt-1 leading-relaxed">
                    ¿Quieres inspirarte mientras respondes? Abre nuestra <a href="https://kakunitravels.com/resorts-recomendados-maldivas/" target="_blank" rel="noopener noreferrer" className="underline font-semibold hover:text-blue-900 transition-colors">lista de resorts con filtros</a> en otra pestaña para acompañar tus decisiones.
                  </p>
                </div>
              </div>
              )}

              {visibleQuestions?.map((q) => {
                const visibleOptions = q.options.filter(opt => {
                  if (q.id === 'filtros_eliminatorios') {
                    const ans = state.answers[opt.id];
                    // Rule 1: Perfil Foodie (perfil_foodie) - Hide if not answered
                    if (opt.id === 'perfil_foodie' && !ans) return false;
                    // Rule 2: Fauna grande (avistamiento_fauna) - Hide if "No especialmente" (A) OR if they chose to see it from a local island (logistica_fauna === 'A')
                    if (opt.id === 'avistamiento_fauna') {
                      if (ans === 'A') return false;
                      if (state.answers['logistica_fauna'] === 'A') return false;
                    }
                    // Rule 3: Diseño (diseno_habitacion) - Hide if "Nos gustan ambos estilos" (C)
                    if (opt.id === 'diseno_habitacion' && ans === 'C') return false;
                    // Rule 4: Traslado (tipo_traslado) - Hide if "Nos da igual" (D)
                    if (opt.id === 'tipo_traslado' && ans === 'D') return false;
                    // General rule: If a question wasn't answered (e.g. hidden), don't show it as a priority option
                    if (opt.id !== 'nivel_despreocupacion' && !ans) return false;
                  }

                  if (!opt.hiddenIf) return true;
                  const answer = state.answers[opt.hiddenIf.questionId];
                  if (Array.isArray(answer)) {
                    return !opt.hiddenIf.optionIds.some(id => answer.includes(id));
                  }
                  return !opt.hiddenIf.optionIds.includes(answer as string);
                });

                return (
                <div key={q.id} className="space-y-8 pt-4">
                  <div className="space-y-4">
                    <h3 className="font-serif text-4xl md:text-5xl font-semibold text-slate-900 leading-[1.15] tracking-tight">{q.title}</h3>
                    {q.isMultiSelect && (
                      <p className="text-xl text-[#00d1a0] font-semibold">
                        {q.id === 'filtros_eliminatorios' 
                          ? 'Podéis seleccionar un máximo de 2 opciones.' 
                          : 'Podéis seleccionar varias opciones.'}
                      </p>
                    )}
                    {q.text && (
                      <div className="text-xl text-slate-700 leading-relaxed prose prose-xl max-w-none font-light">
                        <Markdown>{q.text}</Markdown>
                      </div>
                    )}
                    
                    {q.warningBox && (
                      <div className="mt-8 bg-amber-50/30 border border-amber-100 rounded-2xl p-6 shadow-sm flex items-start gap-4 transition-all hover:bg-amber-50">
                        <div className="text-amber-900/70 leading-relaxed text-base font-normal prose prose-amber max-w-none">
                          <Markdown>{q.warningBox}</Markdown>
                        </div>
                      </div>
                    )}

                    {q.infoBox && (
                      <div className="mt-8">
                        <motion.button 
                          onClick={() => setExpandedInfos(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                          animate={{ 
                            scale: [1, 1.01, 1],
                            backgroundColor: ["rgba(255, 255, 255, 0.5)", "rgba(240, 249, 255, 0.8)", "rgba(255, 255, 255, 0.5)"],
                            boxShadow: [
                              "0 1px 2px 0 rgba(0, 0, 0, 0.05)",
                              "0 10px 20px -5px rgba(14, 165, 233, 0.15)",
                              "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
                            ]
                          }}
                          transition={{ 
                            duration: 3, 
                            repeat: Infinity, 
                            ease: "easeInOut" 
                          }}
                          className="flex items-center gap-4 w-full text-left group hover:opacity-80 transition-all duration-300 backdrop-blur-sm border border-sky-100 rounded-2xl p-4 shadow-sm"
                        >
                          <div className="flex-shrink-0 w-10 h-10 bg-sky-100 rounded-full flex items-center justify-center text-sky-600 transition-colors group-hover:bg-sky-200">
                             <motion.div
                               animate={{ rotate: [0, 10, -10, 0] }}
                               transition={{ duration: 2, repeat: Infinity, delay: 1 }}
                             >
                               <Info size={20} />
                             </motion.div>
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-sky-700 text-xs tracking-[0.25em] uppercase">
                                {q.infoBox.title}
                            </h4>
                            <p className="text-xs text-sky-400 font-medium italic">Haz clic para leer la recomendación experta</p>
                          </div>
                          <motion.div 
                            animate={{ 
                              rotate: expandedInfos[q.id] ? 180 : 0,
                              y: [0, 2, 0]
                            }}
                            transition={{ 
                              rotate: { duration: 0.3 },
                              y: { duration: 2, repeat: Infinity }
                            }}
                            className="text-sky-400 bg-sky-50 p-2 rounded-lg"
                          >
                            <ChevronDown size={18} />
                          </motion.div>
                        </motion.button>

                        <AnimatePresence>
                          {expandedInfos[q.id] && (
                            <motion.div
                              initial={{ height: 0, opacity: 0 }}
                              animate={{ height: 'auto', opacity: 1 }}
                              exit={{ height: 0, opacity: 0 }}
                              transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                              className="overflow-hidden"
                            >
                              <div className="pt-4 space-y-4">
                                {q.infoBox.text.includes('[COLUMN_START]') ? (
                                  <div className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                                      {q.infoBox.text
                                        .split('[COLUMN_START]')[1]
                                        .split('[COLUMN_END]')[0]
                                        .split('[COLUMN_BREAK]')
                                        .map((colText, idx) => (
                                          <div key={idx} className="bg-slate-50 border border-slate-100 rounded-xl p-4 transition-all flex flex-col">
                                            <div className="text-slate-700 leading-relaxed text-sm prose prose-slate max-w-none flex-1">
                                              <Markdown>{colText.trim()}</Markdown>
                                            </div>
                                          </div>
                                        ))
                                      }
                                    </div>
                                    {q.infoBox.text.split('[COLUMN_END]')[1] && (
                                        <div className="bg-slate-50/50 border border-slate-100/50 rounded-xl p-5 text-slate-600 leading-relaxed text-sm prose prose-slate max-w-none">
                                            <Markdown>{q.infoBox.text.split('[COLUMN_END]')[1].trim()}</Markdown>
                                        </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 shadow-sm text-slate-700 leading-normal text-sm prose prose-slate max-w-none">
                                    <Markdown>{q.infoBox.text}</Markdown>
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    )}


                    {/* Definición de isla local — siempre visible, optimizada para móvil */}
                    {q.id === 'logistica_fauna' && (
                      <div className="mt-6 rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50/60 p-5 sm:p-6 shadow-sm">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-2xl sm:text-3xl leading-none">🏝️</span>
                          <h4 className="font-serif text-xl sm:text-2xl font-semibold text-emerald-900 leading-tight">
                            ¿Qué es una isla local?
                          </h4>
                        </div>
                        <p className="text-[15px] sm:text-base text-slate-700 leading-relaxed">
                          Un pueblo maldivo real, donde vive la gente del país: alojamientos boutique a pie de playa, precios mucho más bajos y las mejores excursiones de fauna. <strong className="text-emerald-800">El auténtico Maldivas.</strong>
                        </p>
                        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                          <div className="flex items-center gap-2 rounded-xl bg-white/70 border border-emerald-100 px-3 py-2.5">
                            <span className="text-lg flex-shrink-0">✨</span>
                            <span className="text-sm font-medium text-slate-700 leading-tight">El Maldivas auténtico</span>
                          </div>
                          <div className="flex items-center gap-2 rounded-xl bg-white/70 border border-emerald-100 px-3 py-2.5">
                            <span className="text-lg flex-shrink-0">💸</span>
                            <span className="text-sm font-medium text-slate-700 leading-tight">Excursiones más baratas</span>
                          </div>
                          <div className="flex items-center gap-2 rounded-xl bg-white/70 border border-emerald-100 px-3 py-2.5">
                            <span className="text-lg flex-shrink-0">🐠</span>
                            <span className="text-sm font-medium text-slate-700 leading-tight">Más fauna, más cerca</span>
                          </div>
                        </div>
                        <p className="mt-4 pt-4 border-t border-emerald-100/80 text-sm sm:text-[15px] text-slate-600 leading-relaxed flex items-start gap-2">
                          <ExternalLink className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                          <span>
                            ¿Cómo funciona combinarla con el resort? Mira ejemplos reales en nuestra <a href="https://kakunitravels.com/isla-local-resort-en-maldivas-luna-de-miel-aventurera/" target="_blank" rel="noopener noreferrer" className="underline font-semibold text-emerald-700 hover:text-emerald-900 transition-colors">guía de isla local y resort</a>.
                          </span>
                        </p>
                      </div>
                    )}
                  </div>
                  
                  <div className={`grid gap-6 ${visibleOptions.some(o => o.imageUrl) ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-2' : 'grid-cols-1'}`}>
                    {visibleOptions.map((opt, idx) => {
                      const hasImages = visibleOptions.some(o => o.imageUrl);
                      const isImageLessInImageGrid = hasImages && !opt.imageUrl;
                      
                      const answer = state.answers[opt.id];
                      let answerLabel = answer ? getOptionLabel(opt.id, answer) : 'No respondido';
                      
                      // Custom label for Fauna: show the specific animal if selected from resort
                      if (q.id === 'filtros_eliminatorios' && opt.id === 'avistamiento_fauna' && state.answers['tipo_animal']) {
                        answerLabel = getOptionLabel('tipo_animal', state.answers['tipo_animal']);
                      }
                      
                      const label = q.id === 'filtros_eliminatorios' ? `${opt.label}: ${answerLabel}` : opt.label;
                      
                      return (
                        <OptionCard
                          key={opt.id}
                          id={opt.id}
                          label={label}
                          description={opt.description}
                          chip={opt.chip}
                          imageUrl={opt.imageUrl}
                          selected={
                            q.isMultiSelect 
                              ? ((state.answers[q.id] as string[]) || []).includes(opt.id)
                              : state.answers[q.id] === opt.id
                          }
                          onClick={() => handleOptionSelect(q.id, opt.id, !!q.isMultiSelect, q.options.map(o => o.id))}
                          isImageLessInImageGrid={isImageLessInImageGrid}
                          isHighlighted={opt.isHighlighted}
                          index={idx}
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
                            className="w-full p-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#00d1a0] focus:border-transparent outline-none transition resize-none"
                            placeholder=""
                            rows={5}
                            value={state.contact.comments || ''}
                            onChange={(e) => handleContactChange('comments', e.target.value)}
                        />
                    </div>
                </div>
            </div>
          )}

          {currentStepConfig.type === StepType.RESULTS && (() => {
            const { resorts: scoredResorts, isFallback } = getScoredResorts(state.answers);
            const perfectMatches = scoredResorts.filter(r => r.percentage === 1).length;
            const highMatches = scoredResorts.filter(r => r.percentage >= 0.5 && r.percentage < 1).length;
            const totalGood = Math.min(perfectMatches + highMatches, 5);

            // Resorts bloqueados (top 2-5): se enseñan como teaser dentro del CTA de WhatsApp
            const lockedResorts = scoredResorts.slice(1, 5).filter(r => r.percentage >= 0.5);
            const whatsappHref = state.device_type === 'mobile'
              ? `https://wa.me/34678605610?text=Hola,%20he%20completado%20el%20test%20de%20resorts%20y%20me%20gustaría%20ver%20mis%20resultados.%20Mi%20email%20es:%20${encodeURIComponent(state.contact.email)}`
              : `https://kakunitravels.com/whatsapp/?email=${encodeURIComponent(state.contact.email)}`;
            // resort_board: régimen de comidas elegido en nivel_despreocupacion (A/B/C)
            const boardMap: Record<string, string> = { A: 'ti_actividades', B: 'ti', C: 'pc' };
            const resortBoard = boardMap[state.answers['nivel_despreocupacion'] as string] || '';
            const itineraryHref = `https://vuestro-itinerario.kakunitravels.com/?user_name=${encodeURIComponent(state.contact.name)}&user_email=${encodeURIComponent(state.contact.email)}&user_phone=${encodeURIComponent(state.contact.phone)}&trip_motive=${encodeURIComponent(state.contact.trip_motive)}&resort_finder_completed=true&resort_board=${encodeURIComponent(resortBoard)}`;
            const track = (cta: string) => trackCtaClick(cta, state.contact, sessionIdRef.current);

            // Compartir con la pareja: el link lleva el session_id del que comparte (ref_session)
            // para vincular los dos leads en Airtable si la pareja completa el test
            const shareUrl = `https://resort-finder.kakunitravels.com/?ref=pareja&ref_session=${sessionIdRef.current}`;
            const shareText = scoredResorts.length > 0
              ? `He hecho el test de Kakuni Travels y me ha salido nuestro resort ideal en Maldivas 🏝️ Te reto: haz tú el test y a ver si te sale el mismo que a mí 😏`
              : `He hecho el test de Kakuni Travels para encontrar nuestro resort ideal en Maldivas 🏝️ Te reto: hazlo tú y comparamos resultados 😏`;
            const handleShare = async () => {
              track('compartir');
              if (typeof navigator !== 'undefined' && (navigator as any).share) {
                try {
                  await (navigator as any).share({ title: 'Resort Finder — Kakuni Travels', text: shareText, url: shareUrl });
                } catch (_) { /* usuario canceló el share — no es un error */ }
              } else {
                window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`, '_blank', 'noopener');
              }
            };
            const renderLockedRow = (variant: 'light' | 'dark') => lockedResorts.length > 0 ? (
              <div className={`grid gap-2 w-full max-w-md mx-auto ${lockedResorts.length >= 4 ? 'grid-cols-4' : lockedResorts.length === 3 ? 'grid-cols-3' : lockedResorts.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
                {lockedResorts.map((r, i) => (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center rounded-xl py-2.5 px-1 ${
                      variant === 'light'
                        ? 'bg-white/15 border border-white/25 text-white'
                        : 'bg-slate-50 border border-slate-200 text-slate-600'
                    }`}
                  >
                    <span className="text-base leading-none mb-1">🔒</span>
                    <span className="text-sm font-bold leading-none">{Math.round(r.percentage * 100)}%</span>
                    <span className={`text-[8px] uppercase tracking-wider mt-0.5 ${variant === 'light' ? 'text-white/80' : 'text-slate-400'}`}>afinidad</span>
                  </div>
                ))}
              </div>
            ) : null;

            // Build travel profile summary
            const profileItems = [
              { key: 'nivel_despreocupacion', icon: '🎯' },
              { key: 'perfil_foodie', icon: '🍽️' },
              { key: 'atmosfera_isla', icon: '🏝️' },
              { key: 'experiencia_snorkel', icon: '🤿' },
              { key: 'avistamiento_fauna', icon: '🦈' },
              { key: 'diseno_habitacion', icon: '🏠' },
              { key: 'tipo_traslado', icon: '✈️' },
            ].filter(p => state.answers[p.key]).map(p => ({
              ...p,
              label: getQuestionTitle(p.key),
              value: getOptionLabel(p.key, state.answers[p.key])
            }));

            return (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="space-y-10"
              >
                {/* Hero result */}
                <div className="text-center space-y-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, damping: 15, delay: 0.2 }}
                    className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-gradient-to-br from-[#00d1a0] to-[#00c9d4] shadow-lg shadow-[#00d1a0]/30 mx-auto"
                  >
                    <Check size={40} className="text-white" strokeWidth={3} />
                  </motion.div>
                  <motion.h3 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="font-serif text-4xl md:text-5xl font-semibold text-gray-900 leading-tight"
                  >
                    {state.contact.trip_status === 'COLD' 
                      ? `${state.contact.name}, sabemos qué tipo de experiencia buscáis` 
                      : `${state.contact.name}, este es uno de los resorts que encajan con vuestra forma de viajar`}
                  </motion.h3>
                  <motion.p 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                    className="text-gray-500 text-lg max-w-xl mx-auto"
                  >
                    Entre más de 170 resorts en Maldivas, hemos identificado el perfil que mejor se adapta a vuestra forma de viajar.
                  </motion.p>

                  {isFallback && scoredResorts.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 }}
                      className="max-w-xl mx-auto bg-amber-50 border border-amber-200 rounded-xl px-5 py-4 text-amber-800 text-sm leading-relaxed"
                    >
                      Ningún resort cumple <strong>todo</strong> lo que marcasteis como imprescindible a la vez, así que os mostramos los que <strong>más se acercan</strong>. Si queréis, lo afinamos juntos por WhatsApp para priorizar lo que más os importa.
                    </motion.div>
                  )}
                </div>

                {/* Stats cards - Centered and compact */}
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.8 }}
                  className="text-center"
                >
                  <div className="inline-flex items-center gap-2 px-6 md:px-8 py-2 md:py-3 bg-white/60 border border-slate-200 rounded-full shadow-sm">
                    <span className="text-2xl md:text-3xl font-bold text-[#00d1a0]">{perfectMatches + highMatches}</span>
                    <span className="text-base md:text-xl text-slate-700 font-medium">Resorts muy compatibles</span>
                  </div>
                </motion.div>

                {/* Main Content Grid: Top Result + Profile (Horizontal scroll on mobile) */}
                <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-6 px-6 pb-6 gap-5 md:grid md:grid-cols-2 md:gap-6 md:pb-0 md:mx-0 md:px-0 items-stretch">
                    {/* Top Resort Match - LEFT ON DESKTOP, FIRST ON MOBILE */}
                    {scoredResorts.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 1.0 }}
                        className="flex-shrink-0 w-[82vw] md:w-full snap-center bg-white border-2 border-[#00d1a0] rounded-2xl overflow-hidden shadow-lg flex flex-col"
                      >
                        <div className="bg-[#00d1a0] px-4 py-1.5 text-white text-[9px] font-bold tracking-widest uppercase text-center">
                          un resort que encaja muy bien con vuestro perfil
                        </div>
                        {scoredResorts[0].imageUrl && (
                          <div className="h-44 md:h-52 w-full overflow-hidden bg-slate-100">
                            <img
                              src={scoredResorts[0].imageUrl}
                              alt={scoredResorts[0].name}
                              loading="lazy"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                        <div className="p-4 md:p-8 flex-1 flex flex-col justify-center space-y-2 md:space-y-3">
                           <div className="text-center space-y-1">
                              <h4 className="font-serif text-xl md:text-4xl text-slate-900 leading-tight">{scoredResorts[0].name}</h4>
                              <div className="inline-block px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-bold tracking-wider uppercase">
                                 Alta Afinidad
                              </div>
                           </div>
                           <p className="text-slate-600 text-sm leading-relaxed text-center">
                              {state.contact.trip_status === 'COLD'
                                ? "Si acabáis eligiendo Maldivas, este resort encajaría perfectamente con vosotros."
                                : "Este resort refleja de forma excelente la atmósfera y el estilo de estancia que imagináis."}
                           </p>
                           <div className="border-t border-slate-100 mt-3 pt-4 space-y-2">
                              <p className="text-slate-500 text-xs text-center">¿A tu pareja le saldría el mismo? Solo hay una forma de saberlo…</p>
                              <button
                                 onClick={handleShare}
                                 className="mx-auto flex w-full md:w-auto items-center justify-center gap-2 bg-[#25D366] hover:bg-[#1fb457] text-white text-sm font-semibold px-6 py-3 rounded-full shadow-sm transition-colors"
                              >
                                 💍 Reta a tu pareja a hacer el test
                              </button>
                           </div>
                        </div>
                      </motion.div>
                    )}

                    {/* Travel Profile Card - RIGHT ON DESKTOP, SECOND ON MOBILE */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1 }}
                      className="flex-shrink-0 w-[82vw] md:w-full snap-center bg-white border border-gray-200/60 rounded-2xl p-5 md:p-6 shadow-sm flex flex-col justify-between"
                    >
                      <div>
                        <h4 className="text-[10px] font-bold tracking-[0.2em] text-gray-400 uppercase mb-3">Vuestro Perfil de Viaje</h4>
                        <div className="mb-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-slate-700 text-[14px] leading-relaxed">
                            {(() => {
                              const atmos = state.answers['atmosfera_isla'] as string;
                              const plan = state.answers['nivel_despreocupacion'] as string;
                              const design = state.answers['diseno_habitacion'] as string;
                              const snorkel = state.answers['experiencia_snorkel'] as string;

                              if (atmos === 'A') {
                                if (design === 'A') return "Os encaja una experiencia de Maldivas íntima y auténtica, con una atmósfera de desconexión total y un estilo que respeta la esencia natural.";
                                return "Os encaja una experiencia de Maldivas íntima y cuidada, con un resort fácil de disfrutar y una atmósfera pensada para desconectar de verdad.";
                              }
                              if (design === 'B') return "Lo vuestro apunta a una estética contemporánea y sofisticada, donde el diseño y la comodidad sean los protagonistas del paraíso.";
                              if (atmos === 'B' || atmos === 'C') {
                                if (plan === 'A') return "Os favorece un tipo de resort completo y disfrutable, con una atmósfera vibrante que combine relax con estímulo visual y actividades.";
                                return "Buscáis una experiencia equilibrada en una isla con personalidad y espacio para explorar, con una propuesta estética cuidada y natural.";
                              }
                              if (snorkel === 'C') return "Para vosotros, el mar es el centro de todo. Os favorece un refugio donde la conexión con el océano sea inmediata y la vida marina sea protagonista.";
                              return "Lo vuestro va hacia una experiencia romántica y equilibrada, donde el resort acompañe bien el viaje en una isla con mucha personalidad.";
                            })()}
                          </p>
                        </div>
                      </div>

                      {/* Profile Chips - Visual summary */}
                      <div className="flex flex-wrap gap-1.5">
                        {profileItems.slice(0, 4).map((item, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white border border-slate-100 rounded-lg shadow-sm">
                            <span className="text-sm">{item.icon}</span>
                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-tight">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                </div>

                {/* CTA Layout */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.2 }}
                  className="space-y-8 max-w-2xl mx-auto w-full pt-4"
                >
                  {state.contact.trip_status === 'WARM' ? (
                    <div className="space-y-10">
                      {/* CTA principal */}
                      <div className="bg-[#00d1a0] rounded-[2.5rem] p-8 md:p-12 flex flex-col items-center text-center space-y-6 shadow-xl relative overflow-hidden group">
                        <p className="text-white text-xl md:text-2xl font-serif leading-relaxed max-w-md mx-auto">
                          Este es solo uno de los resorts que encajan con vuestro perfil.{lockedResorts.length > 0 ? ` Tenéis ${lockedResorts.length} más esperándoos.` : ''}
                        </p>
                        {renderLockedRow('light')}
                        <a
                          href={whatsappHref}
                          onClick={() => track('whatsapp')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center gap-3 bg-white text-[#00d1a0] hover:bg-gray-50 px-6 py-4 rounded-2xl font-bold text-lg md:text-xl transition-all shadow-lg hover:scale-[1.02]"
                        >
                          <svg className="w-6 h-6 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          Recibir mi colección en WhatsApp
                        </a>
                      </div>

                      {/* Warm Screen Content */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-6 md:p-8 shadow-sm space-y-5">
                        <div className="space-y-1">
                          <h4 className="font-serif text-2xl md:text-3xl text-slate-900">Combina tu resort con…</h4>
                          <p className="text-slate-500 text-base">La mayoría de parejas combinan el resort con el mejor océano del mundo… o con otro país.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { label: '🏝️ Isla local + resort en Maldivas', desc: 'Aventura de océano y vida marina', href: 'https://kakunitravels.com/isla-local-resort-en-maldivas-luna-de-miel-aventurera/', img: 'https://kakunitravels.com/wp-content/uploads/2026/03/tiburon-nodriza.webp', alt: 'Isla local + resort en Maldivas' },
                            { label: '🌏 Otro país + Maldivas', desc: 'Sri Lanka, Bali, Tailandia, Vietnam, Dubái…', href: 'https://kakunitravels.com/destinos/', img: 'https://kakunitravels.com/wp-content/uploads/2026/04/pareja-vistas-roca-sigiriya-sri-lanka.webp', alt: 'Combinado de país + Maldivas' },
                          ].map((d, i) => (
                            <a key={i} href={d.href} onClick={() => track('web')} target="_blank" rel="noopener noreferrer" className="flex flex-col bg-slate-50 hover:bg-sky-50 rounded-2xl border border-slate-100 transition-all group overflow-hidden shadow-sm hover:shadow-md">
                              <div className="h-56 md:h-64 w-full overflow-hidden bg-slate-200">
                                <img src={d.img} alt={d.alt} loading="lazy" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              </div>
                              <div className="p-4 flex items-center justify-between gap-2">
                                <div>
                                  <span className="font-semibold text-slate-800 group-hover:text-sky-800 text-sm block">{d.label}</span>
                                  <span className="text-slate-400 text-xs">{d.desc}</span>
                                </div>
                                <span className="text-sky-600 group-hover:translate-x-1 transition-transform flex-shrink-0">→</span>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>

                      {/* Social Proof */}
                      <div className="flex flex-wrap items-center justify-center gap-2 text-slate-600 font-medium text-sm md:text-base">
                        <span className="text-amber-400 tracking-widest text-lg md:text-xl">★★★★★</span>
                        <span className="font-bold text-slate-800">5.0</span>
                        <span className="text-slate-300 hidden md:inline">·</span>
                        <span>+300 parejas han reservado su luna de miel con nosotros</span>
                      </div>

                      {/* CTA secundario */}
                      <div className="flex flex-col items-center text-center space-y-4 pt-2">
                        <p className="text-gray-500 text-lg">¿La duda es el precio? Decidnos fechas y os calculamos desde cuánto saldría — y si queréis, lo repasamos juntos en una llamada. Sin compromiso.</p>
                        <a
                          href={itineraryHref}
                          onClick={() => track('itinerario')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 text-[#00d1a0] hover:text-[#00a880] font-medium transition-colors"
                        >
                          Ver desde qué precio saldría <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ) : state.contact.trip_status === 'COLD' ? (
                    <div className="space-y-10">
                      {/* Cold Screen Content */}
                      <div className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm space-y-6">
                        <p className="text-slate-700 text-lg leading-relaxed text-center font-medium">
                          Antes de decidir, lo más útil es ver qué opciones existen y a qué precio.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          {/* Option 1: Solo Resort */}
                          <a href="https://kakunitravels.com/resorts-recomendados-maldivas/" onClick={() => track('web')} target="_blank" rel="noopener noreferrer" className="flex flex-col bg-slate-50 hover:bg-sky-50 rounded-2xl border border-slate-100 transition-all group overflow-hidden shadow-sm hover:shadow-md">
                            <div className="h-64 w-full overflow-hidden bg-slate-200">
                              <img src="https://kakunitravels.com/wp-content/uploads/2026/04/resort-solo.webp" alt="Solo Resort" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                            <div className="p-4 flex items-center justify-between mt-auto">
                              <span className="font-semibold text-slate-800 group-hover:text-sky-800 text-sm">🏝️ Solo Resort</span>
                              <span className="text-sky-600 group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                          </a>

                          {/* Option 2: Isla Local y Resort */}
                          <a href="https://kakunitravels.com/isla-local-resort-en-maldivas-luna-de-miel-aventurera/" onClick={() => track('web')} target="_blank" rel="noopener noreferrer" className="flex flex-col bg-slate-50 hover:bg-sky-50 rounded-2xl border border-slate-100 transition-all group overflow-hidden shadow-sm hover:shadow-md">
                            <div className="h-64 w-full overflow-hidden bg-slate-200">
                              <img src="https://kakunitravels.com/wp-content/uploads/2026/03/tiburon-nodriza.webp" alt="Isla Local y Resort" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                            <div className="p-4 flex items-center justify-between mt-auto">
                              <span className="font-semibold text-slate-800 group-hover:text-sky-800 text-sm">🌴 Isla Local + Resort</span>
                              <span className="text-sky-600 group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                          </a>

                          {/* Option 3: Combinados o Solo País */}
                          <a href="https://kakunitravels.com/destinos/" onClick={() => track('web')} target="_blank" rel="noopener noreferrer" className="flex flex-col bg-slate-50 hover:bg-sky-50 rounded-2xl border border-slate-100 transition-all group overflow-hidden shadow-sm hover:shadow-md">
                            <div className="h-64 w-full overflow-hidden bg-slate-200">
                              <img src="https://kakunitravels.com/wp-content/uploads/2026/04/nungnung-waterfall-web.jpg" alt="Combinados o Solo País" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                            <div className="p-4 flex items-center justify-between mt-auto">
                              <span className="font-semibold text-slate-800 group-hover:text-sky-800 text-sm">🌏 Combinados o Solo País</span>
                              <span className="text-sky-600 group-hover:translate-x-1 transition-transform">→</span>
                            </div>
                          </a>
                        </div>
                      </div>

                      {/* Social Proof */}
                      <div className="flex flex-wrap items-center justify-center gap-2 text-slate-600 font-medium text-sm md:text-base">
                        <span className="text-amber-400 tracking-widest text-lg md:text-xl">★★★★★</span>
                        <span className="font-bold text-slate-800">5.0</span>
                        <span className="text-slate-300 hidden md:inline">·</span>
                        <span>+300 parejas han reservado su luna de miel con nosotros</span>
                      </div>

                      {/* CTA principal */}
                      <div className="bg-[#00d1a0] rounded-[2.5rem] p-8 md:p-12 flex flex-col items-center text-center space-y-6 shadow-xl relative overflow-hidden group">
                        <p className="text-white text-xl md:text-2xl font-serif leading-relaxed max-w-md mx-auto">
                          Este es solo uno de los resorts que encajan con vuestro perfil.{lockedResorts.length > 0 ? ` Tenéis ${lockedResorts.length} más esperándoos.` : ''}
                        </p>
                        {renderLockedRow('light')}
                        <a
                          href={whatsappHref}
                          onClick={() => track('whatsapp')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center gap-3 bg-white text-[#00d1a0] hover:bg-gray-50 px-6 py-4 rounded-2xl font-bold text-lg md:text-xl transition-all shadow-lg hover:scale-[1.02]"
                        >
                          <svg className="w-6 h-6 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          Recibir mi colección en WhatsApp
                        </a>
                      </div>

                      {/* Link discreto al itinerario — la curiosidad por el precio revela intención */}
                      <div className="flex flex-col items-center text-center space-y-3 pt-2">
                        <p className="text-gray-500 text-base font-light">¿Curiosidad por saber desde cuánto sale un viaje así?</p>
                        <a
                          href={itineraryHref}
                          onClick={() => track('itinerario')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center gap-2 text-[#00d1a0] hover:text-[#00a880] font-medium transition-colors"
                        >
                          Calculadlo aquí <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-8">
                      {/* Existing HOT Screen Content */}
                      {/* Social Proof */}
                      <div className="flex flex-col items-center text-center gap-1.5 mb-2">
                        <div className="flex flex-wrap items-center justify-center gap-2 text-slate-600 font-medium text-sm md:text-base">
                          <span className="text-amber-400 tracking-widest text-lg md:text-xl">★★★★★</span>
                          <span className="font-bold text-slate-800">5.0</span>
                          <span className="text-slate-300 hidden md:inline">·</span>
                          <span>Más de 300 parejas han viajado con nosotros</span>
                        </div>
                        <p className="text-slate-400 text-sm">Somos Iván y Hoola — visitamos los resorts de Maldivas personalmente cada año</p>
                      </div>

                      {/* Path 1: Planning (Next Step) - Emerald Card */}
                      <div className="bg-[#00d1a0] rounded-[2.5rem] p-6 py-10 md:p-14 flex flex-col items-center text-center space-y-6 shadow-xl relative overflow-hidden group">
                        {/* Badge */}
                        <div className="absolute top-4 right-4 md:top-6 md:right-6 animate-bounce">
                          <span className="bg-white text-[#00d1a0] text-[9px] md:text-[10px] font-bold px-3 md:px-4 py-1.5 md:py-2 rounded-full uppercase tracking-wider flex items-center gap-2 shadow-sm">
                            <span className="w-1.5 md:w-2 h-1.5 md:h-2 bg-[#00d1a0] rounded-full animate-pulse"></span>
                            ASESOR PERSONAL INCLUIDO
                          </span>
                        </div>

                        <div className="space-y-3 md:space-y-4 pt-2 md:pt-4">
                          <h4 className="text-white font-serif text-2xl md:text-5xl font-semibold leading-tight">
                            Ved desde qué precio sale vuestro viaje
                          </h4>
                          <p className="text-white text-base md:text-xl leading-relaxed max-w-md mx-auto opacity-90">
                            Decidnos fechas y días, y os preparamos una propuesta con precio real — mejor que Booking o la web del resort. Después la repasamos juntos en una llamada, sin compromiso.
                          </p>
                          {/* Urgencia honesta: escasez real ligada al mes de viaje del lead */}
                          <p className="inline-flex items-center gap-2 bg-white/15 border border-white/25 text-white text-sm md:text-base rounded-full px-4 py-2 mx-auto">
                            ⏳ {state.contact.trip_month
                              ? `Las mejores water villas para ${state.contact.trip_month.toLowerCase()} son las primeras en agotarse.`
                              : 'Las mejores water villas son las primeras en agotarse.'}
                          </p>
                        </div>

                        <a
                          href={itineraryHref}
                          onClick={() => track('itinerario')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center gap-3 bg-white text-[#00d1a0] hover:bg-white/90 px-6 py-4 md:px-8 md:py-5 rounded-2xl font-bold text-lg md:text-xl transition-all shadow-lg hover:scale-[1.02] mt-2"
                        >
                          Diseñar nuestro viaje y ver precios
                          <ExternalLink className="w-5 h-5 md:w-6 md:h-6" />
                        </a>
                      </div>

                      {/* Path 2: WhatsApp (Secondary) - Centered below */}
                      <div className="flex flex-col items-center text-center space-y-6 pt-4">
                        <p className="text-gray-500 text-lg font-light max-w-md">
                          Este es solo uno de los resorts que encajan con vuestro perfil.<br/>
                          {lockedResorts.length > 0
                            ? `Tenéis ${lockedResorts.length} más esperándoos — os enviamos la selección completa por WhatsApp.`
                            : 'Si queréis ver el resto de opciones, os enviamos la selección completa por WhatsApp.'}
                        </p>

                        {renderLockedRow('dark')}

                        <a
                          href={whatsappHref}
                          onClick={() => track('whatsapp')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group inline-flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-8 py-4 rounded-2xl font-medium transition-all shadow-sm hover:shadow-md"
                        >
                          <svg className="w-6 h-6 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                          Recibir la colección en WhatsApp
                        </a>
                      </div>

                      {/* Salida de confianza — discreta, al fondo, nunca compite con los CTAs */}
                      <p className="text-center text-sm text-gray-400 pt-2">
                        ¿Primera vez que oís hablar de nosotros?{' '}
                        <a href="https://kakunitravels.com/nuestra-historia/" onClick={() => track('web')} target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-600 transition-colors">Conoced nuestra historia</a>
                      </p>
                    </div>
                  )}
                </motion.div>


              </motion.div>
            );
          })()}

          {/* CONTACT FORM RENDERER */}
          {currentStepConfig.type === StepType.CONTACT && (
            <div className="space-y-8">
                {(() => {
                  const compatibles = getScoredResorts(state.answers).resorts.filter(r => r.percentage >= 0.5).length;
                  return compatibles > 0 ? (
                    <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-5 flex items-center gap-4 shadow-sm">
                      <div className="w-10 h-10 bg-[#00d1a0] rounded-full flex items-center justify-center flex-shrink-0">
                        <Check size={20} className="text-white" strokeWidth={3} />
                      </div>
                      <p className="text-emerald-900 font-medium text-lg">
                        Análisis completado: <strong>{compatibles} resorts compatibles</strong> encontrados entre más de 170.
                      </p>
                    </div>
                  ) : null;
                })()}
                <div className="space-y-4">
                    <h3 className="font-serif text-3xl md:text-4xl font-medium text-gray-900">¡Todo listo! Para ver vuestros resultados personalizados...</h3>
                    <p className="text-gray-500 text-lg">Déjanos vuestros datos para poder guardar y enviar el análisis de los resorts que mejor encajan con vosotros.</p>
                </div>
                
                <div className="space-y-5">
                    {/* 1. IDEA DE VIAJE (primera pregunta) — determina si el WhatsApp es obligatorio */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">¿Qué idea de viaje tenéis en mente? *</label>
                        <select
                            className="w-full p-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition appearance-none cursor-pointer"
                            value={state.contact.trip_status || ''}
                            onChange={(e) => handleContactChange('trip_status', e.target.value)}
                        >
                            <option value="">Selecciona una opción</option>
                            <option value="COLD">Solo buscando inspiración para el futuro</option>
                            <option value="WARM">Maldivas nos llama mucho pero aún tenemos dudas</option>
                            <option value="HOT">Tenemos claro que iremos a Maldivas y queremos planificarlo ya</option>
                        </select>
                    </div>

                    {/* 2 y 3. MOTIVO, MES Y AÑO */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">¿Cuál es el motivo de este viaje? *</label>
                            <select
                                className="w-full p-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition appearance-none cursor-pointer"
                                value={state.contact.trip_motive}
                                onChange={(e) => handleContactChange('trip_motive', e.target.value)}
                            >
                                <option value="">Selecciona un motivo</option>
                                <option value="LUNA DE MIEL">Luna de miel</option>
                                <option value="ANIVERSARIO DE BODAS">Aniversario de bodas</option>
                                <option value="PAREJA">Viaje en pareja</option>
                                <option value="FAMILIA">Familia</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Mes *</label>
                                <select
                                    className="w-full p-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition appearance-none cursor-pointer"
                                    value={state.contact.trip_month}
                                    onChange={(e) => handleContactChange('trip_month', e.target.value)}
                                >
                                    <option value="">Mes</option>
                                    {["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"].map(m => (
                                        <option key={m} value={m.toUpperCase()}>{m}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Año *</label>
                                <select
                                    className="w-full p-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition appearance-none cursor-pointer"
                                    value={state.contact.trip_year}
                                    onChange={(e) => handleContactChange('trip_year', e.target.value)}
                                >
                                    <option value="2026">2026</option>
                                    <option value="2027">2027</option>
                                    <option value="2028">2028</option>
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* 4. NOMBRES */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vuestros nombres (Ej: Ana y Luis) *</label>
                        <input
                            type="text"
                            className="w-full p-4 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent outline-none transition"
                            placeholder="Vuestros nombres"
                            value={state.contact.name}
                            onChange={(e) => handleContactChange('name', e.target.value)}
                        />
                    </div>

                    {/* 5. EMAIL */}
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

                    {/* 6. WHATSAPP — obligatorio si la idea de viaje es "HOT" */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Vuestro WhatsApp {state.contact.trip_status === 'HOT' ? '*' : '(opcional)'}</label>
                        <div className="w-full p-4 bg-white border border-gray-300 rounded-lg focus-within:ring-2 focus-within:ring-gray-900 focus-within:border-transparent transition">
                            <PhoneInput
                                international
                                defaultCountry="ES"
                                placeholder="600 000 000"
                                value={(state.contact.phone || undefined) as any}
                                onChange={(value) => handleContactChange('phone', value || '')}
                            />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                            {state.contact.trip_status === 'HOT'
                                ? 'Lo necesitamos para enviaros las cotizaciones de vuestro viaje por WhatsApp.'
                                : 'Lo dejamos guardado para que no tengáis que repetirlo al diseñar vuestro viaje.'}
                        </p>
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
                            He leído y acepto la <a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="underline text-gray-900">política de privacidad</a> y el envío de mis datos, incluidos identificadores publicitarios (IP, cookies de Facebook), para gestionar mi solicitud.
                        </label>
                    </div>

                    {/* Reseñas reales de Google — carrusel horizontal, refuerzo de confianza al dar los datos */}
                    <div className="mt-2 flex overflow-x-auto snap-x snap-mandatory scrollbar-hide -mx-6 px-6 gap-3 pb-1">
                        {[
                          { text: 'Todo estuvo súper bien organizado desde el primer momento, sin ningún contratiempo y con una planificación impecable.', author: '— Laura, luna de miel en Maldivas' },
                          { text: 'La luna de miel en Tailandia y Maldivas fue simplemente impresionante. Fue un gran acierto combinar estos dos destinos tan diferentes y, a la vez, tan complementarios.', author: '— Enrique, Tailandia + Maldivas' },
                          { text: 'Desde el primer momento Iván nos ha asesorado creando juntos el plan de viaje.', author: '— Martina, luna de miel en Maldivas' },
                        ].map((r, i) => (
                          <div key={i} className="flex-shrink-0 w-[75vw] sm:w-[340px] snap-center bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col gap-1.5">
                            <span className="text-amber-400 tracking-widest text-sm" aria-hidden="true">★★★★★</span>
                            <p className="text-slate-600 text-sm leading-relaxed italic">“{r.text}”</p>
                            <p className="text-slate-400 text-xs mt-auto">{r.author} · Reseña de Google</p>
                          </div>
                        ))}
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
                    disabled={state.isSubmitting}
                >
                    {state.isSubmitting ? 'GENERANDO RESULTADOS...' : 'VER MIS RESULTADOS'}
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
                    <Button 
                      onClick={handleNext} 
                      className="group flex items-center gap-3 px-10 py-4 text-base relative overflow-hidden transition-all duration-500 hover:pr-14"
                    >
                        <span className="relative z-10 font-bold tracking-widest">SIGUIENTE</span>
                        <svg className="w-5 h-5 absolute right-4 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </Button>
                </div>
            ) : null}
          </div>

        </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
