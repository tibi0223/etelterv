/**
 * Meal Plan Generator Test Page
 * Egyszerű teszt oldal az új algoritmus kipróbálásához
 */

import MealPlanGeneratorDemo from '@/components/demo/MealPlanGeneratorDemo';

export default function MealPlanTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🎯 Új Étrendtervező Teszt
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Ez az oldal teszteli az új intelligens étrendtervező algoritmust. 
            Próbáld ki különböző makró célokkal!
          </p>
        </div>
        
        <MealPlanGeneratorDemo />
        
        <div className="mt-12 bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">📋 Tesztelési Lépések</h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-bold text-blue-800">1. SQL Setup</h3>
              <p className="text-gray-600">
                Futtasd le a <code>QUICK_SQL_SETUP.sql</code> fájlt a Supabase SQL Editor-ban!
              </p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-bold text-green-800">2. Bejelentkezés</h3>
              <p className="text-gray-600">
                Jelentkezz be a Supabase auth rendszerrel.
              </p>
            </div>
            
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-bold text-purple-800">3. Generálás</h3>
              <p className="text-gray-600">
                Állítsd be a makró célokat és nyomd meg valamelyik Generate gombot!
              </p>
            </div>
            
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-bold text-orange-800">4. Eredmény</h3>
              <p className="text-gray-600">
                Az algoritmus 9 lépésben fogja generálni az optimális étrendtervet.
              </p>
            </div>
          </div>
          
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded p-4">
            <h4 className="font-bold text-yellow-800 mb-2">⚠️ Hibaelhárítás:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Ha "No recipes found" → futtasd le a SQL script-et</li>
              <li>• Ha "Authentication required" → jelentkezz be</li>
              <li>• Ha "Generation failed" → próbáld meg más makró értékekkel</li>
              <li>• Ha lassú → ez normális, komplex algoritmus fut</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
 * Meal Plan Generator Test Page
 * Egyszerű teszt oldal az új algoritmus kipróbálásához
 */

import MealPlanGeneratorDemo from '@/components/demo/MealPlanGeneratorDemo';

export default function MealPlanTestPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-4">
            🎯 Új Étrendtervező Teszt
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Ez az oldal teszteli az új intelligens étrendtervező algoritmust. 
            Próbáld ki különböző makró célokkal!
          </p>
        </div>
        
        <MealPlanGeneratorDemo />
        
        <div className="mt-12 bg-white rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">📋 Tesztelési Lépések</h2>
          
          <div className="space-y-4">
            <div className="border-l-4 border-blue-500 pl-4">
              <h3 className="font-bold text-blue-800">1. SQL Setup</h3>
              <p className="text-gray-600">
                Futtasd le a <code>QUICK_SQL_SETUP.sql</code> fájlt a Supabase SQL Editor-ban!
              </p>
            </div>
            
            <div className="border-l-4 border-green-500 pl-4">
              <h3 className="font-bold text-green-800">2. Bejelentkezés</h3>
              <p className="text-gray-600">
                Jelentkezz be a Supabase auth rendszerrel.
              </p>
            </div>
            
            <div className="border-l-4 border-purple-500 pl-4">
              <h3 className="font-bold text-purple-800">3. Generálás</h3>
              <p className="text-gray-600">
                Állítsd be a makró célokat és nyomd meg valamelyik Generate gombot!
              </p>
            </div>
            
            <div className="border-l-4 border-orange-500 pl-4">
              <h3 className="font-bold text-orange-800">4. Eredmény</h3>
              <p className="text-gray-600">
                Az algoritmus 9 lépésben fogja generálni az optimális étrendtervet.
              </p>
            </div>
          </div>
          
          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded p-4">
            <h4 className="font-bold text-yellow-800 mb-2">⚠️ Hibaelhárítás:</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• Ha "No recipes found" → futtasd le a SQL script-et</li>
              <li>• Ha "Authentication required" → jelentkezz be</li>
              <li>• Ha "Generation failed" → próbáld meg más makró értékekkel</li>
              <li>• Ha lassú → ez normális, komplex algoritmus fut</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
 