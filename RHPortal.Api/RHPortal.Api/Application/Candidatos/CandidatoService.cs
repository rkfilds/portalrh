using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using RhPortal.Api.Contracts.Candidatos;
using RhPortal.Api.Domain.Entities;
using RhPortal.Api.Domain.Enums;
using RhPortal.Api.Infrastructure.Data;
using RhPortal.Api.Infrastructure.Tenancy;

namespace RhPortal.Api.Application.Candidatos;

public interface ICandidatoService
{
    Task<IReadOnlyList<CandidatoListItemResponse>> ListAsync(CandidatoListQuery query, CancellationToken ct);
    Task<CandidatoResponse?> GetByIdAsync(Guid id, CancellationToken ct);
    Task<CandidatoResponse> CreateAsync(CandidatoCreateRequest request, CancellationToken ct);
    Task<CandidatoResponse?> UpdateAsync(Guid id, CandidatoUpdateRequest request, CancellationToken ct);
    Task<bool> DeleteAsync(Guid id, CancellationToken ct);
    Task<CandidatoDocumentoResponse?> AddDocumentoAsync(Guid candidatoId, CandidatoDocumentoTipo tipo, string? descricao, IFormFile arquivo, CancellationToken ct);
    Task<CandidatoDocumentoFileResult?> GetDocumentoFileAsync(Guid candidatoId, Guid documentoId, CancellationToken ct);
    Task<bool> DeleteDocumentoAsync(Guid candidatoId, Guid documentoId, CancellationToken ct);
    Task<IReadOnlyList<CandidatoHistoricoResponse>> ListHistoricoAsync(Guid candidatoId, CancellationToken ct);
    Task<CandidatoHistoricoResponse> AddHistoricoAsync(Guid candidatoId, CandidatoHistoricoRequest request, CancellationToken ct);
    Task<CandidatoHistoricoResponse?> UpdateHistoricoAsync(Guid candidatoId, Guid historicoId, CandidatoHistoricoRequest request, CancellationToken ct);
    Task<IReadOnlyList<CandidatoTriagemHistoricoResponse>> ListTriagemHistoricoAsync(Guid candidatoId, CancellationToken ct);
    Task<CandidatoTriagemHistoricoResponse> AddTriagemHistoricoAsync(Guid candidatoId, CandidatoTriagemHistoricoRequest request, CancellationToken ct);
}

public sealed record CandidatoDocumentoFileResult(string FilePath, string? ContentType, string FileName);

public sealed class CandidatoService : ICandidatoService
{
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly IHostEnvironment _hostEnvironment;

    public CandidatoService(AppDbContext db, ITenantContext tenantContext, IHostEnvironment hostEnvironment)
    {
        _db = db;
        _tenantContext = tenantContext;
        _hostEnvironment = hostEnvironment;
    }

    public async Task<IReadOnlyList<CandidatoListItemResponse>> ListAsync(CandidatoListQuery query, CancellationToken ct)
    {
        IQueryable<Candidato> q = _db.Candidatos
            .AsNoTracking()
            .Include(x => x.Vaga);

        if (!string.IsNullOrWhiteSpace(query.Q))
        {
            var term = query.Q.Trim();
            var like = $"%{term}%";

            q = q.Where(c =>
                EF.Functions.Like(c.Nome, like) ||
                EF.Functions.Like(c.Email, like) ||
                (c.Fone != null && EF.Functions.Like(c.Fone, like)) ||
                (c.Cidade != null && EF.Functions.Like(c.Cidade, like)) ||
                (c.Uf != null && EF.Functions.Like(c.Uf, like)) ||
                (c.Obs != null && EF.Functions.Like(c.Obs, like)) ||
                (c.Vaga != null &&
                    ((c.Vaga.Codigo != null && EF.Functions.Like(c.Vaga.Codigo, like)) ||
                     EF.Functions.Like(c.Vaga.Titulo, like)))
            );
        }

        if (query.Status.HasValue)
            q = q.Where(c => c.Status == query.Status.Value);

        if (query.Fonte.HasValue)
            q = q.Where(c => c.Fonte == query.Fonte.Value);

        if (query.VagaId.HasValue && query.VagaId.Value != Guid.Empty)
            q = q.Where(c => c.VagaId == query.VagaId.Value);

        var items = await q
            .Select(c => new CandidatoListItemResponse(
                c.Id,
                c.Nome,
                c.Email,
                c.Fone,
                c.Cidade,
                c.Uf,
                c.Fonte,
                c.Status,
                c.VagaId,
                c.Vaga != null ? c.Vaga.Codigo : null,
                c.Vaga != null ? c.Vaga.Titulo : null,
                c.Obs,
                c.CvText,
                MapMatch(c),
                c.CreatedAtUtc,
                c.UpdatedAtUtc
            ))
            .ToListAsync(ct);

        return items
            .OrderByDescending(x => x.UpdatedAtUtc)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToList();
    }

