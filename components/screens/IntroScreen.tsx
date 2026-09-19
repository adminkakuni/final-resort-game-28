import { Button } from '../Button';
import { useState, useEffect } from 'react';

interface IntroScreenProps {
    onNext: () => void;
}

export const IntroScreen: React.FC<IntroScreenProps> = ({ onNext }) => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => setIsMobile(window.innerWidth < 768);
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    const bgImage = isMobile 
        ? "https://kakunitravels.com/wp-content/uploads/2026/04/home-cellphone.webp"
        : "https://kakunitravels.com/wp-content/uploads/2026/04/pareja-playa-original-scaled.webp";

    return (
      <div 
        className="min-h-screen flex flex-col items-center justify-center p-4 md:p-6 relative overflow-hidden bg-cover bg-center bg-fixed"
        style={{ backgroundImage: `url("${bgImage}")` }}
      >
        {/* Capa oscura superpuesta para no comerse el contraste del texto */}
        <div className="absolute inset-0 bg-slate-900/15 backdrop-blur-[2px]"></div>

        <div className="max-w-3xl text-center space-y-6 md:space-y-10 animate-fade-in-up relative z-10 bg-white/80 backdrop-blur-xl px-6 py-10 md:p-14 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl border border-white/60">
            <div className="space-y-3 md:space-y-5">
                <span className="text-[10px] md:text-xs font-bold tracking-[0.2em] md:tracking-[0.25em] uppercase text-sky-800 bg-sky-100/80 px-4 md:px-5 py-1.5 md:py-2 rounded-full inline-block backdrop-blur-sm">
                    Expertos en Maldivas
                </span>
                <h1 className="font-serif text-3xl md:text-6xl text-gray-900 leading-tight">
                    Encuentra vuestro <br/><span className="italic text-sky-800">resort ideal</span>
                </h1>
            </div>
            
            <div className="space-y-4 md:space-y-6 text-base md:text-lg text-gray-700 leading-relaxed max-w-2xl mx-auto">
                <p className="px-2">
                    Las Maldivas tienen más de 170 resorts y el gran problema es que <strong>todos parecen exactamente iguales</strong>.
                </p>
                <div className="bg-white/60 md:bg-white/80 p-5 md:p-8 rounded-2xl md:rounded-3xl border border-white/50 shadow-sm text-left space-y-4 md:space-y-5">
                    <p className="text-gray-900 flex items-start gap-3 md:gap-4">
                        <span className="text-2xl md:text-3xl leading-none">✨</span>
                        <span className="pt-0.5 text-[15px] md:text-lg">
                            Hemos analizado las mejores opciones <strong>basándonos en nuestra experiencia visitando los resorts</strong>.
                        </span>
                    </p>
                    <hr className="border-gray-100/50"/>
                    <p className="text-gray-900 flex items-start gap-3 md:gap-4">
                        <span className="text-2xl md:text-3xl leading-none">🎯</span>
                        <span className="pt-0.5 text-[15px] md:text-lg">
                            Responde a este quiz de 2 minutos para que aislemos <strong>las únicas opciones</strong> que realmente encajan con vosotros.
                        </span>
                    </p>
                </div>
            </div>

            <div className="pt-8 flex justify-center">
                <button 
                  onClick={onNext} 
                  aria-label="Empezar quiz para encontrar resort ideal en Maldivas"
                  className="group relative overflow-hidden inline-flex items-center justify-center gap-4 bg-gradient-to-r from-[#00d1a0] via-[#00e3ae] to-[#00d1a0] text-white px-10 md:px-14 py-5 md:py-6 rounded-full shadow-[0_10px_40px_-5px_rgba(0,209,160,0.3)] hover:shadow-[0_20px_50px_-10px_rgba(0,209,160,0.5)] transition-all duration-500 hover:-translate-y-1"
                >
                    <div className="absolute inset-0 border border-white/20 rounded-full"></div>
                    <span className="relative z-10 font-medium tracking-[0.25em] text-sm md:text-base">
                        EMPEZAR A DESCUBRIR
                    </span>
                    <svg className="relative z-10 w-5 h-5 text-white/70 group-hover:text-white group-hover:translate-x-2 transition-all duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                    {/* Efecto de brillo de lujo al pasar el ratón */}
                    <div className="absolute top-0 -inset-full h-full w-1/2 z-5 block transform -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 group-hover:animate-[shimmer_1.5s_infinite] transition-all duration-1000 group-hover:translate-x-[300%]"></div>
                </button>
            </div>
        </div>
      </div>
    );
};
