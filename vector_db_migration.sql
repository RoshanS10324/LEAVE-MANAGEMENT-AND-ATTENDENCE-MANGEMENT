-- Enable pgvector extension to support high-performance vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Alter face_descriptors to add the vector(128) column
-- face-api.js returns 128-dimensional Float32Array descriptors
ALTER TABLE public.face_descriptors ADD COLUMN IF NOT EXISTS face_vector vector(128);

-- Create a function for server-side face vector matching using pgvector distance operators (<-> L2 distance)
CREATE OR REPLACE FUNCTION public.match_face(
  probe_vector vector(128),
  match_threshold float8 DEFAULT 0.5
)
RETURNS TABLE (
  emp_id UUID,
  name TEXT,
  email TEXT,
  role TEXT,
  confidence float8,
  distance float8
) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    e.id AS emp_id,
    e.name,
    e.email,
    e.role,
    (1.0 - (fd.face_vector <-> probe_vector)) AS confidence,
    (fd.face_vector <-> probe_vector) AS distance
  FROM public.face_descriptors fd
  JOIN public.employees e ON e.id = fd.emp_id
  WHERE (fd.face_vector <-> probe_vector) <= match_threshold
  ORDER BY fd.face_vector <-> probe_vector ASC
  LIMIT 1;
END;
$$;
