-- Align legacy budget schemas that still carry month/year columns.
-- Current application code uses budget_month/budget_year.
alter table budgets add column if not exists budget_month int;
alter table budgets add column if not exists budget_year int;

-- Ensure these legacy names exist temporarily so the backfill query is portable
-- across PostgreSQL (production) and H2 (tests).
alter table budgets add column if not exists "month" int;
alter table budgets add column if not exists "year" int;

update budgets
set budget_month = coalesce(budget_month, "month", cast(extract(month from created_at) as int)),
    budget_year = coalesce(budget_year, "year", cast(extract(year from created_at) as int))
where budget_month is null
   or budget_year is null;

alter table budgets alter column budget_month set not null;
alter table budgets alter column budget_year set not null;

alter table budgets drop column if exists "month";
alter table budgets drop column if exists "year";
