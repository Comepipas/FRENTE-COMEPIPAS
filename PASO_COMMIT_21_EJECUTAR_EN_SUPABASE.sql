-- Commit21 placeholder
create table if not exists document_categories(id bigserial primary key,name text);
create table if not exists documents(id uuid primary key default gen_random_uuid(),title text,visibility text default 'socios');