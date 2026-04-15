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
-- TABELA: producoes_agrupadas
-- ============================================================
CREATE TABLE IF NOT EXISTS producoes_agrupadas (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  data             DATE        NOT NULL UNIQUE,
  quantidade_total INTEGER     NOT NULL DEFAULT 0 CHECK (quantidade_total >= 0),
  numero_registros INTEGER     NOT NULL DEFAULT 0 CHECK (numero_registros >= 0),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: producoes_agrupadas_detalhes
-- ============================================================
CREATE TABLE IF NOT EXISTS producoes_agrupadas_detalhes (
  id                    UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  producao_agrupada_id  UUID        NOT NULL REFERENCES producoes_agrupadas(id) ON DELETE CASCADE,
  produto_id            UUID        NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  quantidade_total      INTEGER     NOT NULL DEFAULT 0 CHECK (quantidade_total >= 0),
  numero_registros      INTEGER     NOT NULL DEFAULT 0 CHECK (numero_registros >= 0),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(producao_agrupada_id, produto_id)
);

-- ============================================================
-- TABELA: distribuicoes_agrupadas
-- ============================================================
CREATE TABLE IF NOT EXISTS distribuicoes_agrupadas (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  data             DATE        NOT NULL,
  unidade_id       UUID        NOT NULL REFERENCES unidades(id) ON DELETE RESTRICT,
  quantidade_total INTEGER     NOT NULL DEFAULT 0 CHECK (quantidade_total >= 0),
  numero_registros INTEGER     NOT NULL DEFAULT 0 CHECK (numero_registros >= 0),
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(data, unidade_id)
);

-- ============================================================
-- TABELA: distribuicoes_agrupadas_detalhes
-- ============================================================
CREATE TABLE IF NOT EXISTS distribuicoes_agrupadas_detalhes (
  id                       UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  distribuicao_agrupada_id UUID        NOT NULL REFERENCES distribuicoes_agrupadas(id) ON DELETE CASCADE,
  produto_id               UUID        NOT NULL REFERENCES produtos(id) ON DELETE RESTRICT,
  quantidade_total         INTEGER     NOT NULL DEFAULT 0 CHECK (quantidade_total >= 0),
  numero_registros         INTEGER     NOT NULL DEFAULT 0 CHECK (numero_registros >= 0),
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(distribuicao_agrupada_id, produto_id)
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
CREATE INDEX IF NOT EXISTS idx_producoes_agrupadas_data ON producoes_agrupadas(data);
CREATE INDEX IF NOT EXISTS idx_producoes_agrupadas_detalhes_agrupada ON producoes_agrupadas_detalhes(producao_agrupada_id);
CREATE INDEX IF NOT EXISTS idx_distribuicoes_agrupadas_data ON distribuicoes_agrupadas(data);
CREATE INDEX IF NOT EXISTS idx_distribuicoes_agrupadas_unidade ON distribuicoes_agrupadas(unidade_id);
CREATE INDEX IF NOT EXISTS idx_distribuicoes_agrupadas_detalhes_agrupada ON distribuicoes_agrupadas_detalhes(distribuicao_agrupada_id);

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
ALTER TABLE producoes_agrupadas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE producoes_agrupadas_detalhes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribuicoes_agrupadas  ENABLE ROW LEVEL SECURITY;
ALTER TABLE distribuicoes_agrupadas_detalhes  ENABLE ROW LEVEL SECURITY;

-- Policies permissivas (acesso público sem autenticação)
-- Para produção, substitua por policies de autenticação adequadas
CREATE POLICY "allow_all_produtos"              ON produtos              FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_unidades"             ON unidades             FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_planejamento"         ON planejamento_producao FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_producoes"            ON producoes            FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_estoque"              ON estoque_salgados     FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_distribuicoes"        ON distribuicoes        FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_movimentacoes"        ON movimentacoes_estoque FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_producoes_agrupadas"  ON producoes_agrupadas  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_producoes_agrupadas_detalhes" ON producoes_agrupadas_detalhes FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_distribuicoes_agrupadas"  ON distribuicoes_agrupadas  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow_all_distribuicoes_agrupadas_detalhes" ON distribuicoes_agrupadas_detalhes FOR ALL USING (true) WITH CHECK (true);



