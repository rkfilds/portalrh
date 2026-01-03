using LioTecnica.Web.Infrastructure.ApiClients;
using LioTecnica.Web.Services;
using Microsoft.AspNetCore.Mvc;

namespace LioTecnica.Web.Controllers;

[ApiController]
[Route("api/lookup")]
public sealed class LookupController : ControllerBase
{
    private readonly AreasApiClient _areas;
    private readonly DepartmentsApiClient _departments;
    private readonly VagasApiClient _vagas;
    private readonly IGestoresLookupService _gestores;

    public LookupController(
        AreasApiClient areas,
        DepartmentsApiClient departments,
        VagasApiClient vagas,
        IGestoresLookupService gestores)
    {
        _areas = areas;
        _departments = departments;
        _vagas = vagas;
        _gestores = gestores;
    }

    [HttpGet("areas")]
    public async Task<IActionResult> Areas(CancellationToken ct)
    {
        var tenantId = GetTenantId();
        var areas = await _areas.GetAreasAsync(tenantId, ct);

        var result = areas
            .Where(a => a.IsActive)
            .Select(a => new { id = a.Id, code = a.Code, name = a.Name })
            .ToList();

        return Ok(result);
    }

    [HttpGet("departments")]
    public async Task<IActionResult> Departments(CancellationToken ct)
    {
        var tenantId = GetTenantId();
        var list = await _departments.GetLookupOptionsAsync(tenantId, ct);
        return Ok(list);
    }

    [HttpGet("vaga-enums")]
    public async Task<IActionResult> VagaEnums(CancellationToken ct)
    {
        var tenantId = GetTenantId();
        var auth = Request.Headers.Authorization.ToString();

        var resp = await _vagas.GetVagaEnumsRawAsync(tenantId, auth, ct);
        if (string.IsNullOrWhiteSpace(resp.Content))
            return new StatusCodeResult((int)resp.StatusCode);

        return new ContentResult
        {
            StatusCode = (int)resp.StatusCode,
            ContentType = "application/json",
            Content = resp.Content
        };
    }

    // GET /api/lookup/managers?onlyActive=true&page=1&pageSize=50&q=ana
    [HttpGet("managers")]
    public async Task<ActionResult<LookupResponse<GestorLookupItem>>> Managers(
        [FromQuery] string? q = null,
        [FromQuery] bool onlyActive = true,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 5, 200);

        var resp = await _gestores.LookupAsync(q, onlyActive, page, pageSize, ct);
        return Ok(resp);
    }

    private string GetTenantId()
    {
        var tenantId = Request.Headers["X-Tenant-Id"].ToString();
        return string.IsNullOrWhiteSpace(tenantId) ? "liotecnica" : tenantId;
    }
}
