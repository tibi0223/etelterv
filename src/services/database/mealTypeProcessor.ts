
import { supabase } from '@/integrations/supabase/client';
import { normalizeText } from './textUtils';

// Meal types meghatározása az Étkezések tábla alapján RECEPTNÉV szerint
export const determineMealTypesForRecipe = async (recipeName: string): Promise<string[]> => {
  console.log('🔍 Meal types meghatározása recepthez:', recipeName);
  
  const { data: mealTypesData, error } = await supabase
    .from('Étkezések')
    .select('*');

  if (error) {
    console.error('❌ Étkezések tábla lekérési hiba:', error);
    return [];
  }

  if (!mealTypesData || mealTypesData.length === 0) {
    console.warn('⚠️ Étkezések tábla üres!');
    return [];
  }

  console.log('📊 Étkezések tábla adatok:', mealTypesData.length, 'sor');

  const normalizedRecipeName = normalizeText(recipeName);
  const mealTypes: string[] = [];

  // Keresés az Étkezések táblában a recept nevével
  const matchingRows = mealTypesData.filter(row => {
    const rowRecipeName = row['Recept Neve'];
    if (!rowRecipeName) return false;
    
    const normalizedRowName = normalizeText(rowRecipeName);
    
    // Pontos egyezés vagy tartalmazás
    const exactMatch = normalizedRowName === normalizedRecipeName;
    const contains = normalizedRowName.includes(normalizedRecipeName) || normalizedRecipeName.includes(normalizedRowName);
    
    return exactMatch || contains;
  });

  console.log(`🔍 "${recipeName}" egyezések az Étkezések táblában:`, matchingRows.length);

  if (matchingRows.length > 0) {
    matchingRows.forEach(matchingRow => {
      console.log(`✅ Találat: "${recipeName}" → "${matchingRow['Recept Neve']}"`);
      
      // Ellenőrizzük az összes étkezési típust
      const mealTypeColumns = ['Reggeli', 'Tízórai', 'Ebéd', 'Uzsonna', 'Vacsora', 'Leves', 'Előétel', 'Desszert', 'Köret'];
      
      mealTypeColumns.forEach(mealType => {
        const cellValue = matchingRow[mealType];
        
        // X vagy x jelzi, hogy az étkezési típushoz tartozik
        if (cellValue && (
          cellValue.toString().toLowerCase().includes('x') || 
          cellValue === '1' || 
          cellValue === 1 ||
          cellValue === 'X' ||
          cellValue === 'x'
        )) {
          const normalizedMealType = mealType.toLowerCase();
          if (!mealTypes.includes(normalizedMealType)) {
            mealTypes.push(normalizedMealType);
            console.log(`✅ "${recipeName}" → "${normalizedMealType}" (érték: ${cellValue})`);
          }
        }
      });
    });
  } else {
    console.log(`⚠️ "${recipeName}" nem található az Étkezések táblában`);
  }

  return mealTypes;
};
