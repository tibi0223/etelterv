
-- Create a function to safely delete users and all their related data
CREATE OR REPLACE FUNCTION public.delete_user_completely(target_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the current user is an admin
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'Nincs admin jogosultság';
  END IF;

  -- Prevent self-deletion
  IF target_user_id = auth.uid() THEN
    RAISE EXCEPTION 'Nem törölheted saját magadat';
  END IF;

  -- Delete user from auth.users (this will cascade to all related tables due to CASCADE constraints)
  DELETE FROM auth.users WHERE id = target_user_id;
  
  -- Return success
  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error and return false
    RAISE LOG 'Error deleting user %: %', target_user_id, SQLERRM;
    RETURN FALSE;
END;
$$;

-- Grant execute permission to authenticated users (the function will check admin status internally)
GRANT EXECUTE ON FUNCTION public.delete_user_completely(UUID) TO authenticated;
