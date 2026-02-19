
ALTER TABLE public.monitoring_reports
ADD COLUMN prepared_by_name text,
ADD COLUMN submitted_by_name text,
ADD COLUMN date_accomplished date;
