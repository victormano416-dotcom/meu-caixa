# Meu Caixa (BANKAI)

**URL correta do app:** https://meu-caixa-jade.vercel.app

> Nao use meu-caixa.vercel.app — e outro produto.

## Login e sincronização na nuvem

O app usa Supabase Auth (e-mail e senha) para login e uma tabela privada para sincronizar entradas, gastos, cartões, compras e perfil entre dispositivos. Comprovantes salvos pela caixa de entrada continuam neste aparelho (IndexedDB) nesta versão.

### 1. Configure o Supabase

1. Crie um projeto no [Supabase](https://supabase.com/).
2. No SQL Editor do projeto, execute:

```sql
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.user_data enable row level security;

create policy "Users can read their own data"
  on public.user_data for select
  using (auth.uid() = user_id);

create policy "Users can insert their own data"
  on public.user_data for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own data"
  on public.user_data for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

3. Em **Authentication → URL Configuration**, configure a URL do app e os endereços de redirecionamento que você usa.
4. Copie a **Project URL** e a chave pública (publishable/anon) em **Project Settings → API**. Nunca coloque a `service_role` no frontend.

### 2. Configure as variáveis de ambiente

No ambiente local, crie `.env.local` na raiz (não faça commit desse arquivo):

```env
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=SUA_CHAVE_PUBLICA
```

No Vercel, adicione as mesmas variáveis em **Project Settings → Environment Variables** para Preview e Production e faça um novo deploy. Para testar localmente, rode `npm install` e `npm run dev`. A aplicação precisa ser reiniciada/reimplantada após mudar essas variáveis.

### 3. Primeiro login

Crie uma conta ou entre com e-mail e senha. No primeiro acesso, escolha explicitamente entre importar os dados locais deste aparelho ou começar com a caixa vazia. Depois disso, alterações em entradas, gastos, cartões, compras e perfil são sincronizadas automaticamente. Os dados na nuvem são isolados por usuário usando Row Level Security.

## Atualizar o app

O deploy é feito pelo Vercel quando a branch é publicada/mesclada. Não cole um `App.jsx` de terceiros sobre o arquivo existente.

## Stack

React 18 + Vite + Tailwind + Tesseract.js + Supabase Auth/Database
