-- ============================================================
-- STEP 1: Check what columns employees table currently has
-- ============================================================
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'employees' 
ORDER BY ordinal_position;
