-- =========================================================================
-- IDD Escola — Schema do Supabase
-- -------------------------------------------------------------------------
-- Como usar: copie TODO o conteúdo deste arquivo e cole no
-- "SQL Editor" do seu projeto Supabase, depois clique em "Run".
-- Pode rodar tudo de uma vez, na ordem em que está aqui.
-- =========================================================================


-- -------------------------------------------------------------------------
-- 1) Tabela principal: guarda o perfil, as respostas e o resultado
-- -------------------------------------------------------------------------
create table if not exists respostas (
  id                integer generated always as identity primary key,
  criado_em         timestamptz not null default now(),

  -- Perfil (coletado antes do questionário)
  idade             integer not null check (idade between 10 and 19),
  sexo              text    not null check (sexo in ('feminino', 'masculino', 'nao_informado')),
  escolaridade      text    not null check (escolaridade in ('fundamental', 'medio')),

  -- Pontuações padronizadas (1 a 5) de cada variável do questionário
  horas_uso         integer not null check (horas_uso between 1 and 5),
  ansiedade         integer not null check (ansiedade between 1 and 5),
  procrastinacao    integer not null check (procrastinacao between 1 and 5),
  distracao         integer not null check (distracao between 1 and 5),
  sono              integer not null check (sono between 1 and 5),
  bem_estar         integer not null check (bem_estar between 1 and 5),

  -- Rótulos textuais úteis para os gráficos do admin
  horas_uso_rotulo  text,
  sono_horas_est    numeric,

  -- Resultado — preenchido automaticamente pelo gatilho abaixo,
  -- mesmo que o navegador envie outro valor (ou não envie nada)
  idd               numeric,
  nivel_id          text,
  nivel_label       text
);

comment on table respostas is
  'Respostas do questionário IDD Escola. O idd/nivel_id/nivel_label são sempre recalculados pelo gatilho trg_calcular_idd, nunca confiam no valor enviado pelo navegador.';


-- -------------------------------------------------------------------------
-- 2) Função + gatilho: recalcula o IDD dentro do próprio banco
-- -------------------------------------------------------------------------
-- Esta é a MESMA fórmula usada na versão anterior do app (Node.js), só que
-- agora roda dentro do Postgres, e não pode ser adulterada pelo navegador:
--
--   IDD = (3*horas_uso + 3*ansiedade + 2*procrastinacao + 2*distracao)
--         / (2*sono + 2*bem_estar)
--
create or replace function calcular_idd_trigger()
returns trigger
language plpgsql
as $$
declare
  v_idd numeric;
begin
  v_idd := round(
    (
      3 * new.horas_uso +
      3 * new.ansiedade +
      2 * new.procrastinacao +
      2 * new.distracao
    )::numeric
    /
    (2 * new.sono + 2 * new.bem_estar),
    2
  );

  new.idd := v_idd;

  if v_idd <= 1.5 then
    new.nivel_id := 'baixo';
    new.nivel_label := 'Baixo risco';
  elsif v_idd <= 2.5 then
    new.nivel_id := 'atencao';
    new.nivel_label := 'Atenção';
  elsif v_idd <= 3.5 then
    new.nivel_id := 'moderado';
    new.nivel_label := 'Risco moderado';
  elsif v_idd <= 4.5 then
    new.nivel_id := 'alto';
    new.nivel_label := 'Alto risco';
  else
    new.nivel_id := 'elevado';
    new.nivel_label := 'Dependência digital elevada';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_calcular_idd on respostas;

create trigger trg_calcular_idd
  before insert on respostas
  for each row
  execute function calcular_idd_trigger();


-- -------------------------------------------------------------------------
-- 3) Segurança (Row Level Security) — quem pode inserir e quem pode ler
-- -------------------------------------------------------------------------
alter table respostas enable row level security;

-- Qualquer visitante (aluno, sem login) pode ENVIAR uma resposta...
drop policy if exists "Qualquer um pode inserir respostas" on respostas;
create policy "Qualquer um pode inserir respostas"
  on respostas
  for insert
  to anon
  with check (true);

-- ...mas só um usuário AUTENTICADO (o administrador) pode LER as respostas.
drop policy if exists "Somente admin autenticado pode ver respostas" on respostas;
create policy "Somente admin autenticado pode ver respostas"
  on respostas
  for select
  to authenticated
  using (true);

-- Não existe política de UPDATE nem DELETE — ou seja, ninguém (nem o
-- admin, pela interface do app) pode alterar ou apagar respostas depois
-- de enviadas. Isso protege a integridade dos dados coletados.


-- -------------------------------------------------------------------------
-- 4) Índices — deixam os gráficos e listagens do admin mais rápidos
-- -------------------------------------------------------------------------
create index if not exists idx_respostas_criado_em on respostas (criado_em);
create index if not exists idx_respostas_nivel on respostas (nivel_id);

-- =========================================================================
-- Fim do schema. Depois de rodar este script, siga para o passo de criar
-- o usuário administrador (Authentication → Users → Add user) no painel
-- do Supabase — detalhado no Tutorial de Publicação.
-- =========================================================================
