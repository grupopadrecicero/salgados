<<<<<<< HEAD
# 🥟 Sistema de Controle de Salgados

Sistema web completo para controle de **produção e distribuição de salgados** congelados. Desenvolvido com React, TailwindCSS e Supabase.

## Funcionalidades

| Módulo | Descrição |
|---|---|
| **Dashboard** | KPIs da semana + gráficos de produção, distribuição e estoque |
| **Planejamento** | Planejamento semanal de produção com visualização por calendário |
| **Produção** | Registro de produção (atualiza estoque automaticamente) |
| **Câmara Fria** | Estoque atual + histórico de movimentações |
| **Distribuição** | Envios para unidades (desconta estoque + valida disponibilidade) |
| **Produtos** | CRUD de salgados (nome, recheio, tipo frito/assado) |
| **Unidades** | CRUD de unidades receptoras |
| **Relatórios** | Relatórios por período com gráficos interativos |

## Tecnologias

- **Frontend:** React 18, React Router v6, TailwindCSS, Recharts, Lucide React
- **Backend:** Supabase (PostgreSQL)

## Setup

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. No **SQL Editor**, execute o conteúdo de `supabase/schema.sql`

### 2. Configurar variáveis de ambiente

```bash
cp .env.example .env
```

Edite o `.env` com as credenciais do seu projeto Supabase (menu **Project Settings > API**):

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon-aqui
```

### 3. Instalar e rodar

```bash
npm install
npm run dev
```

Acesse `http://localhost:5173`

## Regras de negócio

- **Produção → Estoque:** ao registrar produção, a quantidade é somada automaticamente ao estoque da câmara fria.
- **Distribuição → Estoque:** ao registrar distribuição, a quantidade é subtraída do estoque.
- **Validação:** distribuição é bloqueada se o estoque for insuficiente.
- **Movimentações:** todas as entradas e saídas criam registros automáticos em `movimentacoes_estoque`.
=======
# salgados
>>>>>>> 6f5d60f (Initial commit)
# gestaosalgados