    public async Task<CandidatoResponse?> GetByIdAsync(Guid id, CancellationToken ct)
    {
        var entity = await _db.Candidatos
            .AsNoTracking()
            .Include(x => x.Vaga)
            .Include(x => x.Documentos)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        return entity is null ? null : MapToResponse(entity);
    }

    public async Task<CandidatoResponse> CreateAsync(CandidatoCreateRequest request, CancellationToken ct)
    {
        await EnsureVagaAsync(request.VagaId, ct);

        var now = DateTimeOffset.UtcNow;
        var entity = new Candidato
        {
            Id = Guid.NewGuid(),
            Nome = (request.Nome ?? string.Empty).Trim(),
            Email = NormalizeEmail(request.Email),
            Fone = TrimOrNull(request.Fone),
            Cidade = TrimOrNull(request.Cidade),
            Uf = NormalizeUf(request.Uf),
            Fonte = request.Fonte,
            Status = request.Status,
            VagaId = request.VagaId,
            Obs = TrimOrNull(request.Obs),
            CvText = TrimOrNull(request.CvText)
        };

        entity.Documentos = BuildDocumentos(request.Documentos, entity.Id);

        ApplyLastMatch(entity, request.LastMatch);

        _db.Candidatos.Add(entity);
        _db.CandidatoHistoricos.Add(new CandidatoHistorico
        {
            Id = Guid.NewGuid(),
            CandidatoId = entity.Id,
            VagaId = entity.VagaId,
            AppliedAtUtc = now
        });
        await _db.SaveChangesAsync(ct);

        return (await GetByIdAsync(entity.Id, ct))!;
    }

    public async Task<CandidatoResponse?> UpdateAsync(Guid id, CandidatoUpdateRequest request, CancellationToken ct)
    {
        var entity = await _db.Candidatos
            .Include(x => x.Documentos)
            .FirstOrDefaultAsync(x => x.Id == id, ct);

        if (entity is null) return null;

        await EnsureVagaAsync(request.VagaId, ct);

        var previousVagaId = entity.VagaId;
        entity.Nome = (request.Nome ?? string.Empty).Trim();
        entity.Email = NormalizeEmail(request.Email);
        entity.Fone = TrimOrNull(request.Fone);
        entity.Cidade = TrimOrNull(request.Cidade);
        entity.Uf = NormalizeUf(request.Uf);
        entity.Fonte = request.Fonte;
        entity.Status = request.Status;
        entity.VagaId = request.VagaId;
        entity.Obs = TrimOrNull(request.Obs);
        entity.CvText = TrimOrNull(request.CvText);

        ApplyLastMatch(entity, request.LastMatch);

        if (request.Documentos is not null)
        {
            if (entity.Documentos.Count > 0)
                _db.CandidatoDocumentos.RemoveRange(entity.Documentos);

            entity.Documentos = BuildDocumentos(request.Documentos, entity.Id);
        }

        if (previousVagaId != entity.VagaId)
        {
            _db.CandidatoHistoricos.Add(new CandidatoHistorico
            {
                Id = Guid.NewGuid(),
                CandidatoId = entity.Id,
                VagaId = entity.VagaId,
                AppliedAtUtc = DateTimeOffset.UtcNow
            });
        }

        await _db.SaveChangesAsync(ct);
        return await GetByIdAsync(id, ct);
    }

    public async Task<bool> DeleteAsync(Guid id, CancellationToken ct)
    {
        var entity = await _db.Candidatos
            .Include(x => x.Documentos)
            .FirstOrDefaultAsync(x => x.Id == id, ct);
        if (entity is null) return false;

        var files = entity.Documentos
            .Where(d => !string.IsNullOrWhiteSpace(d.StorageFileName))
            .Select(d => d.StorageFileName!)
            .ToList();

        var folder = GetCandidateFolder(id);

        _db.Candidatos.Remove(entity);
        await _db.SaveChangesAsync(ct);

        DeleteStoredFiles(folder, files);
        TryDeleteFolder(folder);
        return true;
    }

