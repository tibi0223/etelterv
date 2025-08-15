
export interface Recipe {
  név: string;
  hozzávalók: any[]; // Módosítva: lehet string[] vagy objektum[]
  elkészítés: string;
  elkészítésiIdő?: string;
  főzésiIdő?: string; // Főzési idő hozzáadása
  adagok?: string; // Adagok hozzáadása
  fehérje?: string;
  szénhidrát?: string;
  zsír?: string;
  kalória?: string;
  képUrl?: string;
  kép?: string; // Hozzáadva: alternatív kép mező
  kategória?: string;
  típus?: string;
}

export interface MealPlan {
  [mealType: string]: {
    mealType: string;
    recipe: Recipe | null;
    error?: string;
  };
}

export interface FoodData {
  mealTypes: {
    [key: string]: {
      categories: {
        [key: string]: string[];
      };
    };
  };
}
