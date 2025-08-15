import { Recipe } from "@/types/recipe";
import { Clock, Users } from "lucide-react";

interface RecipeContentProps {
  recipe: Recipe;
  compact?: boolean;
  isFullScreen?: boolean;
}

export function RecipeContent({ recipe, compact = false, isFullScreen = false }: RecipeContentProps) {
  // Töröld a convertGoogleDriveUrl függvényt

  const formatIngredients = (ingredients: any[]) => {
    if (!ingredients || !Array.isArray(ingredients)) {
      console.warn('RecipeContent: ingredients is not an array:', ingredients);
      return [];
    }
    
    return ingredients
      .filter(ingredient => {
        if (typeof ingredient === 'string') {
          return ingredient && ingredient.trim() !== '';
        } else if (ingredient && typeof ingredient === 'object') {
          // Ha objektum, próbáljuk meg a 'Élelmiszerek' mezőt használni
          return ingredient['Élelmiszerek'] && ingredient['Élelmiszerek'].trim() !== '';
        }
        return false;
      })
      .map(ingredient => {
        if (typeof ingredient === 'string') {
          return ingredient.trim();
        } else if (ingredient && typeof ingredient === 'object') {
          // Ha objektum, formázzuk a megjelenítést
          const name = ingredient['Élelmiszerek'] || '';
          const quantity = ingredient['Mennyiség'] || '';
          const unit = ingredient['Mértékegység'] || '';
          return `${name} ${quantity} ${unit}`.trim();
        }
        return '';
      })
      .filter(item => item !== '');
  };

  const formatInstructions = (instructions: string) => {
    if (!instructions) return [];
    
    const cleanInstructions = instructions.trim();
    console.log('🔍 RecipeContent - Eredeti elkészítés:', cleanInstructions);
    
    // Új fejlett formázás: főbekezdések (számozás) és albekezdések (o-val)
    const sections = [];
    const lines = cleanInstructions.split('\n').map(line => line.trim()).filter(line => line);
    
    let currentMainStep = null;
    let currentSubSteps = [];
    
    for (const line of lines) {
      // Főbekezdés felismerése (1., 2., 3., stb.)
      const mainStepMatch = line.match(/^(\d+)\.\s*(.*)/);
      if (mainStepMatch) {
        // Ha van előző főlépés, zárjuk le
        if (currentMainStep) {
          sections.push({
            type: 'main',
            number: currentMainStep.number,
            content: currentMainStep.content,
            subSteps: [...currentSubSteps]
          });
        }
        
        // Új főlépés kezdése
        currentMainStep = {
          number: mainStepMatch[1],
          content: mainStepMatch[2]
        };
        currentSubSteps = [];
        continue;
      }
      
      // Albekezdés felismerése (o-val kezdődik)
      const subStepMatch = line.match(/^o\s*(.*)/);
      if (subStepMatch) {
        currentSubSteps.push(subStepMatch[1]);
        continue;
      }
      
      // Ha nincs strukturálva, de van aktív főlépés, hozzáadjuk a tartalmához
      if (currentMainStep && line) {
        currentMainStep.content += ' ' + line;
        continue;
      }
      
      // Ha nincs strukturálva és nincs aktív főlépés, akkor egy egyszerű bekezdés
      if (line) {
        sections.push({
          type: 'simple',
          content: line
        });
      }
    }
    
    // Az utolsó főlépés hozzáadása, ha van
    if (currentMainStep) {
      sections.push({
        type: 'main',
        number: currentMainStep.number,
        content: currentMainStep.content,
        subSteps: [...currentSubSteps]
      });
    }
    
    // Ha nem találtunk semmilyen strukturálást, az egész szöveget egy egyszerű bekezdésként kezeljük
    if (sections.length === 0 && cleanInstructions) {
      sections.push({
        type: 'simple',
        content: cleanInstructions
      });
    }
    
    console.log('📝 Formázott elkészítési lépések:', sections);
    return sections;
  };

  // Compact mód a többnapos étrendtervezőhöz
  if (compact) {
    return (
      <div className="space-y-2">
        <h4 className="font-semibold text-white text-sm">{recipe.név}</h4>
        {(recipe.főzésiIdő || recipe.adagok) && (
          <div className="flex gap-2 text-xs text-white/70">
            {recipe.főzésiIdő && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {recipe.főzésiIdő}
              </span>
            )}
            {recipe.adagok && (
              <span className="flex items-center gap-1">
                <Users className="w-3 h-3" />
                {recipe.adagok}
              </span>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Recept címe és képe - kompaktabb */}
      <div className="text-center space-y-2 sm:space-y-3">
        <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-white flex items-center justify-center gap-2 px-2">
          🍽️ {recipe.név}
        </h2>
        
        {/* Recept kép - kisebb méret */}
        {(recipe.képUrl || recipe.kép) && (
          <div className="w-full max-w-xs sm:max-w-sm mx-auto px-2">
            {console.log('🖼️ Recept kép betöltés:', recipe.név, 'URL:', recipe.képUrl || recipe.kép)}
            <img
              src={recipe.képUrl || recipe.kép || ''}
              alt={recipe.név}
              className="w-full h-64 object-cover rounded-lg shadow-lg"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
              onLoad={() => {
                console.log('Image loaded successfully:', recipe.képUrl || recipe.kép || '');
              }}
            />
          </div>
        )}

        {/* Főzési idő és adag - kompaktabb */}
        <div className="flex justify-center gap-2 sm:gap-3 text-white/80 px-2">
          {recipe.főzésiIdő && (
            <div className="flex items-center gap-1 bg-white/10 px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm">
              <Clock className="w-3 h-3" />
              <span>{recipe.főzésiIdő}</span>
            </div>
          )}
          {recipe.adagok && (
            <div className="flex items-center gap-1 bg-white/10 px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm">
              <Users className="w-3 h-3" />
              <span>{recipe.adagok}</span>
            </div>
          )}
        </div>
      </div>

      {/* Hozzávalók - kompaktabb */}
      <div className="bg-white/5 rounded-lg p-3 sm:p-4 mx-2 sm:mx-0">
        <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2">
          🥕 Hozzávalók:
        </h3>
        <ul className="space-y-1">
          {formatIngredients(recipe.hozzávalók).map((ingredient, index) => (
            <li key={index} className="text-white/90 flex items-start gap-2 text-xs sm:text-sm">
              <span className="text-yellow-400 mt-0.5">•</span>
              <span>{ingredient}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Elkészítés - strukturált formázás */}
      <div className="bg-white/5 rounded-lg p-3 sm:p-4 mx-2 sm:mx-0">
        <h3 className="text-sm sm:text-base md:text-lg font-semibold text-white mb-2 sm:mb-3 flex items-center gap-1 sm:gap-2">
          👨‍🍳 Elkészítés:
        </h3>
        <div className="space-y-3">
          {formatInstructions(recipe.elkészítés).map((item, index) => {
            if (item.type === 'main') {
              return (
                <div key={index} className="space-y-2">
                  {/* Főbekezdés - számozással */}
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                      {item.number}
                    </div>
                    <div className="text-white/90 text-xs sm:text-sm leading-relaxed font-medium">
                      {item.content}
                    </div>
                  </div>
                  
                  {/* Albekezdések - o-val jelölt lépések */}
                  {item.subSteps && item.subSteps.length > 0 && (
                    <div className="ml-9 space-y-1">
                      {item.subSteps.map((subStep, subIndex) => (
                        <div key={subIndex} className="flex items-start gap-2">
                          <span className="text-yellow-400 mt-1">◦</span>
                          <span className="text-white/80 text-xs sm:text-sm leading-relaxed">
                            {subStep}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            } else {
              // Egyszerű bekezdés
              return (
                <div key={index} className="flex items-start gap-2">
                  <span className="text-yellow-400 mt-0.5">•</span>
                  <span className="text-white/90 text-xs sm:text-sm leading-relaxed">
                    {item.content}
                  </span>
                </div>
              );
            }
          })}
        </div>
      </div>
    </div>
  );
}
