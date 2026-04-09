-- ============================================================
-- SCHEMA SUPABASE - Sistema de Controle de Salgados
-- Execute este script no SQL Editor do Supabase
-- ============================================================

-- Habilitar extensão UUID
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELA: produtos
-- ============================================================
CREATE TABLE IF NOT EXISTS produtos (
  id          UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  nome        VARCHAR(255) NOT NULL,
  recheio     VARCHAR(255),
  tipo        VARCHAR(10)  NOT NULL CHECK (tipo IN ('frito', 'assado')),
  ativo       BOOLEAN      DEFAULT true,
  observacao  TEXT,
  created_at  TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- TABELA: unidades
-- ============================================================
CREATE TABLE IF NOT EXISTS unidades (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  nome       VARCHAR(255) NOT NULL,
  cidade     VARCHAR(255) NOT NULL,
  ativo      BOOLEAN      DEFAULT true,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

-- ============================================================
-- TABELA: planejamento_producao
-- ============================================================
CREATE TABLE IF NOT EXISTS planejamento_producao (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  data                DATE        NOT NULL,
  produto_id          UUID        REFERENCES produtos(id) ON DELETE RESTRICT,
  quantidade_planejada INTEGER    NOT NULL CHECK (quantidade_planejada > 0),
  status              VARCHAR(20) NOT NULL DEFAULT 'planejado'
                       CHECK (status IN ('planejado', 'produzindo', 'finalizado', 'parcial')),
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: producoes
-- ============================================================
CREATE TABLE IF NOT EXISTS producoes (
  id                  UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  data                DATE        NOT NULL,
  produto_id          UUID        REFERENCES produtos(id) ON DELETE RESTRICT,
  quantidade_produzida INTEGER    NOT NULL CHECK (quantidade_produzida > 0),
  observacao          TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: estoque_salgados (câmara fria)
-- ============================================================
CREATE TABLE IF NOT EXISTS estoque_salgados (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id UUID        REFERENCES produtos(id) ON DELETE RESTRICT UNIQUE,
  quantidade INTEGER     NOT NULL DEFAULT 0 CHECK (quantidade >= 0),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: distribuicoes
-- ============================================================
CREATE TABLE IF NOT EXISTS distribuicoes (
  id         UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  data       DATE        NOT NULL,
  unidade_id UUID        REFERENCES unidades(id) ON DELETE RESTRICT,
  produto_id UUID        REFERENCES produtos(id) ON DELETE RESTRICT,
  quantidade INTEGER     NOT NULL CHECK (quantidade > 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: movimentacoes_estoque
-- ============================================================
CREATE TABLE IF NOT EXISTS movimentacoes_estoque (
  id            UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  produto_id    UUID        REFERENCES produtos(id) ON DELETE RESTRICT,
  tipo          VARCHAR(30) NOT NULL CHECK (tipo IN ('entrada_producao', 'distribuicao')),
  quantidade    INTEGER     NOT NULL,
  referencia_id UUID,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES para melhor performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_producoes_data        ON producoes(data);
CREATE INDEX IF NOT EXISTS idx_producoes_produto      ON producoes(produto_id);
CREATE INDEX IF NOT EXISTS idx_distribuicoes_data     ON distribuicoes(data);
CREATE INDEX IF NOT EXISTS idx_distribuicoes_unidade  ON distribuicoes(unidade_id);
CREATE INDEX IF NOT EXISTS idx_distribuicoes_produto  ON distribuicoes(produto_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_produto  ON movimentacoes_estoque(produto_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_created  ON movimentacoes_estoque(created_at);
CREATE INDEX IF NOT EXISTS idx_planejamento_data      ON planejamento_producao(data);
CREATE INDEX IF NOT EXISTS idx_estoque_produto        ON estoque_salgados(produto_id);

-- ============================================================
-- RLS (Row Level Security) - desabilitar para começar
-- Habilite e configure policies conforme necessidade de autenticação
-- ============================================================
ALTER TABLE produtos               ENABLE ROW LEVEL SECURITY;
ALTER TABLE unidades               ENABLE ROW LEVEL SECURITY;
ALTER TABLE planejamento_producao  ENABLE ROW LEVEL SECURITY;
ALTER TABLE producoes              ENABLE ROW LEVEL SECURITY;
ALTER TABLE estoque_salgados       ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribuicoes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_estoque  ENABLE ROW LEVEL SECURITY;

-- Policies permissivas (acesso público sem autenticação)
-- Para produção, substitua por policies de autenticação adequadas
CREATE POLICY "allow_all_produtos"              ON produtos              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_unidades"             ON unidades             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_planejamento"         ON planejamento_producao FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_producoes"            ON producoes            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_estoque"              ON estoque_salgados     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_distribuicoes"        ON distribuicoes        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_movimentacoes"        ON movimentacoes_estoque FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- DADOS DE EXEMPLO (opcional)
-- ============================================================

-- Produtos de exemplo
INSERT INTO produtos (nome, recheio, tipo, ativo) VALUES
  ('Coxinha',            'Frango',            'frito',  true),
  ('Risole',             'Presunto e Queijo', 'frito',  true),
  ('Enroladinho',        'Salsicha',          'assado', true),
  ('Kibe',               'Carne',             'frito',  true),
  ('Pastel de Forno',    'Frango com Catupiry','assado', true),
  ('Bolinha de Queijo',  'Queijo',            'frito',  true);

-- Unidades de exemplo
INSERT INTO unidades (nome, cidade, ativo) VALUES
  ('Unidade Centro',      'São Paulo', true),
  ('Unidade Vila Mariana','São Paulo', true),
  ('Unidade Campinas',    'Campinas',  true),
  ('Unidade Santos',      'Santos',    true);
