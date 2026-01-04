using LioTecnica.Api.Contracts.Lookups;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using RhPortal.Api.Contracts.Common;
using RhPortal.Api.Domain.Enums;
using RhPortal.Api.Infrastructure.Data;
using RHPortal.Api.Domain.Enums;
using System.Text.RegularExpressions;

namespace RhPortal.Api.Controllers;

[ApiController]
[Route("api/lookup")]
public sealed class LookupController : ControllerBase
{
    private readonly AppDbContext _db;

    public LookupController(AppDbContext db)
    {
        _db = db;
    }

    [HttpGet("units")]
    public async Task<ActionResult<List<OptionResponse>>> Units(CancellationToken ct)
    {
        var items = await _db.Units
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new OptionResponse(x.Id, x.Code, x.Name))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("areas")]
    public async Task<ActionResult<List<OptionResponse>>> Areas(CancellationToken ct)
    {
        var items = await _db.Areas
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new OptionResponse(x.Id, x.Code, x.Name))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("departments")]
    public async Task<ActionResult<List<OptionResponse>>> Departments(CancellationToken ct)
    {
        var items = await _db.Departments
            .AsNoTracking()
            .OrderBy(x => x.Name)
            .Select(x => new OptionResponse(x.Id, x.Code, x.Name))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("job-positions")]
    public async Task<ActionResult<List<OptionResponse>>> JobPositions(
        [FromQuery] Guid? areaId,
        CancellationToken ct)
    {
        var q = _db.JobPositions.AsNoTracking();

        if (areaId.HasValue && areaId.Value != Guid.Empty)
            q = q.Where(x => x.AreaId == areaId.Value);

        var items = await q
            .OrderBy(x => x.Name)
            .Select(x => new OptionResponse(x.Id, x.Code, x.Name))
            .ToListAsync(ct);

        return Ok(items);
    }

    [HttpGet("vaga-enums")]
    public ActionResult<Dictionary<string, IReadOnlyList<EnumOptionResponse>>> VagaEnums()
    {
        var result = new Dictionary<string, IReadOnlyList<EnumOptionResponse>>
        {
            ["vagaStatus"] = BuildEnumOptions<VagaStatus>(moveZeroToEnd: true),
            ["vagaModalidade"] = BuildEnumOptions<VagaModalidade>(),
            ["vagaSenioridade"] = BuildEnumOptions<VagaSenioridade>(moveZeroToEnd: true),
            ["vagaAreaTime"] = BuildEnumOptions<VagaAreaTime>(moveZeroToEnd: true),
            ["vagaTipoContratacao"] = BuildEnumOptions<VagaTipoContratacao>(moveZeroToEnd: true),
            ["vagaMotivoAbertura"] = BuildEnumOptions<VagaMotivoAbertura>(moveZeroToEnd: true),
            ["vagaOrcamentoAprovado"] = BuildEnumOptions<VagaOrcamentoAprovado>(moveZeroToEnd: true),
            ["vagaPrioridade"] = BuildEnumOptions<VagaPrioridade>(moveZeroToEnd: true),
            ["vagaRegimeJornada"] = BuildEnumOptions<VagaRegimeJornada>(moveZeroToEnd: true),
            ["vagaEscalaTrabalho"] = BuildEnumOptions<VagaEscalaTrabalho>(moveZeroToEnd: true),
            ["vagaMoeda"] = BuildEnumOptions<VagaMoeda>(),
            ["vagaRemuneracaoPeriodicidade"] = BuildEnumOptions<VagaRemuneracaoPeriodicidade>(),
            ["vagaBonusTipo"] = BuildEnumOptions<VagaBonusTipo>(moveZeroToEnd: true),
            ["vagaBeneficioTipo"] = BuildEnumOptions<VagaBeneficioTipo>(),
            ["vagaBeneficioRecorrencia"] = BuildEnumOptions<VagaBeneficioRecorrencia>(),
            ["vagaEscolaridade"] = BuildEnumOptions<VagaEscolaridade>(moveZeroToEnd: true),
            ["vagaFormacaoArea"] = BuildEnumOptions<VagaFormacaoArea>(moveZeroToEnd: true),
            ["vagaRequisitoNivel"] = BuildEnumOptions<VagaRequisitoNivel>(),
            ["vagaRequisitoAvaliacao"] = BuildEnumOptions<VagaRequisitoAvaliacao>(),
            ["vagaEtapaResponsavel"] = BuildEnumOptions<VagaEtapaResponsavel>(),
            ["vagaEtapaModo"] = BuildEnumOptions<VagaEtapaModo>(),
            ["vagaPerguntaTipo"] = BuildEnumOptions<VagaPerguntaTipo>(),
            ["vagaPeso"] = BuildPesoOptions(),
            ["vagaPublicacaoVisibilidade"] = BuildEnumOptions<VagaPublicacaoVisibilidade>(moveZeroToEnd: true),
            ["vagaGeneroPreferencia"] = BuildEnumOptions<VagaGeneroPreferencia>(moveZeroToEnd: true),
            ["vagaAreaFilter"] = new List<EnumOptionResponse>
            {
                new("all", "Area: todas")
            }
        };

        return Ok(result);
    }

    [HttpGet("managers")]
    public async Task<ActionResult<LookupResponse<ManagerLookupItem>>> Gestores(
        [FromQuery] string? q,
        [FromQuery] bool onlyActive = true,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 5, 200);

        var query = _db.Managers
            .AsNoTracking()
            .Include(x => x.JobPosition)
            .Include(x => x.Area)
            .Include(x => x.Unit)
            .AsQueryable();

        if (onlyActive)
        {
            query = query.Where(x => x.Status == ManagerStatus.Active);
        }

        if (!string.IsNullOrWhiteSpace(q))
        {
            q = q.Trim();
            var like = $"%{q}%";

            query = query.Where(x =>
                EF.Functions.Like(x.Name, like) ||
                (x.Email != null && EF.Functions.Like(x.Email, like)) ||
                (x.JobPosition != null && EF.Functions.Like(x.JobPosition.Name, like)) ||
                (x.Area != null && EF.Functions.Like(x.Area.Name, like)) ||
                (x.Unit != null && EF.Functions.Like(x.Unit.Name, like))
            );
        }

        var total = await query.CountAsync(ct);
        var skip = (page - 1) * pageSize;

        var items = await query
            .OrderBy(x => x.Name)
            .Skip(skip)
            .Take(pageSize)
            .Select(x => new ManagerLookupItem
            {
                Id = x.Id,
                Nome = x.Name,
                Email = x.Email,

                Cargo = x.JobPosition != null ? x.JobPosition.Name : null,
                Area = x.Area != null ? x.Area.Name : null,
                Unidade = x.Unit != null ? x.Unit.Name : null,

                Status = x.Status,

                Telefone = x.Phone,
                Headcount = x.Headcount,
                Observacao = x.Notes,

                CreatedAt = x.CreatedAtUtc,
                UpdatedAt = x.UpdatedAtUtc
            })
            .ToListAsync(ct);

        var count = items.Count;
        var hasMore = (skip + count) < total;

        return Ok(new LookupResponse<ManagerLookupItem>
        {
            Items = items,
            Total = total,
            HasMore = hasMore
        });
    }

    [HttpGet("enums")]
    public ActionResult<Dictionary<string, IReadOnlyList<EnumOptionResponse>>> Enums()
    {
        var candidatoStatus = BuildEnumOptions<CandidatoStatus>();
        var candidatoDocumentoTipo = BuildEnumOptions<CandidatoDocumentoTipo>();

        var vagaStatus = BuildEnumOptions<VagaStatus>(moveZeroToEnd: true);
        var vagaModalidade = BuildEnumOptions<VagaModalidade>();
        var vagaSenioridade = BuildEnumOptions<VagaSenioridade>(moveZeroToEnd: true);
        var vagaArea = BuildEnumOptions<VagaArea>(moveZeroToEnd: true);
        var vagaAreaTime = BuildEnumOptions<VagaAreaTime>(moveZeroToEnd: true);
        var vagaTipoContratacao = BuildEnumOptions<VagaTipoContratacao>(moveZeroToEnd: true);
        var vagaMotivoAbertura = BuildEnumOptions<VagaMotivoAbertura>(moveZeroToEnd: true);
        var vagaOrcamentoAprovado = BuildEnumOptions<VagaOrcamentoAprovado>(moveZeroToEnd: true);
        var vagaPrioridade = BuildEnumOptions<VagaPrioridade>(moveZeroToEnd: true);
        var vagaRegimeJornada = BuildEnumOptions<VagaRegimeJornada>(moveZeroToEnd: true);
        var vagaEscalaTrabalho = BuildEnumOptions<VagaEscalaTrabalho>(moveZeroToEnd: true);
        var vagaMoeda = BuildEnumOptions<VagaMoeda>();
        var vagaRemuneracaoPeriodicidade = BuildEnumOptions<VagaRemuneracaoPeriodicidade>();
        var vagaBonusTipo = BuildEnumOptions<VagaBonusTipo>(moveZeroToEnd: true);
        var vagaBeneficioTipo = BuildEnumOptions<VagaBeneficioTipo>();
        var vagaBeneficioRecorrencia = BuildEnumOptions<VagaBeneficioRecorrencia>();
        var vagaEscolaridade = BuildEnumOptions<VagaEscolaridade>(moveZeroToEnd: true);
        var vagaFormacaoArea = BuildEnumOptions<VagaFormacaoArea>(moveZeroToEnd: true);
        var vagaRequisitoNivel = BuildEnumOptions<VagaRequisitoNivel>();
        var vagaRequisitoAvaliacao = BuildEnumOptions<VagaRequisitoAvaliacao>();
        var vagaEtapaResponsavel = BuildEnumOptions<VagaEtapaResponsavel>();
        var vagaEtapaModo = BuildEnumOptions<VagaEtapaModo>();
        var vagaPerguntaTipo = BuildEnumOptions<VagaPerguntaTipo>();
        var vagaPeso = BuildPesoOptions();
        var vagaPublicacaoVisibilidade = BuildEnumOptions<VagaPublicacaoVisibilidade>(moveZeroToEnd: true);
        var vagaGeneroPreferencia = BuildEnumOptions<VagaGeneroPreferencia>(moveZeroToEnd: true);

        var result = new Dictionary<string, IReadOnlyList<EnumOptionResponse>>
        {
            ["selectPlaceholder"] = BuildStaticOptions(("", "Selecione...")),

            ["candidatoStatus"] = candidatoStatus,
            ["candidatoStatusFilter"] = BuildFilterOptions("Status: todos", candidatoStatus),
            ["candidatoFonte"] = BuildEnumOptions<CandidatoFonte>(),
            ["candidatoDocumentoTipo"] = candidatoDocumentoTipo,

            ["vagaStatus"] = vagaStatus,
            ["vagaStatusFilter"] = BuildFilterOptions("Status: todos", vagaStatus),
            ["vagaArea"] = vagaArea,
            ["vagaAreaFilter"] = BuildStaticOptions(("all", "Area: todas")),
            ["vagaModalidade"] = vagaModalidade,
            ["vagaSenioridade"] = vagaSenioridade,
            ["vagaDepartamento"] = BuildEnumOptions<VagaDepartamento>(moveZeroToEnd: true),
            ["vagaAreaTime"] = vagaAreaTime,
            ["vagaTipoContratacao"] = vagaTipoContratacao,
            ["vagaMotivoAbertura"] = vagaMotivoAbertura,
            ["vagaOrcamentoAprovado"] = vagaOrcamentoAprovado,
            ["vagaPrioridade"] = vagaPrioridade,
            ["vagaRegimeJornada"] = vagaRegimeJornada,
            ["vagaEscalaTrabalho"] = vagaEscalaTrabalho,
            ["vagaMoeda"] = vagaMoeda,
            ["vagaRemuneracaoPeriodicidade"] = vagaRemuneracaoPeriodicidade,
            ["vagaBonusTipo"] = vagaBonusTipo,
            ["vagaBeneficioTipo"] = vagaBeneficioTipo,
            ["vagaBeneficioRecorrencia"] = vagaBeneficioRecorrencia,
            ["vagaEscolaridade"] = vagaEscolaridade,
            ["vagaFormacaoArea"] = vagaFormacaoArea,
            ["vagaRequisitoNivel"] = vagaRequisitoNivel,
            ["vagaRequisitoAvaliacao"] = vagaRequisitoAvaliacao,
            ["vagaEtapaResponsavel"] = vagaEtapaResponsavel,
            ["vagaEtapaModo"] = vagaEtapaModo,
            ["vagaPerguntaTipo"] = vagaPerguntaTipo,
            ["vagaPeso"] = vagaPeso,
            ["vagaPublicacaoVisibilidade"] = vagaPublicacaoVisibilidade,
            ["vagaGeneroPreferencia"] = vagaGeneroPreferencia,
            ["vagaFilter"] = BuildStaticOptions(("all", "Vaga: todas")),
            ["vagaFilterSimple"] = BuildStaticOptions(("all", "Todas")),

            ["requisitoCategoria"] = BuildStaticOptions(
                ("competencia", "Competencia"),
                ("experiencia", "Experiencia"),
                ("formacao", "Formacao"),
                ("ferramenta_tecnologia", "Ferramenta/Tecnologia"),
                ("idioma", "Idioma"),
                ("certificacao", "Certificacao"),
                ("localidade", "Localidade"),
                ("outros", "Outros")
            ),

            ["matchingSort"] = BuildStaticOptions(
                ("score_desc", "Ordenar: Match (maior -> menor)"),
                ("score_asc", "Ordenar: Match (menor -> maior)"),
                ("updated_desc", "Ordenar: Atualizacao (recente)"),
                ("updated_asc", "Ordenar: Atualizacao (antiga)"),
                ("name_asc", "Ordenar: Nome (A-Z)")
            ),

            ["origemFilter"] = BuildStaticOptions(
                ("all", "Origem: todas"),
                ("email", "Email"),
                ("pasta", "Pasta"),
                ("upload", "Upload")
            ),
            ["origemFilterSimple"] = BuildStaticOptions(
                ("all", "Todas"),
                ("email", "Email"),
                ("pasta", "Pasta"),
                ("upload", "Upload")
            ),

            ["inboxStatusFilter"] = BuildStaticOptions(
                ("all", "Status: todos"),
                ("novo", "Novo"),
                ("processando", "Processando"),
                ("processado", "Processado"),
                ("falha", "Falha"),
                ("descartado", "Descartado")
            ),
            ["inboxStatusFilterSimple"] = BuildStaticOptions(
                ("all", "Todos"),
                ("novo", "Novo"),
                ("processando", "Processando"),
                ("processado", "Processado"),
                ("falha", "Falha"),
                ("descartado", "Descartado")
            ),

            ["relatorioPeriodo"] = BuildStaticOptions(
                ("7d", "Ultimos 7 dias"),
                ("30d", "Ultimos 30 dias"),
                ("90d", "Ultimos 90 dias"),
                ("ytd", "Ano atual (YTD)")
            ),
            ["relatorioFrequencia"] = BuildStaticOptions(
                ("daily", "Diario"),
                ("weekly", "Semanal"),
                ("monthly", "Mensal")
            ),

            ["usuarioStatus"] = BuildStaticOptions(
                ("active", "Ativo"),
                ("invited", "Convidado"),
                ("disabled", "Desativado")
            ),
            ["usuarioStatusFilter"] = BuildStaticOptions(
                ("all", "Todos"),
                ("active", "Ativo"),
                ("invited", "Convidado"),
                ("disabled", "Desativado")
            ),
            ["usuarioMfaOption"] = BuildStaticOptions(
                ("false", "Desabilitado"),
                ("true", "Habilitado")
            ),
            ["roleFilter"] = BuildStaticOptions(("all", "Todos")),

            ["triagemDecisionAction"] = BuildStaticOptions(
                ("aprovado", "Aprovar"),
                ("pendente", "Marcar como Pendente"),
                ("reprovado", "Reprovar"),
                ("triagem", "Manter em Triagem")
            ),
            ["triagemDecisionReason"] = BuildStaticOptions(
                ("", "(opcional)"),
                ("missing_mandatory", "Faltou requisito obrigatorio"),
                ("below_threshold", "Match abaixo do minimo"),
                ("profile_fit", "Perfil aderente"),
                ("needs_validation", "Necessita validacao tecnica"),
                ("low_experience", "Experiencia insuficiente"),
                ("location_availability", "Localizacao/Disponibilidade")
            )
        };

        return Ok(result);
    }

    private static IReadOnlyList<EnumOptionResponse> BuildEnumOptions<TEnum>(
        bool lowerCaseCode = true,
        bool moveZeroToEnd = false)
        where TEnum : struct, Enum
    {
        var values = Enum.GetValues<TEnum>().ToList();

        if (moveZeroToEnd)
        {
            values = values
                .OrderBy(v => Convert.ToInt32(v) == 0 ? int.MaxValue : Convert.ToInt32(v))
                .ToList();
        }

        return values.Select(value =>
        {
            var code = value.ToString();
            var text = HumanizeEnum(code);
            if (lowerCaseCode)
            {
                code = code.ToLowerInvariant();
            }
            return new EnumOptionResponse(code, text);
        }).ToList();
    }

    private static IReadOnlyList<EnumOptionResponse> BuildPesoOptions()
    {
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["Um"] = "1",
            ["Dois"] = "2",
            ["Tres"] = "3",
            ["Quatro"] = "4",
            ["Cinco"] = "5"
        };

        return Enum.GetValues<VagaPeso>()
            .Select(value =>
            {
                var rawCode = value.ToString();
                var text = map.TryGetValue(rawCode, out var label) ? label : HumanizeEnum(rawCode);
                var code = rawCode.ToLowerInvariant();
                return new EnumOptionResponse(code, text);
            })
            .ToList();
    }

    private static IReadOnlyList<EnumOptionResponse> BuildFilterOptions(
        string allText,
        IReadOnlyList<EnumOptionResponse> items)
    {
        var list = new List<EnumOptionResponse>
        {
            new("all", allText)
        };
        list.AddRange(items);
        return list;
    }

    private static IReadOnlyList<EnumOptionResponse> BuildStaticOptions(params (string Code, string Text)[] items)
    {
        return items.Select(item => new EnumOptionResponse(item.Code, item.Text)).ToList();
    }

    private static string HumanizeEnum(string value)
    {
        if (string.IsNullOrWhiteSpace(value)) return value;
        var spaced = Regex.Replace(value, "([a-z0-9])([A-Z])", "$1 $2");
        return spaced.Replace("Nao ", "Nao ");
    }
}
