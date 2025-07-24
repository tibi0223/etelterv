
-- Add user_id column to Értékelések table
ALTER TABLE public."Értékelések" 
ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Create index for better performance when filtering by user_id
CREATE INDEX idx_ertekelesek_user_id ON public."Értékelések"(user_id);

-- Enable Row Level Security on Értékelések table
ALTER TABLE public."Értékelések" ENABLE ROW LEVEL SECURITY;

-- Create RLS policy so users can only see their own ratings
CREATE POLICY "Users can view their own ratings" 
  ON public."Értékelések" 
  FOR SELECT 
  USING (auth.uid() = user_id);

-- Create policy that allows users to INSERT their own ratings
CREATE POLICY "Users can create their own ratings" 
  ON public."Értékelések" 
  FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

-- Create policy that allows users to UPDATE their own ratings
CREATE POLICY "Users can update their own ratings" 
  ON public."Értékelések" 
  FOR UPDATE 
  USING (auth.uid() = user_id);

-- Create policy that allows users to DELETE their own ratings
CREATE POLICY "Users can delete their own ratings" 
  ON public."Értékelések" 
  FOR DELETE 
  USING (auth.uid() = user_id);
