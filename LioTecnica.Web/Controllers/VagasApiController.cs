using System.Text.Json;
using LioTecnica.Web.Infrastructure.ApiClients;
using Microsoft.AspNetCore.Mvc;

namespace LioTecnica.Web.Controllers;

[ApiController]
[Route("api/vagas")]
public sealed class VagasApiController : ControllerBase
{
    private readonly VagasApiClient _vagas;

    public VagasApiController(VagasApiClient vagas)
        => _vagas = vagas;

    [HttpGet]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var tenantId = GetTenantId();
        var auth = Request.Headers.Authorization.ToString();

        var resp = await _vagas.GetVagasRawAsync(tenantId, auth, ct);
        return ToContentResult(resp);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var tenantId = GetTenantId();
        var auth = Request.Headers.Authorization.ToString();

        var resp = await _vagas.GetVagaByIdRawAsync(tenantId, auth, id, ct);
        return ToContentResult(resp);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] JsonElement payload, CancellationToken ct)
    {
        var tenantId = GetTenantId();
        var auth = Request.Headers.Authorization.ToString();

        var resp = await _vagas.CreateRawAsync(tenantId, auth, payload, ct);
        return ToContentResult(resp);
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] JsonElement payload, CancellationToken ct)
    {
        var tenantId = GetTenantId();
        var auth = Request.Headers.Authorization.ToString();

        var resp = await _vagas.UpdateRawAsync(tenantId, auth, id, payload, ct);
        return ToContentResult(resp);
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        var tenantId = GetTenantId();
        var auth = Request.Headers.Authorization.ToString();

        var resp = await _vagas.DeleteRawAsync(tenantId, auth, id, ct);
        return ToContentResult(resp);
    }

    private string GetTenantId()
    {
        var tenantId = Request.Headers["X-Tenant-Id"].ToString();
        return string.IsNullOrWhiteSpace(tenantId) ? "liotecnica" : tenantId;
    }

    private static IActionResult ToContentResult(ApiRawResponse resp)
    {
        if (string.IsNullOrWhiteSpace(resp.Content))
            return new StatusCodeResult((int)resp.StatusCode);

        return new ContentResult
        {
            StatusCode = (int)resp.StatusCode,
            ContentType = "application/json",
            Content = resp.Content
        };
    }
}
