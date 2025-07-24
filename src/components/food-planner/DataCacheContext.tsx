import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DataCacheContextType {
  recipes: any[];
  setRecipes: (recipes: any[]) => void;
  alapanyagok: any[];
  setAlapanyagok: (alapanyagok: any[]) => void;
  mealTypes: any[];
  setMealTypes: (mealTypes: any[]) => void;
  isLoaded: boolean;
  setIsLoaded: (loaded: boolean) => void;
}

const DataCacheContext = createContext<DataCacheContextType | undefined>(undefined);

export const useDataCache = () => {
  const context = useContext(DataCacheContext);
  if (context === undefined) {
    throw new Error('useDataCache must be used within a DataCacheProvider');
  }
  return context;
};

interface DataCacheProviderProps {
  children: ReactNode;
}

export const DataCacheProvider: React.FC<DataCacheProviderProps> = ({ children }) => {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [alapanyagok, setAlapanyagok] = useState<any[]>([]);
  const [mealTypes, setMealTypes] = useState<any[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const value: DataCacheContextType = {
    recipes,
    setRecipes,
    alapanyagok,
    setAlapanyagok,
    mealTypes,
    setMealTypes,
    isLoaded,
    setIsLoaded,
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
}; 