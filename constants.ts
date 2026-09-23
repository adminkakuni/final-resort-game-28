import { StepConfig, StepType } from "./types";

// ==========================================
// CONFIGURABLE CONSTANTS
// ==========================================
export const WEBHOOK_URL_CONTACT = import.meta.env.VITE_WEBHOOK_URL_RESULTS || ""; // Webhook 1: se envía al rellenar el formulario de contacto
export const WEBHOOK_URL_RESULTS = import.meta.env.VITE_WEBHOOK_URL_RESULTS || ""; // Webhook 2: se envía al mostrar resultados finales
export const YOUTUBE_URL = "https://www.youtube.com/embed/5hTpFtU97nU";
export const PRIVACY_URL = "https://kakunitravels.com/politica-de-privacidad/";

// ==========================================
// QUIZ CONTENT
// ==========================================

export const STEPS: StepConfig[] = [
  {
    id: 'intro',
    type: StepType.INTRO,
  },
  {
    id: 'screen-2-todo-incluido',
    type: StepType.QUESTIONS,
    title: "EL TODO INCLUIDO",
    youtubeId: YOUTUBE_URL,
    questions: [
      {
        id: 'nivel_despreocupacion',
        title: "¿Qué nivel de despreocupación buscáis en el resort en cuanto a comidas, bebidas y actividades?",
        infoBox: {
          title: "INFO PARA DECIDIR MEJOR",
          text: "### ✨ Todo incluido con actividades\nIdeal si os gusta comer, beber y hacer actividades sin mirar el precio.\n\n✅ **A favor:** 0 preocupaciones, gran valor por euro invertido.\n\n❌ **En contra:** Requiere min. 4 noches y limita el número de resorts.\n\n---\n\n### ✨ Todo Incluido (Comidas y Bebidas)\nPara quienes quieren tener las comidas cubiertas pero elegir sus propias actividades.\n\n✅ **A favor:** Min. 3 noches, disponible en la mayoría de resorts.\n\n❌ **En contra:** Factura extra al final por actividades/excursiones.\n\n---\n\n### ✨ Media Pensión / Pensión Completa\nPara quienes buscan una experiencia gastronómica y de alojamiento superior.\n\n✅ **A favor:** Servicio, comidas y habitaciones muy premium.\n\n❌ **En contra:** Pocos resorts de este nivel."
        },
        options: [
          {
            id: 'A',
            label: "Todo incluido con actividades",
            chip: "min 4 noches",
            description: "Incluye comidas, bebidas alcohólicas y una selección de actividades o servicios extra (masajes, cenas especiales)."
          },
          {
            id: 'B',
            label: "Todo Incluido",
            chip: "min 3 noches",
            description: "Solo comidas y bebidas (alcohólicas y no alcohólicas). Las actividades se pagan aparte según os apetezca."
          },
          {
            id: 'C',
            label: "Media Pensión / Pensión Completa",
            chip: "min 2 noches",
            description: "Ideal para quienes priorizan la calidad de la habitación y la gastronomía gourmet por encima de la cantidad."
          },
        ]
      },
      {
        id: 'perfil_foodie',
        title: "¿Buffet o dine around?",
        text: "No va de comer mejor o peor. Va de formato: cómo coméis, no cómo de bien.",
        infoBox: {
          title: "INFO PARA DECIDIR MEJOR",
          text: "💶 **Sobre el precio, dos cosas:**\n\n1. Lo que más dispara el precio de la comida en Maldivas es la **calidad de la cocina del resort**. Eso lo marca el nivel del resort (y vuestro presupuesto), no esta pregunta.\n2. Dentro de un **mismo resort**, el **dine around es más caro** que el buffet con alguna cena especial. Si vais ajustados, el buffet os deja margen para una villa mejor o más noches.\n\nAquí elegís el **formato**: cómo coméis, no cómo de bien. Y que quede claro: buffet no significa comer mal. Hay buffets espectaculares, con producto de primera y estaciones en vivo.\n\n---\n\n### 🍽️ Dine Around\nTodas las cenas en los restaurantes de especialidad.\n\n✅ **A favor:** intimidad, cero bullicio y cenar en un sitio distinto cada noche. Como elegís de carta, las alergias y dietas se resuelven mucho mejor.\n\n❌ **En contra:** no es barra libre de carta. Elegís un entrante, un principal y un postre, y hay bastantes menos opciones que en un buffet. Es la opción más cara.\n\n---\n\n### 🍛 Buffet, más alguna cena especial\nEl buffet como base, que cambia de temática cada día —asiático, mediterráneo, maldivo— y, según el resort, una o dos cenas de especialidad.\n\n✅ **A favor:** coméis lo que queráis y probáis de todo. Si tenéis gustos distintos o mucho apetito, eso no os lo da ningún restaurante a la carta.\n\n❌ **En contra:** es el comedor principal: más concurrido y menos íntimo, y en luna de miel eso se nota.\n\n---\n\n> **Lo que casi nadie mira:** el dine around no tiene por qué incluir todos los restaurantes del resort. Puede cubrir tres de cinco, y los dos mejores quedarse fuera. La pregunta no es «tiene dine around», sino «qué restaurantes entran» — y eso os lo miramos nosotros antes de recomendaros nada."
        },
        dependsOn: { questionId: 'nivel_despreocupacion', optionId: 'B' },
        options: [
          {
            id: 'A',
            label: "🍽️ Dine Around",
            description: "Todas las cenas a la carta en los restaurantes de especialidad. Plato recién hecho, cero bullicio y un sitio distinto cada noche. La opción más cara."
          },
          {
            id: 'B',
            label: "🍛 Buffet, más alguna cena especial",
            description: "El buffet como base, que cambia de temática a diario, y según el resort una o dos cenas de especialidad. Más variedad y cantidad, y más económico."
          },
        ]
      }
    ]
  },
  {
    id: 'screen-2-vibe',
    type: StepType.QUESTIONS,
    title: "EL VIBE & EL AMBIENTE",
    questions: [
      {
        id: 'atmosfera_isla',
        title: "¿Cómo imagináis la atmósfera y el espacio de la isla en vuestro día a día?",
        infoBox: {
          title: "INFO PARA DECIDIR MEJOR",
          text: "En Maldivas, el tamaño de la isla define vuestra experiencia de viaje.\n\n---\n\n### 🏝️ Islas pequeñas\nSe recorren fácilmente a pie en menos de 10-15 minutos.\n\n✅ **A favor:** Intimidad total, sensación de 'náufrago' y libertad de no depender de transporte.\n\n❌ **En contra:** Menos variedad de restaurantes e instalaciones. A veces pueden resultar algo claustrofóbicas.\n\n---\n\n### 🚲 Islas grandes\nEs habitual moverse en bicicleta o buggy para llegar a los distintos puntos de la isla.\n\n✅ **A favor:** Mucha selva para explorar, gran variedad de restaurantes, bares y actividades.\n\n❌ **En contra:** Menos sensación de aislamiento. No todos los resorts ofrecen bicis (dependerás de llamar a un buggy).\n\n---\n\n### ✨ El Vibe de la isla\nAparte del tamaño, el ambiente social es clave:\n\n*   **Explorador Solitario:** Islas grandes pero con muy pocos huéspedes. Buscamos privacidad y calma absoluta.\n*   **Paraíso Vibrante:** Resorts dinámicos con música en la piscina, bares animados y mucha vida social."
        },
        options: [
          { 
            id: 'A', 
            label: "La Isla Romántica", 
            description: "Isla pequeña e íntima para recorrer a pie. Paz absoluta y sensación de 'náufrago'." 
          },
          { 
            id: 'B', 
            label: "El Explorador Solitario", 
            description: "Isla grande con mucha selva y espacios amplios. Privacidad y aislamiento total." 
          },
          { 
            id: 'C', 
            label: "El Paraíso Vibrante", 
            description: "Isla grande con mucha vida, gran variedad de restaurantes y ambiente animado." 
          }
        ]
      }
    ]
  },
  {
    id: 'screen-3-marine',
    type: StepType.QUESTIONS,
    title: "Fauna marina",
    questions: [
      {
        id: 'avistamiento_fauna',
        title: "🦈 ¿Os gustaría ver animales marinos grandes durante el viaje?",
        text: "Mantas · Tiburón ballena · Tiburón nodriza",
        options: [
          { id: 'A', label: "🙅‍♂️ No especialmente", description: "Con la experiencia del resort (playa/arrecife/ambiente) nos basta." },
          { id: 'B', label: "🦈 Sí, es prioridad", description: "Queremos ver mantas, tiburón ballena y tiburones nodriza." },
        ]
      },
      {
        id: 'logistica_fauna',
        title: "Si vuestra prioridad es ver fauna grande...",
        infoBox: {
          title: "INFO PARA DECIDIR MEJOR",
          text: "📌 **Nota rápida:** La fauna grande suele concentrarse en zonas muy concretas de Maldivas. Si es una prioridad, deberemos buscar un resort cercano a estas áreas, lo que limitará las opciones disponibles.\n\n⏱️ Estas excursiones desde los resorts tienen un coste adicional y suelen ser bastante más caras que desde las islas locales.\n\n🌴 Desde una isla local hay mucha más flexibilidad y mejores precios para realizar este tipo de excursiones. Además, las islas locales son **el auténtico Maldivas**, aunque hay que entender bien sus inconvenientes antes de decidir. Echa un vistazo a nuestra [guía de isla local y resort](https://kakunitravels.com/isla-local-resort-en-maldivas-luna-de-miel-aventurera/) para conocer todos los pros e inconvenientes."
        },
        dependsOn: { questionId: 'avistamiento_fauna', optionId: 'B' },
        options: [
          { id: 'A', label: "Combinar isla local + resort", chip: "min 6-7 noches", imageUrl: "https://kakunitravels.com/wp-content/uploads/2026/06/isla-local-resort-finder.webp", description: "Queremos hacer las salidas ‘a los spots buenos’ desde una isla local y luego rematar con el relax del resort." },
          { id: 'B', label: "🏝️ Hacer las excursiones desde el resort", description: "Aceptamos precios más elevados por excursión, menos opciones disponibles y un número de resorts más limitado, a cambio de no cambiar de alojamiento." },
        ]
      },
      {
        id: 'tipo_animal',
        title: "¿Qué animal os gustaría ver?",
        dependsOn: { questionId: 'avistamiento_fauna', optionId: 'B' },
        infoBox: {
          title: "INFO PARA DECIDIR MEJOR",
          text: "Delfines es una excursión que se puede hacer desde cualquier resort."
        },
        options: [
          { id: 'A', label: "Mantas", imageUrl: "https://kakunitravels.com/wp-content/uploads/2026/04/manta-rasdhoo.webp" },
          { id: 'B', label: "Tiburón ballena", imageUrl: "https://kakunitravels.com/wp-content/uploads/2026/04/whale-sahrky.webp" },
          { id: 'C', label: "Tiburón nodriza", imageUrl: "https://kakunitravels.com/wp-content/uploads/2026/03/mejor_fotograma_video1.webp" },
          { id: 'D', label: "Nos da igual", isHighlighted: true }
        ]
      }
    ]
  },
  {
    id: 'screen-4-snorkel',
    type: StepType.QUESTIONS,
    title: "Snorkel y vida marina",
    questions: [
      {
        id: 'experiencia_snorkel',
        title: "🧜‍♀️ ¿Cómo os gustaría vivir el snorkel en el resort?",
        infoBox: {
          title: "INFO PARA DECIDIR MEJOR",
          text: "La mejor vida marina suele encontrarse en las paredes del arrecife, justo donde el agua empieza a hacerse profunda.\n\nEn el arrecife es habitual ver multitud de peces, tortugas, tiburones de arrecife (inofensivos) o mantas águila. Sin embargo, es muy difícil ver mantas, tiburones ballena o tiburones nodriza haciendo simplemente snorkel desde la playa.\n\n> ⚠️ **¡Atención!** No todos los resorts tienen un buen arrecife para hacer snorkel: a veces el coral está dañado, y otras veces la isla está rodeada por una inmensa laguna de arena blanca y agua turquesa (preciosa para bañarse, pero sin profundidad ni corales para ver peces)."
        },
        warningBox: "ADVERTENCIA: que un resort tenga un buen arrecife, no significa que toda la isla tiene buen arrecife, significa que es de fácil acceso desde la orilla del resort.",
        options: [
          {
            id: 'A',
            label: "No es prioridad, preferimos una laguna turquesa",
            imageUrl: "https://kakunitravels.com/wp-content/uploads/2026/06/resort-con-laguna.webp",
            description: "No haremos snorkel (con laguna de agua turquesa nos basta)."
          },
          { 
            id: 'B', 
            label: "✅ Sí, queremos, pero no somos unos locos del snorkel", 
            description: "Queremos una laguna azul para bañarnos y poder salir en barco (incluido en el precio) a zonas cercanas para hacer snorkel.", 
            hiddenIf: { questionId: 'nivel_despreocupacion', optionIds: ['B', 'C'] } 
          },
          {
            id: 'C',
            label: "Sí, pero tiene que ser de fácil acceso desde el resort",
            imageUrl: "https://kakunitravels.com/wp-content/uploads/2026/06/resort-snorkel.webp",
            description: "House reef potente para snorkel desde la playa casi a diario, aunque apenas haya laguna azul."
          },
        ]
      }
    ]
  },
  {
    id: 'screen-5-villa',
    type: StepType.QUESTIONS,
    title: "LA VILLA",
    questions: [
      {
        id: 'diseno_habitacion',
        title: "¿Qué tipo de diseño en la habitación buscáis?",
        options: [
          { id: 'A', label: "Villa de lujo estilo Tropical y Rústico", description: "Techos de paja, madera noble y calidez natural en armonía con la isla.", imageUrl: "https://kakunitravels.com/wp-content/uploads/2026/03/classic-room.webp" },
          { id: 'B', label: "Villa de diseño Moderno y Chic", description: "Arquitectura contemporánea, espacios abiertos y líneas rectas minimalistas.", imageUrl: "https://kakunitravels.com/wp-content/uploads/2026/03/modern-rooms.webp" },
          { id: 'C', label: "✨ Nos gustan ambos estilos", description: "No tenemos preferencia clara mientras sea bonita." },
        ]
      }
    ]
  },
  {
    id: 'screen-6-logistics',
    type: StepType.QUESTIONS,
    title: "LOGÍSTICA",
    questions: [
      {
        id: 'tipo_traslado',
        title: "¿Qué tipo de traslado deseáis?",
        infoBox: {
          title: "INFO PARA DECIDIR MEJOR",
          text: "[COLUMN_START] 🚤 **Lancha rápida:**\nPara resorts cerca de la capital (Malé).\n\n✅ **A favor:** acceso rápido, la opción más económica, operan hasta las 10 pm.\n\n❌ **En contra:** zona más masificada. Más ruido de aviones. [COLUMN_BREAK] 🛩️ **Hidroavión:**\nDa acceso a resorts más alejados de la capital.\n\n✅ **A favor:** experiencia más auténtica, resorts más puros y lejanos.\n\n❌ **En contra:** más costosa, no opera de noche, a veces hay esperas. [COLUMN_BREAK] ✈️ **Vuelo doméstico:**\nDa acceso a los resorts más alejados de la capital (Malé).\n\n✅ **A favor:** permite llegar a los atolones más remotos y vírgenes.\n\n❌ **En contra:** requiere traslado adicional en lancha desde el aeropuerto local. [COLUMN_END]"
        },
        warningBox: "⚠️ **Recomendación:** A no ser que os mareéis en lancha rápida, tengáis miedo a los aviones pequeños o busquéis el precio más económico, os recomendamos escoger la opción **'Nos da igual'**. Esto evitará descartar resorts increíbles solo por el tipo de traslado.",
        options: [
          { id: 'A', label: "Traslado en lancha rápida privada", imageUrl: "https://kakunitravels.com/wp-content/uploads/2026/03/speedboat-transfer-services-at-male-airport.webp" },
          { id: 'B', label: "Vuelo panorámico en hidroavión", imageUrl: "https://images.unsplash.com/photo-1512100356356-de1b84283e18?auto=format&fit=crop&w=800&q=80" },
          { id: 'C', label: "Traslado en vuelo doméstico regional", imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80" },
          { id: 'D', label: "Nos da igual", description: "Opción recomendada para no descartar resorts increíbles.", isHighlighted: true },
        ]
      }
    ]
  },
  {
    id: 'screen-priorities',
    type: StepType.QUESTIONS,
    title: "VUESTRAS PRIORIDADES",
    questions: [
      {
        id: 'filtros_eliminatorios',
        title: "¿Qué es imprescindible para vosotros?",
        warningBox: "⚠️ Seleccionad los puntos que consideréis **no negociables**. El sistema descartará cualquier resort que no cumpla exactamente con lo que hayáis respondido anteriormente.",
        isMultiSelect: true,
        options: [
          { id: 'nivel_despreocupacion', label: "Nivel de Despreocupación (Todo Incluido)" },
          { id: 'perfil_foodie', label: "Buffet o dine around" },
          { id: 'atmosfera_isla', label: "Atmósfera y tamaño de la isla" },
          { id: 'experiencia_snorkel', label: "Experiencia de Snorkel" },
          { id: 'avistamiento_fauna', label: "Avistamiento de Fauna grande" },
          { id: 'diseno_habitacion', label: "Diseño de la habitación" },
          { id: 'tipo_traslado', label: "Tipo de traslado" },
        ]
      }
    ]
  },
  {
    id: 'screen-comments',
    type: StepType.COMMENTS,
    title: "PETICIONES ESPECIALES"
  },
  {
    id: 'screen-1-contact',
    type: StepType.CONTACT,
    title: "TUS DATOS"
  },
  {
    id: 'screen-7-results',
    type: StepType.RESULTS,
    title: "TUS MEJORES OPCIONES"
  }
];