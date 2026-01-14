# Historico de Candidatos - Descricao Tecnica e Funcional

Este arquivo descreve o que foi criado/melhorado para acompanhar o historico de um candidato (vagas que concorreu, data de cadastro, ultimo contato e entrevista).

## Objetivo
- Registrar todas as vagas em que o candidato concorreu.
- Guardar data de cadastro (aplicacao na vaga).
- Guardar ultimo contato com o candidato.
- Indicar se houve entrevista e quando ocorreu.

## Modelagem de dados (API)
Nova entidade: CandidatoHistorico
- CandidatoId: vinculo com o candidato.
- VagaId: vaga relacionada.
- AppliedAtUtc: data de cadastro na vaga.
- LastContactAtUtc: ultimo contato realizado.
- Interviewed: true/false indicando entrevista.
- InterviewAtUtc: data da entrevista (se aplicavel).
- Notes: observacoes livres.

Regras importantes:
- Ao criar um candidato, o sistema cria automaticamente um historico com a vaga inicial.
- Ao atualizar o candidato mudando a vaga, o sistema cria um novo historico.

## Endpoints adicionados
- GET /api/candidatos/{id}/historico
  Retorna a lista de historicos do candidato (com vaga, datas e entrevista).

- POST /api/candidatos/{id}/historico
  Adiciona um novo historico para o candidato.
  Payload (JSON):
  {
    "vagaId": "GUID",
    "appliedAtUtc": "2026-01-10T00:00:00Z",
    "lastContactAtUtc": "2026-01-15T00:00:00Z",
    "interviewed": true,
    "interviewAtUtc": "2026-01-20T00:00:00Z",
    "notes": "Contato por WhatsApp"
  }

- PUT /api/candidatos/{id}/historico/{historicoId}
  Atualiza um historico existente com os mesmos campos do POST.

## UI (Web)
Tela: Candidatos > Detalhes > Aba "Historico"
- Formulario rapido para registrar vaga, data de cadastro, ultimo contato, entrevista e notas.
- Tabela com historicos do candidato, exibindo vaga, datas e entrevista.
- Botao de edicao para carregar o historico no formulario e atualizar.

## Seeds
- O seed passa a criar historicos para candidatos demo, incluindo ultimo contato e entrevistas aleatorias.

## Migracao
- Nova migracao criada: AddCandidatoHistorico
- Ao iniciar a API, o EF aplica a migracao automaticamente.

## Como usar
1) Abra Candidatos.
2) Clique em Detalhes de um candidato.
3) Va na aba Historico.
4) Preencha os campos e clique em "Salvar historico".
5) O historico aparece na tabela e pode ser editado.
