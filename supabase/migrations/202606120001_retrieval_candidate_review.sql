alter table if exists public.discovery_candidates
  drop constraint if exists discovery_candidates_candidate_type_check;

alter table if exists public.discovery_candidates
  add constraint discovery_candidates_candidate_type_check
  check (candidate_type in ('person', 'company', 'relationship', 'fact'));

alter table if exists public.sources
  add column if not exists content_hash text;

create index if not exists idx_sources_content_hash
  on public.sources (content_hash)
  where content_hash is not null;

create index if not exists idx_source_chunks_content_fts
  on public.source_chunks
  using gin (to_tsvector('simple', content));

create or replace function public.hybrid_match_source_chunks(
  query_text text,
  query_embedding vector(384),
  match_count integer default 8,
  filter jsonb default '{}'::jsonb
)
returns table (
  chunk_id uuid,
  source_id uuid,
  content text,
  title text,
  url text,
  publisher text,
  metadata jsonb,
  vector_similarity double precision,
  text_rank real,
  hybrid_score double precision
)
language sql stable
as $$
  with scoped as (
    select
      sc.id as chunk_id,
      sc.source_id,
      sc.content,
      s.title,
      s.url,
      s.publisher,
      sc.metadata,
      1 - (sc.embedding <=> query_embedding) as vector_similarity,
      ts_rank_cd(to_tsvector('simple', sc.content), plainto_tsquery('simple', query_text)) as text_rank
    from public.source_chunks sc
    join public.sources s on s.id = sc.source_id
    where sc.embedding is not null
      and (
        filter = '{}'::jsonb
        or sc.metadata @> filter
        or s.metadata @> filter
        or (filter ? 'theme_id' and (filter->>'theme_id') = any(sc.theme_ids))
        or (filter ? 'theme' and (filter->>'theme') = any(sc.theme_ids))
      )
  )
  select
    scoped.*,
    (0.70 * scoped.vector_similarity) + (0.30 * least(scoped.text_rank, 1.0)) as hybrid_score
  from scoped
  where scoped.text_rank > 0 or scoped.vector_similarity > 0
  order by hybrid_score desc, vector_similarity desc
  limit greatest(match_count, 1);
$$;

create or replace function public.match_relationship_embeddings(
  query_embedding vector(384),
  match_count integer default 8,
  filter jsonb default '{}'::jsonb
)
returns table (
  embedding_id uuid,
  relationship_id uuid,
  profile_text text,
  metadata jsonb,
  similarity double precision
)
language sql stable
as $$
  select
    re.id as embedding_id,
    re.relationship_id,
    re.profile_text,
    re.metadata,
    1 - (re.embedding <=> query_embedding) as similarity
  from public.relationship_embeddings re
  where re.embedding is not null
    and (
      filter = '{}'::jsonb
      or re.metadata @> filter
      or (filter ? 'theme_id' and re.metadata @> jsonb_build_object('theme_id', filter->>'theme_id'))
    )
  order by re.embedding <=> query_embedding
  limit greatest(match_count, 1);
$$;
