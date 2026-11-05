-- ---------------------------------------------------------------------------
-- Narrative daily reports are gone.
--
-- Reports are now period task reports: a summary and a list of the tasks
-- created inside a daily / weekly / monthly window, exported to PDF. The
-- streak machinery that only ever served the narrative form goes with it —
-- XP from completed tasks stays.
-- ---------------------------------------------------------------------------
drop table if exists public.daily_reports;

drop function if exists public.file_daily_report(uuid, date, text, text, text);

alter table public.profiles
    drop column if exists streak,
    drop column if exists best_streak,
    drop column if exists last_report_date;
