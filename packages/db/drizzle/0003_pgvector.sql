-- Custom SQL migration file, put your code below! --
-- La imagen pgvector/pgvector:pg16 trae la extensión; hay que activarla en cada base.
CREATE EXTENSION IF NOT EXISTS vector;
