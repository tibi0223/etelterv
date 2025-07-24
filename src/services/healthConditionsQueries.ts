
import { supabase } from '@/integrations/supabase/client';

export interface HealthCondition {
  id: string;
  user_id: string;
  condition_type: 'PCOS' | 'IR' | 'HASHIMOTO' | 'FOOD_ALLERGY' | 'FOOD_INTOLERANCE';
  created_at: string;
  updated_at: string;
}

export const getUserHealthConditions = async (userId: string): Promise<HealthCondition[]> => {
  console.log('🔍 Egészségügyi állapotok lekérdezése:', userId);
  
  const { data, error } = await supabase
    .from('user_health_conditions')
    .select('*')
    .eq('user_id', userId);

  if (error) {
    console.error('❌ Egészségügyi állapotok betöltési hiba:', error);
    throw error;
  }

  console.log('✅ Betöltött egészségügyi állapotok:', data?.length || 0);
  return (data || []) as HealthCondition[];
};

export const saveUserHealthConditions = async (
  userId: string, 
  conditions: Array<'PCOS' | 'IR' | 'HASHIMOTO' | 'FOOD_ALLERGY' | 'FOOD_INTOLERANCE'>
): Promise<void> => {
  console.log('💾 Egészségügyi állapotok mentése:', userId, conditions);
  
  // Töröljük a meglévő állapotokat
  const { error: deleteError } = await supabase
    .from('user_health_conditions')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error('❌ Korábbi állapotok törlési hiba:', deleteError);
    throw deleteError;
  }

  // Mentjük az új állapotokat
  if (conditions.length > 0) {
    const conditionsToInsert = conditions.map(condition => ({
      user_id: userId,
      condition_type: condition
    }));

    const { error: insertError } = await supabase
      .from('user_health_conditions')
      .insert(conditionsToInsert);

    if (insertError) {
      console.error('❌ Egészségügyi állapotok mentési hiba:', insertError);
      throw insertError;
    }
  }

  console.log('✅ Egészségügyi állapotok sikeresen mentve');
};
