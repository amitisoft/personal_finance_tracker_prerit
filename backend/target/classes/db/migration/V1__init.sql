create table users (
    id uuid primary key,
    email varchar(255) unique not null,
    password_hash text not null,
    display_name varchar(120) not null,
    created_at timestamp not null,
    updated_at timestamp not null
);

create table refresh_tokens (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    token varchar(200) unique not null,
    expires_at timestamp not null,
    revoked boolean not null default false,
    created_at timestamp not null,
    updated_at timestamp not null
);

create table password_reset_tokens (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    token varchar(200) unique not null,
    expires_at timestamp not null,
    used boolean not null default false,
    created_at timestamp not null,
    updated_at timestamp not null
);

create table accounts (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    name varchar(100) not null,
    type varchar(30) not null,
    opening_balance numeric(12,2) not null default 0,
    current_balance numeric(12,2) not null default 0,
    institution_name varchar(120),
    last_updated_at timestamp not null,
    created_at timestamp not null,
    updated_at timestamp not null
);

create table categories (
    id uuid primary key,
    user_id uuid,
    name varchar(100) not null,
    type varchar(20) not null,
    color varchar(20),
    icon varchar(50),
    is_archived boolean not null default false,
    created_at timestamp not null,
    updated_at timestamp not null
);

create table transactions (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    account_id uuid not null references accounts(id),
    category_id uuid references categories(id),
    destination_account_id uuid references accounts(id),
    recurring_transaction_id uuid,
    type varchar(20) not null,
    amount numeric(12,2) not null,
    transaction_date date not null,
    merchant varchar(200),
    note text,
    payment_method varchar(50),
    created_at timestamp not null,
    updated_at timestamp not null
);

create table transaction_tags (
    transaction_id uuid not null references transactions(id) on delete cascade,
    tag varchar(60) not null
);

create table budgets (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    category_id uuid not null references categories(id),
    budget_month int not null,
    budget_year int not null,
    amount numeric(12,2) not null,
    alert_threshold_percent int not null default 80,
    created_at timestamp not null,
    updated_at timestamp not null,
    unique (user_id, category_id, budget_month, budget_year)
);

create table goals (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    name varchar(120) not null,
    target_amount numeric(12,2) not null,
    current_amount numeric(12,2) not null default 0,
    target_date date,
    linked_account_id uuid references accounts(id),
    icon varchar(50),
    color varchar(20),
    status varchar(30) not null default 'ACTIVE',
    created_at timestamp not null,
    updated_at timestamp not null
);

create table goal_entries (
    id uuid primary key,
    goal_id uuid not null references goals(id) on delete cascade,
    user_id uuid not null references users(id) on delete cascade,
    type varchar(30) not null,
    amount numeric(12,2) not null,
    account_id uuid references accounts(id),
    created_at timestamp not null,
    updated_at timestamp not null
);

create table recurring_transactions (
    id uuid primary key,
    user_id uuid not null references users(id) on delete cascade,
    title varchar(120) not null,
    type varchar(20) not null,
    amount numeric(12,2) not null,
    category_id uuid references categories(id),
    account_id uuid not null references accounts(id),
    frequency varchar(20) not null,
    start_date date not null,
    end_date date,
    next_run_date date not null,
    auto_create_transaction boolean not null default true,
    status varchar(20) not null default 'ACTIVE',
    created_at timestamp not null,
    updated_at timestamp not null
);

create index idx_accounts_user_id on accounts(user_id);
create index idx_categories_user_id on categories(user_id);
create index idx_transactions_user_id on transactions(user_id);
create index idx_transactions_transaction_date on transactions(transaction_date);
create index idx_budgets_user_month_year on budgets(user_id, budget_month, budget_year);
create index idx_goals_user_id on goals(user_id);
create index idx_recurring_user_next_run on recurring_transactions(user_id, next_run_date);

insert into categories (id, user_id, name, type, color, icon, is_archived, created_at, updated_at) values
('00000000-0000-0000-0000-000000000101', null, 'Food', 'EXPENSE', '#22c55e', 'utensils', false, now(), now()),
('00000000-0000-0000-0000-000000000102', null, 'Rent', 'EXPENSE', '#ef4444', 'home', false, now(), now()),
('00000000-0000-0000-0000-000000000103', null, 'Utilities', 'EXPENSE', '#f59e0b', 'bolt', false, now(), now()),
('00000000-0000-0000-0000-000000000104', null, 'Transport', 'EXPENSE', '#3b82f6', 'car', false, now(), now()),
('00000000-0000-0000-0000-000000000105', null, 'Entertainment', 'EXPENSE', '#8b5cf6', 'film', false, now(), now()),
('00000000-0000-0000-0000-000000000106', null, 'Shopping', 'EXPENSE', '#ec4899', 'shopping-bag', false, now(), now()),
('00000000-0000-0000-0000-000000000107', null, 'Health', 'EXPENSE', '#14b8a6', 'heart', false, now(), now()),
('00000000-0000-0000-0000-000000000108', null, 'Education', 'EXPENSE', '#6366f1', 'book', false, now(), now()),
('00000000-0000-0000-0000-000000000109', null, 'Travel', 'EXPENSE', '#06b6d4', 'plane', false, now(), now()),
('00000000-0000-0000-0000-000000000110', null, 'Subscriptions', 'EXPENSE', '#84cc16', 'repeat', false, now(), now()),
('00000000-0000-0000-0000-000000000111', null, 'Miscellaneous', 'EXPENSE', '#64748b', 'layers', false, now(), now()),
('00000000-0000-0000-0000-000000000201', null, 'Salary', 'INCOME', '#16a34a', 'wallet', false, now(), now()),
('00000000-0000-0000-0000-000000000202', null, 'Freelance', 'INCOME', '#0ea5e9', 'briefcase', false, now(), now()),
('00000000-0000-0000-0000-000000000203', null, 'Bonus', 'INCOME', '#10b981', 'sparkles', false, now(), now()),
('00000000-0000-0000-0000-000000000204', null, 'Investment', 'INCOME', '#22c55e', 'chart-line', false, now(), now()),
('00000000-0000-0000-0000-000000000205', null, 'Gift', 'INCOME', '#f97316', 'gift', false, now(), now()),
('00000000-0000-0000-0000-000000000206', null, 'Refund', 'INCOME', '#14b8a6', 'receipt', false, now(), now()),
('00000000-0000-0000-0000-000000000207', null, 'Other', 'INCOME', '#6b7280', 'circle', false, now(), now());