    public async Task<CandidatoDocumentoResponse?> AddDocumentoAsync(Guid candidatoId, CandidatoDocumentoTipo tipo, string? descricao, IFormFile arquivo, CancellationToken ct)
    {
        if (arquivo is null || arquivo.Length == 0)
            throw new InvalidOperationException("Arquivo invalido.");

        var exists = await _db.Candidatos
            .AsNoTracking()
            .AnyAsync(x => x.Id == candidatoId, ct);

        if (!exists) return null;

        var originalName = NormalizeFileName(arquivo.FileName);
        var documentId = Guid.NewGuid();
        var storageFileName = BuildStorageFileName(documentId, originalName);
        var folder = GetCandidateFolder(candidatoId);
        Directory.CreateDirectory(folder);
        var filePath = Path.Combine(folder, storageFileName);

        await using (var stream = new FileStream(filePath, FileMode.Create, FileAccess.Write, FileShare.None))
        {
            await arquivo.CopyToAsync(stream, ct);
        }

        var doc = new CandidatoDocumento
        {
            Id = documentId,
            CandidatoId = candidatoId,
            Tipo = tipo,
            NomeArquivo = originalName,
            ContentType = TrimOrNull(arquivo.ContentType),
            Descricao = TrimOrNull(descricao),
            TamanhoBytes = arquivo.Length,
            StorageFileName = storageFileName,
            Url = null
        };

        try
        {
            _db.CandidatoDocumentos.Add(doc);
            await _db.SaveChangesAsync(ct);
        }
        catch
        {
            TryDeleteFile(filePath);
            throw;
        }

        return MapDocumento(candidatoId, doc);
    }

    public async Task<CandidatoDocumentoFileResult?> GetDocumentoFileAsync(Guid candidatoId, Guid documentoId, CancellationToken ct)
    {
        var doc = await _db.CandidatoDocumentos
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == documentoId && x.CandidatoId == candidatoId, ct);

        if (doc is null || string.IsNullOrWhiteSpace(doc.StorageFileName))
            return null;

        var folder = GetCandidateFolder(candidatoId);
        var path = Path.Combine(folder, doc.StorageFileName);
        if (!File.Exists(path))
            return null;

