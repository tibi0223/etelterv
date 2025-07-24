
export interface ReceptekV2 {
  'Recept ID': number;
  'Receptnév': string;
  'Elkészítése': string;
  'Kép': string;
  'Szenhidrat_g': number;
  'Feherje_g': number;
  'Zsir_g': number;
}

export interface ReceptAlapanyagV2 {
  'ID': string;
  'Recept_ID': number;
  'Élelmiszerek': string;
  'Mennyiség': number;
  'Mértékegység': string;
  'Élelmiszer ID': string;
  'Tipus'?: string;
  'Kotes'?: string;
}

export interface Alapanyag {
  ID: number;
  Elelmiszer: string;
  'Fehérje/100g': string;
  'Szénhidrát/100g': string;
  'Zsir/100g': string;
  'Kaloria/100g': string;
}

export interface CombinedRecipe {
  id: number;
  név: string;
  elkészítés: string;
  kép: string;
  szénhidrát: number;
  fehérje: number;
  zsír: number;
  kalória: number;
  hozzávalók: ReceptAlapanyagV2[];
  mealTypes: string[];
  Hozzarendelt_ID?: string;
  ingredients: ReceptAlapanyagV2[];
  Recept_Skálázhatóság: string;
}
