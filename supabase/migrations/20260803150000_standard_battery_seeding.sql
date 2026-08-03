-- Seed standard battery tests
INSERT INTO public.standard_battery (test_id)
SELECT id FROM public.test_catalog 
WHERE acronym IN (
  'WAIS-III', 'APM RAVEN', 'D2-R', 'CPT-FLEX', 'BPA-2', 'TORRE DE LONDRES', 
  'ETDAH-AD', 'BDEFS', 'EPF-TDAH', 'SRS-2', 'ERA-F', 'CAT-Q', 'AQ', 'EQ', 
  'RAADS', 'RAVLT', 'TEM-R-2', 'FDT', 'MFFT', 'BFP', 'PFISTER', 'HTP', 
  'HUMOR-A', 'BDI-II', 'EAG-A', 'BAI', 'IHS-2'
)
ON CONFLICT (test_id) DO NOTHING;
