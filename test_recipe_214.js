// Manual calculation for Recipe 214
// Ingredients: Pulykamellfilé (147, 150g), Vörösbab (198, 150g), Paprika (137, 100g), 
// Lilahagyma (115, 20g), Kókuszolaj (103, 5g), Lime lé (116, 1g)

// Example macro values (need to get actual values from database)
const ingredients = [
  { id: 147, name: 'Pulykamellfilé', amount: 150, type: 'fő', 
    protein_per_100g: 25, carbs_per_100g: 0, fat_per_100g: 1, binding: null },
  { id: 198, name: 'Vörösbab (konzerv)', amount: 150, type: 'fő', 
    protein_per_100g: 8, carbs_per_100g: 22, fat_per_100g: 0.5, binding: null },
  { id: 137, name: 'Paprika', amount: 100, type: 'kiegészítő', 
    protein_per_100g: 1.9, carbs_per_100g: 6, fat_per_100g: 0.3, binding: null },
  { id: 115, name: 'Lilahagyma', amount: 20, type: 'ízesítő', 
    protein_per_100g: 1.1, carbs_per_100g: 9.3, fat_per_100g: 0.1, binding: null },
  { id: 103, name: 'Kókuszolaj', amount: 5, type: 'kiegészítő', 
    protein_per_100g: 0, carbs_per_100g: 0, fat_per_100g: 100, binding: null },
  { id: 116, name: 'Lime lé', amount: 1, type: 'ízesítő', 
    protein_per_100g: 0.4, carbs_per_100g: 7.7, fat_per_100g: 0.2, binding: null }
];

// Calculate totals by macro and type
let totalProtein = 0, totalCarbs = 0, totalFat = 0;
let independentProtein = 0, boundProtein = 0;
let independentCarbs = 0, boundCarbs = 0;
let independentFat = 0, boundFat = 0;
let totalDensityP = 0, totalDensityC = 0, totalDensityF = 0;
let ingredientCount = 0;

ingredients.forEach(ing => {
  const proteinInGram = (ing.protein_per_100g * ing.amount) / 100;
  const carbsInGram = (ing.carbs_per_100g * ing.amount) / 100;
  const fatInGram = (ing.fat_per_100g * ing.amount) / 100;
  
  totalProtein += proteinInGram;
  totalCarbs += carbsInGram;
  totalFat += fatInGram;
  
  // Independent vs bound classification
  if (!ing.binding) {
    independentProtein += proteinInGram;
    independentCarbs += carbsInGram;
    independentFat += fatInGram;
  } else {
    boundProtein += proteinInGram;
    boundCarbs += carbsInGram;
    boundFat += fatInGram;
  }
  
  // Density calculation
  totalDensityP += ing.protein_per_100g;
  totalDensityC += ing.carbs_per_100g;
  totalDensityF += ing.fat_per_100g;
  ingredientCount++;
  
  console.log(`${ing.name}: P=${proteinInGram.toFixed(1)}g, C=${carbsInGram.toFixed(1)}g, F=${fatInGram.toFixed(1)}g`);
});

console.log(`\nTOTALS: P=${totalProtein.toFixed(1)}g, C=${totalCarbs.toFixed(1)}g, F=${totalFat.toFixed(1)}g`);
console.log(`INDEPENDENT: P=${independentProtein.toFixed(1)}g, C=${independentCarbs.toFixed(1)}g, F=${independentFat.toFixed(1)}g`);

// Calculate scalability - CORRECT VERSION per specification
function calculateScalability(independent, bound, total, avgDensity, refDensity, isPureFat = false) {
  if (total === 0) return 0; // No artificial minimum
  
  const independentRatio = independent / total;
  const boundRatio = bound / total;
  
  // original_skala_M = independent_ratio_M * 0.7 + (1 - bound_ratio_M) * 0.3
  const originalSkala = independentRatio * 0.7 + (1 - boundRatio) * 0.3;
  
  // new_skala_M = original_skala_M * (density_M / reference_density); cap at 1
  let newSkala = originalSkala * (avgDensity / refDensity);
  newSkala = Math.min(1.0, newSkala); // Cap at 1.0
  
  // For F: If density_F >80 (pure fat like oil), new_skala_F *=0.5
  if (isPureFat && avgDensity > 80) {
    newSkala *= 0.5; // 0.5x multiplier (not 0.3x)
  }
  
  return newSkala; // No artificial floor or ceiling beyond the cap at 1.0
}

const avgDensityP = ingredientCount > 0 ? totalDensityP / ingredientCount : 0;
const avgDensityC = ingredientCount > 0 ? totalDensityC / ingredientCount : 0;
const avgDensityF = ingredientCount > 0 ? totalDensityF / ingredientCount : 0;

const skalaP = calculateScalability(independentProtein, boundProtein, totalProtein, avgDensityP, 20);
const skalaC = calculateScalability(independentCarbs, boundCarbs, totalCarbs, avgDensityC, 50);
const skalaF = calculateScalability(independentFat, boundFat, totalFat, avgDensityF, 15, true);

console.log(`\nAVG DENSITIES: P=${avgDensityP.toFixed(1)}, C=${avgDensityC.toFixed(1)}, F=${avgDensityF.toFixed(1)}`);
console.log(`\nCALCULATED SCALABILITIES:`);
console.log(`Protein: ${skalaP.toFixed(3)} (DB: 0.141)`);
console.log(`Carbs: ${skalaC.toFixed(3)} (DB: 0.081)`);
console.log(`Fat: ${skalaF.toFixed(3)} (DB: 0.568)`);

console.log(`\nDETAILS:`);
console.log(`P - Independent ratio: ${(independentProtein/totalProtein).toFixed(3)}, Density factor: ${(avgDensityP/20).toFixed(3)}`);
console.log(`C - Independent ratio: ${(independentCarbs/totalCarbs).toFixed(3)}, Density factor: ${(avgDensityC/50).toFixed(3)}`);
console.log(`F - Independent ratio: ${(independentFat/totalFat).toFixed(3)}, Density factor: ${(avgDensityF/15).toFixed(3)}`);