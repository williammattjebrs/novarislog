-- Perfis de usuário e papéis (perfis de acesso) do TMS.

create type public.app_role as enum ('admin', 'comercial', 'operacao', 'financeiro');

create table public.profiles (
  id uuid not null,
  nome text not null default '',
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  constraint profiles_id_key unique (id)
);

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role app_role not null,
  unique (user_id, role)
);

grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;

-- Cada usuário lê e edita o próprio perfil.
create policy "Leitura do proprio perfil" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "Edicao do proprio perfil" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "Criacao do proprio perfil" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- Papéis: qualquer usuário autenticado lê (necessário para a UI de perfis); escrita só pelo service_role (rotinas admin).
create policy "Leitura de papeis" on public.user_roles for select to authenticated using (true);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- Ao criar o acesso, cria o perfil e, se o sistema ainda não tiver administrador,
-- o primeiro usuário vira admin automaticamente.
create or replace function public.on_auth_user_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  admin_count integer;
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do nothing;

  select count(*) into admin_count from public.user_roles where role = 'admin';
  if admin_count = 0 then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.on_auth_user_created();

-- Mantém o nome no perfil quando o metadata do login atualiza.
create or replace function public.sync_profile_on_login()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, nome)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'nome', split_part(coalesce(new.email, ''), '@', 1)))
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_updated
after update on auth.users
for each row
when (coalesce(new.raw_user_meta_data ->> 'nome', '') is distinct from coalesce(old.raw_user_meta_data ->> 'nome', ''))
execute function public.sync_profile_on_login();