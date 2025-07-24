import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, Clock, Users, Star } from "lucide-react";

interface User {
  id: string;
  email: string;
  fullName: string;
}

interface Recipe {
  név: string;
  hozzávalók: string[];
  elkészítés: string;
  elkészítésiIdő: string;
  szénhidrát: string;
  fehérje: string;
  zsír: string;
  képUrl: string;
}

interface MealPlan {
  mealType: string;
  category: string;
  ingredient: string;
  recipe: Recipe | null;
}

interface MealPlanGeneratorProps {
  user: User;
  selectedMealType?: string;
  onReset?: () => void;
}

export function MealPlanGenerator({ user, selectedMealType, onReset }: MealPlanGeneratorProps) {
  const [selectedMealTypes, setSelectedMealTypes] = useState<string[]>(
    selectedMealType ? [selectedMealType] : []
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedIngredient, setSelectedIngredient] = useState<string>('');
  const [mealPlan, setMealPlan] = useState<Record<string, MealPlan>>({});
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const mealTypes = [
    'reggeli',
    'tizórai', 
    'ebéd',
    'uzsonna',
    'vacsora',
    'leves'
  ];

  const foodCategories = {
    'húsfélék': ['darált pulykamell', 'csirkemellfilé', 'csirkemell sonka'],
    'halak': ['harcsafilé', 'tonhal konzerv', 'lazacfilé'],
    'zöldségek/vegetáriánus': ['sárgarépa', 'vöröshagyma', 'paradicsom'],
    'tejtermékek': ['tej', 'joghurt', 'sajt', 'túró'],
    'gyümölcsök': ['alma', 'ananász', 'őszibarack'],
    'gabonákéstészták': ['basmati rizs', 'hajdina', 'teljes kiőrlésű tészta'],
    'olajokésmagvak': ['zabpehely', 'zabliszt', 'kukoricakeményítő']
  };

  // Mock recipe data since we don't have access to your Supabase database
  const getMockRecipe = (mealType: string, ingredient: string): Recipe => {
    const mockRecipes: Record<string, Recipe[]> = {
      'reggeli': [
        {
          név: 'Almás Muffin Répával',
          hozzávalók: ['alma', 'répa', 'liszt', 'tojás', 'cukor'],
          elkészítés: 'Keverjük össze a hozzávalókat és süssük meg 180 fokon 25 percig.',
          elkészítésiIdő: '25 perc',
          szénhidrát: '45g',
          fehérje: '8g',
          zsír: '12g',
          képUrl: ''
        }
      ],
      'ebéd': [
        {
          név: 'Ananászos Csirke',
          hozzávalók: ['csirkemell', 'ananász', 'rizs', 'zöldségek'],
          elkészítés: 'Süssük meg a csirkemellet, adjuk hozzá az ananászt és a zöldségeket.',
          elkészítésiIdő: '30 perc',
          szénhidrát: '35g',
          fehérje: '28g',
          zsír: '8g',
          képUrl: ''
        }
      ]
    };

    const recipes = mockRecipes[mealType] || [{
      név: `${mealType.charAt(0).toUpperCase() + mealType.slice(1)} ${ingredient}rel`,
      hozzávalók: [ingredient, 'egyéb alapanyagok'],
      elkészítés: `Készítsük el a ${mealType}t ${ingredient} felhasználásával.`,
      elkészítésiIdő: '20 perc',
      szénhidrát: '30g',
      fehérje: '15g',
      zsír: '10g',
      képUrl: ''
    }];

    return recipes[Math.floor(Math.random() * recipes.length)];
  };

  const handleMealTypeChange = (mealType: string, checked: boolean) => {
    if (checked) {
      setSelectedMealTypes(prev => [...prev, mealType]);
    } else {
      setSelectedMealTypes(prev => prev.filter(mt => mt !== mealType));
    }
  };

  const generateMealPlan = async () => {
    if (selectedMealTypes.length === 0) {
      toast({
        title: "Hiba",
        description: "Válasszon ki legalább egy étkezési típust!",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      console.log('🍽️ Generating meal plan for:', selectedMealTypes);
      
      const newMealPlan: Record<string, MealPlan> = {};
      
      for (const mealType of selectedMealTypes) {
        const categories = Object.keys(foodCategories);
        const randomCategory = categories[Math.floor(Math.random() * categories.length)];
        const ingredients = foodCategories[randomCategory as keyof typeof foodCategories];
        const randomIngredient = ingredients[Math.floor(Math.random() * ingredients.length)];
        
        const recipe = getMockRecipe(mealType, randomIngredient);
        
        newMealPlan[mealType] = {
          mealType,
          category: randomCategory,
          ingredient: randomIngredient,
          recipe
        };
      }
      
      setMealPlan(newMealPlan);
      
      toast({
        title: "Étrend elkészült!",
        description: `${selectedMealTypes.length} étkezés megtervezve.`,
      });
      
    } catch (error) {
      console.error('❌ Meal plan generation error:', error);
      toast({
        title: "Hiba",
        description: "Hiba történt az étrend generálása közben.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const generateSpecificRecipe = async () => {
    if (!selectedCategory || !selectedIngredient) {
      toast({
        title: "Hiba",
        description: "Válasszon ki kategóriát és alapanyagot!",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const randomMealType = selectedMealType || mealTypes[Math.floor(Math.random() * mealTypes.length)];
      const recipe = getMockRecipe(randomMealType, selectedIngredient);
      
      const specificPlan: Record<string, MealPlan> = {
        [randomMealType]: {
          mealType: randomMealType,
          category: selectedCategory,
          ingredient: selectedIngredient,
          recipe
        }
      };
      
      setMealPlan(specificPlan);
      
      toast({
        title: "Recept elkészült!",
        description: `${randomMealType} recept generálva ${selectedIngredient} alapanyaggal.`,
      });
      
    } catch (error) {
      console.error('❌ Recipe generation error:', error);
      toast({
        title: "Hiba",
        description: "Hiba történt a recept generálása közben.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const rateRecipe = (recipeName: string, rating: number) => {
    toast({
      title: "Értékelés mentve!",
      description: `${recipeName} értékelése: ${'★'.repeat(rating)}${'☆'.repeat(5 - rating)}`,
    });
  };

  return (
    <div className="space-y-8">
      {/* Reset button if we have a selected meal type */}
      {selectedMealType && onReset && (
        <div className="text-center">
          <Button onClick={onReset} variant="outline">
            🔄 Vissza a főmenübe
          </Button>
        </div>
      )}

      {/* Meal Type Selection - only show if no specific meal type selected */}
      {!selectedMealType && (
        <Card>
          <CardHeader>
            <CardTitle>Étkezési típusok kiválasztása</CardTitle>
            <CardDescription>Válassza ki, mely étkezésekhez szeretne receptet generálni</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {mealTypes.map((mealType) => (
                <div key={mealType} className="flex items-center space-x-2">
                  <Checkbox
                    id={mealType}
                    checked={selectedMealTypes.includes(mealType)}
                    onCheckedChange={(checked) => handleMealTypeChange(mealType, checked as boolean)}
                  />
                  <label htmlFor={mealType} className="text-sm font-medium capitalize">
                    {mealType}
                  </label>
                </div>
              ))}
            </div>
            <div className="mt-6">
              <Button onClick={generateMealPlan} disabled={loading} className="mr-4">
                {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
                Napi étrend generálása
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Specific Recipe Generation */}
      <Card>
        <CardHeader>
          <CardTitle>
            {selectedMealType ? `${selectedMealType.charAt(0).toUpperCase() + selectedMealType.slice(1)} recept generálása` : 'Specifikus recept generálása'}
          </CardTitle>
          <CardDescription>Válasszon kategóriát és alapanyagot egy konkrét recepthez</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Kategória</label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon kategóriát" />
                </SelectTrigger>
                <SelectContent>
                  {Object.keys(foodCategories).map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Alapanyag</label>
              <Select value={selectedIngredient} onValueChange={setSelectedIngredient} disabled={!selectedCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Válasszon alapanyagot" />
                </SelectTrigger>
                <SelectContent>
                  {selectedCategory && foodCategories[selectedCategory as keyof typeof foodCategories]?.map((ingredient) => (
                    <SelectItem key={ingredient} value={ingredient}>
                      {ingredient}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button onClick={generateSpecificRecipe} disabled={loading}>
            {loading && <RefreshCw className="mr-2 h-4 w-4 animate-spin" />}
            Recept generálása
          </Button>
        </CardContent>
      </Card>

      {/* Generated Meal Plan */}
      {Object.keys(mealPlan).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generált étrend</CardTitle>
            <CardDescription>Az Ön számára készített receptek</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6">
              {Object.entries(mealPlan).map(([mealType, plan]) => (
                <Card key={mealType} className="bg-gradient-to-r from-green-50 to-blue-50">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="capitalize text-lg">{plan.mealType}</CardTitle>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="secondary">{plan.category}</Badge>
                          <Badge variant="outline">{plan.ingredient}</Badge>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {plan.recipe ? (
                      <div className="space-y-4">
                        <h3 className="font-semibold text-lg text-green-700">{plan.recipe.név}</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <h4 className="font-medium mb-2">Hozzávalók:</h4>
                            <ul className="list-disc list-inside text-sm space-y-1">
                              {plan.recipe.hozzávalók.map((ingredient, idx) => (
                                <li key={idx}>{ingredient}</li>
                              ))}
                            </ul>
                          </div>
                          
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">{plan.recipe.elkészítésiIdő}</span>
                            </div>
                            
                            <div className="grid grid-cols-3 gap-2 text-xs">
                              <div className="text-center p-2 bg-white rounded">
                                <div className="font-medium">Szénhidrát</div>
                                <div className="text-blue-600">{plan.recipe.szénhidrát}</div>
                              </div>
                              <div className="text-center p-2 bg-white rounded">
                                <div className="font-medium">Fehérje</div>
                                <div className="text-green-600">{plan.recipe.fehérje}</div>
                              </div>
                              <div className="text-center p-2 bg-white rounded">
                                <div className="font-medium">Zsír</div>
                                <div className="text-orange-600">{plan.recipe.zsír}</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        <div>
                          <h4 className="font-medium mb-2">Elkészítés:</h4>
                          <p className="text-sm text-gray-700">{plan.recipe.elkészítés}</p>
                        </div>
                        
                        <div className="flex items-center justify-between pt-4 border-t">
                          <div className="flex items-center gap-1">
                            <span className="text-sm font-medium">Értékelés:</span>
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button
                                key={star}
                                onClick={() => rateRecipe(plan.recipe!.név, star)}
                                className="text-yellow-400 hover:text-yellow-500 text-lg"
                              >
                                <Star className="h-4 w-4 fill-current" />
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <p className="text-gray-500">Nem található recept ehhez az étkezéshez.</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
