
import { useState, useEffect } from "react";
import { ChefHat, Utensils } from "lucide-react";

interface LoadingChefProps {
  messages?: string[];
  className?: string;
}

const defaultMessages = [
  "🍳 A szakács épp készíti az ételt...",
  "👨‍🍳 Finomságok készülnek a konyhában...",
  "🥄 Hozzávalók összekeverése folyamatban...",
  "🔥 A tűzhely már melegszik...",
  "📖 Receptkönyv lapozása...",
  "✨ Varázsoljuk elő a tökéletes receptet...",
  "🍽️ Az ízek harmóniája születik...",
  "👨‍🍳 Mestermű készül a konyhában..."
];

export function LoadingChef({ messages = defaultMessages, className = "" }: LoadingChefProps) {
  const [currentMessage, setCurrentMessage] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentMessage((prev) => (prev + 1) % messages.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [messages.length]);

  return (
    <div className={`text-center py-12 ${className}`}>
      {/* Animált szakács ikon */}
      <div className="relative mb-8">
        <div className="relative mx-auto w-24 h-24">
          {/* Főzőedény */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-600 to-gray-800 rounded-full border-4 border-gray-400 shadow-2xl">
            {/* Leves animáció */}
            <div className="absolute top-4 left-4 right-4 bottom-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-full animate-pulse">
              {/* Buborékok */}
              <div className="absolute top-2 left-3 w-2 h-2 bg-orange-200 rounded-full animate-bounce"></div>
              <div className="absolute top-3 right-4 w-1.5 h-1.5 bg-orange-100 rounded-full animate-bounce animation-delay-500"></div>
              <div className="absolute bottom-3 left-1/2 w-1 h-1 bg-orange-200 rounded-full animate-bounce animation-delay-1000"></div>
            </div>
          </div>
          
          {/* Kanál */}
          <div className="absolute -top-2 right-2 transform rotate-45 animate-gentle-stir">
            <Utensils className="w-8 h-8 text-gray-300" />
          </div>
        </div>
        
        {/* Szakács sapka */}
        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ChefHat className="w-12 h-12 text-white drop-shadow-lg" />
        </div>
        
        {/* Gőz effekt */}
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2">
          <div className="flex gap-1">
            <div className="w-1 h-8 bg-white/40 rounded-full animate-pulse"></div>
            <div className="w-1 h-6 bg-white/30 rounded-full animate-pulse animation-delay-300"></div>
            <div className="w-1 h-7 bg-white/35 rounded-full animate-pulse animation-delay-600"></div>
          </div>
        </div>
      </div>

      {/* Forgó recept könyv ikon */}
      <div className="mb-6">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-white/30 border-t-white mx-auto shadow-lg"></div>
      </div>

      {/* Animált üzenet */}
      <div className="text-white text-xl font-semibold mb-2 min-h-[28px] transition-all duration-500">
        {messages[currentMessage]}
      </div>
      
      {/* Pontok animáció */}
      <div className="flex justify-center gap-1 mb-4">
        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce animation-delay-200"></div>
        <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce animation-delay-400"></div>
      </div>
      
      <div className="text-white/70 text-sm">Kérjük várjon...</div>
    </div>
  );
}
