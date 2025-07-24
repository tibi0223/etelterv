
-- Create table for storing user health conditions
CREATE TABLE public.user_health_conditions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  condition_type TEXT NOT NULL CHECK (condition_type IN ('PCOS', 'IR', 'HASHIMOTO', 'FOOD_ALLERGY', 'FOOD_INTOLERANCE')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, condition_type)
);

-- Enable Row Level Security
ALTER TABLE public.user_health_conditions ENABLE ROW LEVEL SECURITY;

-- Create policies for health conditions
CREATE POLICY "Users can view their own health conditions" 
  ON public.user_health_conditions 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own health conditions" 
  ON public.user_health_conditions 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own health conditions" 
  ON public.user_health_conditions 
  FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own health conditions" 
  ON public.user_health_conditions 
  FOR DELETE 
  USING (auth.uid() = user_id);