        return new CandidatoDocumentoFileResult(path, doc.ContentType, doc.NomeArquivo);
    }

    public async Task<bool> DeleteDocumentoAsync(Guid candidatoId, Guid documentoId, CancellationToken ct)
    {
        var doc = await _db.CandidatoDocumentos
            .FirstOrDefaultAsync(x => x.Id == documentoId && x.CandidatoId == candidatoId, ct);

        if (doc is null) return false;

        var filePath = string.IsNullOrWhiteSpace(doc.StorageFileName)
            ? null
            : Path.Combine(GetCandidateFolder(candidatoId), doc.StorageFileName);

        _db.CandidatoDocumentos.Remove(doc);
        await _db.SaveChangesAsync(ct);

        if (filePath is not null)
            TryDeleteFile(filePath);

        return true;
    }

    public async Task<IReadOnlyList<CandidatoHistoricoResponse>> ListHistoricoAsync(Guid candidatoId, CancellationToken ct)
    {
        var exists = await _db.Candidatos.AnyAsync(x => x.Id == candidatoId, ct);
        if (!exists) return Array.Empty<CandidatoHistoricoResponse>();

        var rows = await _db.CandidatoHistoricos
            .AsNoTracking()
            .Include(x => x.Vaga)
            .Where(x => x.CandidatoId == candidatoId)
            .OrderByDescending(x => x.AppliedAtUtc)
            .ToListAsync(ct);

        return rows.Select(MapHistorico).ToList();
    }

    public async Task<CandidatoHistoricoResponse> AddHistoricoAsync(Guid candidatoId, CandidatoHistoricoRequest request, CancellationToken ct)
    {
        var exists = await _db.Candidatos.AnyAsync(x => x.Id == candidatoId, ct);
        if (!exists)
            throw new InvalidOperationException("Candidato nao encontrado.");

        await EnsureVagaAsync(request.VagaId, ct);

        var appliedAt = request.AppliedAtUtc == default ? DateTimeOffset.UtcNow : request.AppliedAtUtc;
        var entity = new CandidatoHistorico
        {
            Id = Guid.NewGuid(),
            CandidatoId = candidatoId,
            VagaId = request.VagaId,
            AppliedAtUtc = appliedAt,
            LastContactAtUtc = request.LastContactAtUtc,
            Interviewed = request.Interviewed,
            InterviewAtUtc = request.InterviewAtUtc,
            Notes = TrimOrNull(request.Notes)
        };

        _db.CandidatoHistoricos.Add(entity);
        await _db.SaveChangesAsync(ct);

        await _db.Entry(entity).Reference(x => x.Vaga).LoadAsync(ct);
        return MapHistorico(entity);
    }

    public async Task<CandidatoHistoricoResponse?> UpdateHistoricoAsync(Guid candidatoId, Guid historicoId, CandidatoHistoricoRequest request, CancellationToken ct)
    {
        var entity = await _db.CandidatoHistoricos
            .Include(x => x.Vaga)
            .FirstOrDefaultAsync(x => x.Id == historicoId && x.CandidatoId == candidatoId, ct);

        if (entity is null) return null;

        await EnsureVagaAsync(request.VagaId, ct);

        entity.VagaId = request.VagaId;
        if (request.AppliedAtUtc != default)
            entity.AppliedAtUtc = request.AppliedAtUtc;
        entity.LastContactAtUtc = request.LastContactAtUtc;
        entity.Interviewed = request.Interviewed;
        entity.InterviewAtUtc = request.InterviewAtUtc;
        entity.Notes = TrimOrNull(request.Notes);

        await _db.SaveChangesAsync(ct);
        await _db.Entry(entity).Reference(x => x.Vaga).LoadAsync(ct);
        return MapHistorico(entity);
    }

    public async Task<IReadOnlyList<CandidatoTriagemHistoricoResponse>> ListTriagemHistoricoAsync(Guid candidatoId, CancellationToken ct)
    {
        var exists = await _db.Candidatos.AnyAsync(x => x.Id == candidatoId, ct);
        if (!exists) return Array.Empty<CandidatoTriagemHistoricoResponse>();

        var rows = await _db.CandidatoTriagemHistoricos
            .AsNoTracking()
            .Where(x => x.CandidatoId == candidatoId)
            .OrderByDescending(x => x.OccurredAtUtc)
            .ThenByDescending(x => x.CreatedAtUtc)
            .ToListAsync(ct);

        return rows.Select(MapTriagemHistorico).ToList();
    }

    public async Task<CandidatoTriagemHistoricoResponse> AddTriagemHistoricoAsync(Guid candidatoId, CandidatoTriagemHistoricoRequest request, CancellationToken ct)
    {
        var exists = await _db.Candidatos.AnyAsync(x => x.Id == candidatoId, ct);
        if (!exists)
            throw new InvalidOperationException("Candidato nao encontrado.");

        var occurredAt = request.OccurredAtUtc ?? DateTimeOffset.UtcNow;
        var entity = new CandidatoTriagemHistorico
        {
            Id = Guid.NewGuid(),
            CandidatoId = candidatoId,
            FromStatus = request.FromStatus,
            ToStatus = request.ToStatus,
            Reason = TrimOrNull(request.Reason),
            Notes = TrimOrNull(request.Notes),
            OccurredAtUtc = occurredAt
        };

        _db.CandidatoTriagemHistoricos.Add(entity);
        await _db.SaveChangesAsync(ct);
        return MapTriagemHistorico(entity);
    }

    private async Task EnsureVagaAsync(Guid vagaId, CancellationToken ct)
    {
        var exists = await _db.Vagas.AnyAsync(v => v.Id == vagaId, ct);
        if (!exists) throw new InvalidOperationException("Vaga invalida.");
    }

    private static CandidatoResponse MapToResponse(Candidato c)
    {
        return new CandidatoResponse(
            c.Id,
            c.Nome,
            c.Email,
            c.Fone,
            c.Cidade,
            c.Uf,
            c.Fonte,
            c.Status,
            c.VagaId,
            c.Vaga != null ? c.Vaga.Codigo : null,
            c.Vaga != null ? c.Vaga.Titulo : null,
            c.Obs,
            c.CvText,
            MapMatch(c),
            c.Documentos.OrderByDescending(x => x.CreatedAtUtc).Select(doc => MapDocumento(c.Id, doc)).ToList(),
            c.CreatedAtUtc,
            c.UpdatedAtUtc
        );
    }

    private static CandidatoDocumentoResponse MapDocumento(Guid candidatoId, CandidatoDocumento d)
    {
        var url = !string.IsNullOrWhiteSpace(d.StorageFileName)
            ? BuildDownloadUrl(candidatoId, d.Id)
            : TrimOrNull(d.Url);

        return new CandidatoDocumentoResponse(
            d.Id,
            d.Tipo,
            d.NomeArquivo,
            d.ContentType,
            d.Descricao,
            d.TamanhoBytes,
            url,
            d.CreatedAtUtc,
            d.UpdatedAtUtc
        );
    }

    private static CandidatoHistoricoResponse MapHistorico(CandidatoHistorico h)
    {
        return new CandidatoHistoricoResponse(
            h.Id,
            h.VagaId,
            h.Vaga?.Codigo,
            h.Vaga?.Titulo,
            h.AppliedAtUtc,
            h.LastContactAtUtc,
            h.Interviewed,
            h.InterviewAtUtc,
            h.Notes,
            h.CreatedAtUtc,
            h.UpdatedAtUtc
        );
    }

    private static CandidatoTriagemHistoricoResponse MapTriagemHistorico(CandidatoTriagemHistorico h)
    {
        return new CandidatoTriagemHistoricoResponse(
            h.Id,
            h.FromStatus,
            h.ToStatus,
            h.Reason,
            h.Notes,
            h.OccurredAtUtc,
            h.CreatedAtUtc,
            h.UpdatedAtUtc
        );
    }

    private static CandidatoMatchResponse? MapMatch(Candidato c)
    {
        if (c.LastMatchScore is null && c.LastMatchPass is null && c.LastMatchAtUtc is null && c.LastMatchVagaId is null)
            return null;

        return new CandidatoMatchResponse(
            c.LastMatchScore,
            c.LastMatchPass,
            c.LastMatchAtUtc,
            c.LastMatchVagaId
        );
    }

    private static void ApplyLastMatch(Candidato entity, CandidatoMatchRequest? match)
    {
        if (match is null)
        {
            entity.LastMatchScore = null;
            entity.LastMatchPass = null;
            entity.LastMatchAtUtc = null;
            entity.LastMatchVagaId = null;
            return;
        }

        entity.LastMatchScore = match.Score;
        entity.LastMatchPass = match.Pass;
        entity.LastMatchAtUtc = match.AtUtc;
        entity.LastMatchVagaId = match.VagaId;
    }

    private static List<CandidatoDocumento> BuildDocumentos(IReadOnlyList<CandidatoDocumentoRequest>? items, Guid candidatoId)
    {
        if (items is null || items.Count == 0) return [];

        var list = new List<CandidatoDocumento>(items.Count);
        for (var i = 0; i < items.Count; i++)
        {
            var item = items[i];
            list.Add(new CandidatoDocumento
            {
                Id = Guid.NewGuid(),
                CandidatoId = candidatoId,
                Tipo = item.Tipo,
                NomeArquivo = (item.NomeArquivo ?? string.Empty).Trim(),
                ContentType = TrimOrNull(item.ContentType),
                Descricao = TrimOrNull(item.Descricao),
                TamanhoBytes = item.TamanhoBytes,
                Url = TrimOrNull(item.Url)
            });
        }
        return list;
    }

    private string GetCandidateFolder(Guid candidatoId)
    {
        return Path.Combine(
            _hostEnvironment.ContentRootPath,
            "App_Data",
            "uploads",
            _tenantContext.TenantId,
            "candidatos",
            candidatoId.ToString("N"));
    }

    private static string BuildStorageFileName(Guid documentId, string originalName)
    {
        var extension = Path.GetExtension(originalName);
        if (!string.IsNullOrWhiteSpace(extension))
        {
            extension = new string(extension
                .Where(c => char.IsLetterOrDigit(c) || c == '.')
                .ToArray());

            if (extension.Length > 12)
                extension = extension[..12];
        }
        else
        {
            extension = string.Empty;
        }

        return $"{documentId:N}{extension}";
    }

    private static string NormalizeFileName(string? fileName)
    {
        var name = Path.GetFileName(fileName ?? string.Empty).Trim();
        if (string.IsNullOrWhiteSpace(name))
            name = "documento";

        if (name.Length > 200)
            name = name[..200];

        return name;
    }

    private static string BuildDownloadUrl(Guid candidatoId, Guid documentoId)
        => $"/api/candidatos/{candidatoId}/documentos/{documentoId}/download";

    private static void DeleteStoredFiles(string folder, IEnumerable<string> files)
    {
        foreach (var file in files)
        {
            var path = Path.Combine(folder, file);
            TryDeleteFile(path);
        }
    }

    private static void TryDeleteFolder(string folder)
    {
        try
        {
            if (Directory.Exists(folder))
                Directory.Delete(folder, true);
        }
        catch
        {
            // Ignorar falhas de limpeza.
        }
    }

    private static void TryDeleteFile(string path)
    {
        try
        {
            if (File.Exists(path))
                File.Delete(path);
        }
        catch
        {
            // Ignorar falhas de limpeza.
        }
    }

    private static string NormalizeEmail(string? email)
        => (email ?? string.Empty).Trim().ToLowerInvariant();

    private static string? NormalizeUf(string? uf)
    {
        var text = (uf ?? string.Empty).Trim();
        return string.IsNullOrWhiteSpace(text) ? null : text.ToUpperInvariant();
    }

    private static string? TrimOrNull(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
