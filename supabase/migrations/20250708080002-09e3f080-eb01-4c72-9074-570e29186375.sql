-- Frissítjük az elelmiszer_kep táblát, hogy storage URL-eket használjon
UPDATE elelmiszer_kep 
SET Kep = CASE 
  WHEN Elelmiszer_nev IS NOT NULL THEN
    'https://hhjucbkqyamutshosfspy.supabase.co/storage/v1/object/public/alapanyag/' || 
    LOWER(
      regexp_replace(
        regexp_replace(
          regexp_replace(
            regexp_replace(
              regexp_replace(
                regexp_replace(
                  regexp_replace(
                    regexp_replace(
                      regexp_replace(
                        regexp_replace(
                          unaccent(Elelmiszer_nev),
                          '[()\/\-]', '', 'g'
                        ),
                        '\s+', '_', 'g'
                      ),
                      '_+', '_', 'g'
                    ),
                    '^_|_$', '', 'g'
                  ),
                  'ű', 'u', 'g'
                ),
                'ő', 'o', 'g'
              ),
              'á', 'a', 'g'
            ),
            'é', 'e', 'g'
          ),
          'í', 'i', 'g'
        ),
        'ó|ú', 'u', 'g'
      )
    ) || '.png'
  ELSE Kep
END
WHERE Kep LIKE 'https://drive.google.com%';