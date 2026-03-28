import { StepConfig, StepType } from "./types";

// ==========================================
// CONFIGURABLE CONSTANTS
// ==========================================
export const WEBHOOK_URL_CONTACT = "https://hook.eu1.make.com/yvnhm6uytu7veya258etmeqmwlhbn5pe";
export const WEBHOOK_URL_RESULTS = "https://hook.eu1.make.com/hhuk383ie4x4y74krmuajt4abw6cfeq6";
export const YOUTUBE_URL = "https://www.youtube.com/embed/dQw4w9WgXcQ"; // PLACEHOLDER (Rick Roll for demo safely)
export const PRIVACY_URL = "#"; // PLACEHOLDER

// ==========================================
// QUIZ CONTENT
// ==========================================

export const STEPS: StepConfig[] = [
  {
    id: 'intro',
    type: StepType.INTRO,
  },
  {
    id: 'screen-1-contact',
    type: StepType.CONTACT,
    title: "TUS DATOS"
  },
  {
    id: 'screen-2-todo-incluido',
    type: StepType.QUESTIONS,
    title: "EL TODO INCLUIDO",
    youtubeId: YOUTUBE_URL,
    questions: [
      {
        id: 'q_despreocupacion',
        title: "¿Qué nivel de despreocupación buscáis en el resort en cuanto a comidas, bebidas y actividades?",
        warningBox: "⚠️ Atención: Esta es una pregunta eliminatoria. Los resorts que no cumplan con tu elección en este punto serán descartados automáticamente de tus resultados finales.",
        infoBox: {
          title: "INFO PARA DECIDIR MEJOR",
          text: "✨ La opción A: Parejas a las que les guste comer, beber y hacer actividades en el resort.\n\n✨ La opción B: Parejas que buscan características muy específicas de resort, como habitaciones espaciosas, lagunas azules increíbles, comida gourmet, sin diques de protección en el agua, housereefs increíbles, etc.\n\n✨ La opción C: Parejas de alto poder adquisitivo, con gustos refinados."
        },
        options: [
          { 
            id: 'A', 
            label: "Todo incluido con actividades", 
            description: "Incluye ciertas actividades, masaje o cena romántica, comida y bebida alcohólica.\n\n✅ A favor: 0 preocupaciones, para no sacar la cartera allí, gran valor por euro invertido.\n❌ En contra: min. 4 noches, limita el número de resorts." 
          },
          { 
            id: 'B', 
            label: "Todo Incluido", 
            description: "Solo comidas y bebidas (alcohólicas y no alcohólicas). Pagaremos las actividades extra que nos apetezcan allí.\n\n✅ A favor: min. 3 noches, mayoría de los resorts (gama media, alta y muy alta).\n❌ En contra: espera tener una factura al final del viaje." 
          },
          { 
            id: 'C', 
            label: "Media Pensión / Pensión Completa", 
            description: "Ideal para quienes buscan una experiencia gastronómica y de alojamiento superior.\n\n✅ A favor: servicio, comidas y habitaciones muy premium.\n❌ En contra: pocos resorts de altísimo nivel." 
          },
        ]
      },
      {
        id: 'q5',
        title: "Perfil Foodie",
        infoBox: {
          title: "INFO PARA DECIDIR MEJOR",
          text: "Tras inspeccionar decenas de resorts, hemos comprobado que la gastronomía es el factor #1 que dispara el precio.\n\nDada nuestra rica cultura gastronómica, la comida suele ser un punto crítico. En ninguno de los resorts que hemos seleccionado comeréis mal, pero la experiencia culinaria es subjetiva y depende de vuestras expectativas. No se trata solo de elegir entre buffet o a la carta, sino de la calidad de la materia prima y la elaboración de cada plato.\n\n*Nota: En los restaurantes tipo buffet, la temática de la comida cambia cada día para garantizar variedad.*"
        },
        dependsOn: { questionId: 'q_despreocupacion', optionId: 'B' },
        options: [
          { 
            id: 'A', 
            label: "🍽️ Gourmet a la Carta", 
            description: "Buffet para desayunar y el resto de comidas a la carta o menú degustación en restaurantes de especialidad.\n\n✅ A favor: Alta cocina y platos preparados al momento con ingredientes premium.\n❌ En contra: El presupuesto necesario es más elevado." 
          },
          { 
            id: 'B', 
            label: "🍛 Nos gusta comer bien", 
            description: "La mayoría de las comidas son tipo buffet, combinadas con una o dos cenas a la carta en restaurantes de especialidad de muy buen nivel.\n\n✅ A favor: Excelente equilibrio entre la variedad del buffet y cenas especiales de alta calidad.\n❌ En contra: La mayor parte de las comidas del viaje serán en formato buffet." 
          },
          { 
            id: 'C', 
            label: "🥪 Básico", 
            description: "Con el restaurante principal tipo buffet tenemos más que suficiente para disfrutar.\n\n✅ A favor: Es la opción más económica y ofrece mucha variedad diaria.\n❌ En contra: Se come siempre en el mismo restaurante y la calidad es más estándar." 
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
        id: 'q1',
        title: "¿Cómo imagináis la atmósfera y el espacio de la isla en vuestro día a día?",
        infoBox: {
          title: "INFO PARA DECIDIR MEJOR",
          text: "En Maldivas, el tamaño de la isla define vuestra experiencia:\n\n🏝️ **Islas pequeñas:** Se recorren fácilmente a pie. No es necesario usar transporte ni bicicletas, aunque para algunos pueden resultar algo claustrofóbicas y suelen tener menos opciones de restaurantes.\n\n🚲 **Islas grandes:** Es habitual moverse en bicicleta o buggy. No todos los resorts ofrecen bicicletas; en ese caso, se depende de concertar buggies con el conserje para poder desplazarse."
        },
        options: [
          { 
            id: 'A', 
            label: "La Isla Romántica", 
            description: "\"Buscamos un rincón íntimo, tipo 'náufrago', donde podamos ir caminando a todas partes en 10 minutos. Preferimos tener menos restaurantes, pero sentir una paz absoluta y no tener que usar transporte\"." 
          },
          { 
            id: 'B', 
            label: "El Explorador Solitario (Isla grande + Aislamiento total)", 
            description: "\"Queremos una isla con mucha selva para perdernos y explorar la playa, pero con muy pocos huéspedes. Buscamos espacios grandes y no cruzarnos con casi nadie\"." 
          },
          { 
            id: 'C', 
            label: "El Paraíso Vibrante (Isla grande + Ambiente social)", 
            description: "\"Queremos un resort grande, dinámico y con vida. No nos importa usar buggies para movernos a cambio de tener 10 restaurantes distintos, música en la piscina, bares animados al atardecer y muchas instalaciones\"." 
          }
        ]
      }
    ]
  },
  {
    id: 'screen-3-marine',
    type: StepType.QUESTIONS,
    title: "Mar, snorkel y vida marina",
    questions: [
      {
        id: 'q3',
        title: "🧜‍♀️ ¿Cómo os gustaría vivir el snorkel en el viaje?",
        infoBox: {
          title: "INFO PARA DECIDIR MEJOR",
          text: "La mejor vida marina suele encontrarse en las paredes del arrecife, justo donde el agua empieza a hacerse profunda.\n\nNo todos los resorts tienen un buen arrecife para hacer snorkel: a veces el coral está dañado, y otras veces la isla está rodeada por una inmensa laguna de arena blanca y agua turquesa (preciosa para bañarse, pero sin profundidad ni corales para ver peces)."
        },
        warningBox: "ADVERTENCIA: que un resort tenga un buen arrecife, no significa que toda la isla tiene buen arrecife, significa que es de fácil acceso desde la orilla del resort.",
        options: [
          { 
            id: 'A', 
            label: "🙅‍♀️ No es prioridad", 
            description: "No haremos snorkel (con laguna de agua turquesa nos basta)." 
          },
          { 
            id: 'B', 
            label: "✅ Sí, queremos, pero no somos unos locos del snorkel", 
            description: "Queremos una laguna azul para bañarnos y poder salir en barco (incluido en el precio) a zonas cercanas para hacer snorkel.", 
            hiddenIf: { questionId: 'q_despreocupacion', optionIds: ['B', 'C'] } 
          },
          { 
            id: 'C', 
            label: "🌊 Sí, pero tiene que ser de fácil acceso desde el resort", 
            description: "Queremos un house reef potente y poder hacer snorkel desde la playa casi cada día. Nos da igual, que no haya practicamente laguna azul." 
          },
        ]
      },
      {
        id: 'q4',
        title: "Fauna grande",
        text: "🦈 Independientemente del snorkel: ¿os ilusiona ver fauna grande (mantas, tiburón ballena, tiburones nodriza)?",
        options: [
          { id: 'A', label: "🙅‍♂️ No especialmente", description: "Con la experiencia del resort (playa/arrecife/ambiente) nos basta." },
          { id: 'B', label: "🦈 Sí, es prioridad", description: "Queremos ver mantas, tiburón ballena y tiburones nodriza." },
        ]
      },
      {
        id: 'q4.1',
        title: "Si vuestra prioridad es ver fauna grande...",
        infoBox: {
          title: "INFO PARA DECIDIR MEJOR",
          text: "📌 **Nota rápida:** La fauna grande suele concentrarse en zonas muy concretas de Maldivas. Si es una prioridad, deberemos buscar un resort cercano a estas áreas, lo que limitará las opciones disponibles.\n\n⏱️ Estas excursiones desde los resorts tienen un coste adicional y suelen ser bastante más caras que desde las islas locales.\n\n🌴 Desde una isla local hay mucha más flexibilidad y mejores precios para realizar este tipo de excursiones."
        },
        dependsOn: { questionId: 'q4', optionId: 'B' },
        options: [
          { id: 'A', label: "🌴 Combinar isla local + resort", description: "Queremos hacer las salidas ‘a los spots buenos’ desde una isla local y luego rematar con el relax del resort." },
          { id: 'B', label: "🏝️ Hacer las excursiones desde el resort", description: "Preferimos quedarnos siempre en el resort por comodidad y cero cambios." },
        ]
      },
      {
        id: 'q4.2',
        title: "¿Qué animal os gustaría ver?",
        dependsOn: { questionId: 'q4.1', optionId: 'B' },
        infoBox: {
          title: "INFO PARA DECIDIR MEJOR",
          text: "Delfines es una excursión que se puede hacer desde cualquier resort."
        },
        options: [
          { id: 'A', label: "Mantas" },
          { id: 'B', label: "Tiburón ballena" },
          { id: 'C', label: "Tiburón nodriza" }
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
        id: 'q9',
        title: "¿Qué tipo de diseño en la habitación buscáis?",
        options: [
          { id: 'A', label: "🌴 Tropical/Rústico", description: "Techos de paja, madera, calidez.", imageUrl: "https://nueva.kakunitravels.com/wp-content/uploads/2026/03/classic-room.webp" },
          { id: 'B', label: "🤍 Moderno/Chic", description: "Blanco, cristal, líneas rectas.", imageUrl: "https://nueva.kakunitravels.com/wp-content/uploads/2026/03/modern-rooms.webp" },
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
        id: 'q11',
        title: "¿Qué tipo de traslado deseáis?",
        infoBox: {
          title: "INFO PARA DECIDIR MEJOR",
          text: "🚤 **Lancha rápida:**\nPara resorts cerca de la capital (Malé).\n\n✅ **a favor:** acceso rápido, la opción más económica, operan hasta las 10 pm.\n\n❌ **en contra:** zona más masificada de resorts. Más contaminación lumínica y ruido de aviones cuanto más cerca de Malé.\n\n🛩️ **Hidroavión:**\nDa acceso a resorts más alejados de la capital.\n\n✅ **a favor:** experiencia más auténtica, resorts más lejanos.\n\n❌ **en contra:** más costosa, no opera de noche, a veces esperas más largas.\n\n✈️ **Vuelo doméstico:**\nDa acceso a los resorts más alejados de la capital (Malé)."
        },
        warningBox: "⚠️ **Recomendación:** A no ser que os mareéis en lancha rápida, tengáis miedo a los aviones pequeños o busquéis el precio más económico, os recomendamos escoger la opción **'Nos da igual'**. Esto evitará descartar resorts increíbles solo por el tipo de traslado.",
        options: [
          { id: 'A', label: "Lancha rápida", imageUrl: "https://nueva.kakunitravels.com/wp-content/uploads/2026/03/speedboat-transfer-services-at-male-airport.webp" },
          { id: 'B', label: "Hidroavión", imageUrl: "https://images.unsplash.com/photo-1512100356356-de1b84283e18?auto=format&fit=crop&w=800&q=80" },
          { id: 'C', label: "Vuelo doméstico", imageUrl: "https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&w=800&q=80" },
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
        id: 'q_priorities',
        title: "¿Cuáles de estos aspectos son **imprescindibles** para vosotros?",
        text: "Seleccionad los puntos que consideréis no negociables. El sistema descartará cualquier resort que no cumpla exactamente con lo que hayáis respondido en estas preguntas anteriormente.",
        isMultiSelect: true,
        options: [
          { id: 'q_despreocupacion', label: "Nivel de Despreocupación (Todo Incluido)" },
          { id: 'q5', label: "Perfil Foodie (Gastronomía)" },
          { id: 'q1', label: "Atmósfera y tamaño de la isla" },
          { id: 'q3', label: "Experiencia de Snorkel" },
          { id: 'q4', label: "Avistamiento de Fauna grande" },
          { id: 'q9', label: "Diseño de la habitación" },
          { id: 'q11', label: "Tipo de traslado" },
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
    id: 'screen-7-results',
    type: StepType.RESULTS,
    title: "TUS MEJORES OPCIONES"
  }
];