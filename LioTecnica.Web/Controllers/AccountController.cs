using System.Security.Claims;
using LioTecnica.Web.Infrastructure.ApiClients;
using LioTecnica.Web.Infrastructure.Security;
using LioTecnica.Web.ViewModels.Authentication;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Security.Claims;

namespace LioTecnica.Web.Controllers;

public sealed class AccountController : Controller
{
    private readonly AuthApiClient _authApi;
    private readonly UsersApiClient _usersApi;

    public AccountController(AuthApiClient authApi, UsersApiClient usersApi)
    {
        _authApi = authApi;
        _usersApi = usersApi;
    }

    [AllowAnonymous]
    [HttpGet("/Account/Login")]
    public IActionResult Login([FromQuery] string? returnUrl = null)
    {
        return View(new LoginViewModel { ReturnUrl = returnUrl });
    }

    [AllowAnonymous]
    [HttpPost("/Account/Login")]
    public async Task<IActionResult> Login([FromForm] LoginViewModel model, CancellationToken ct)
    {
        if (!ModelState.IsValid)
            return View(model);

        var tenantId = model.TenantId.Trim().ToLowerInvariant();
        if (!TenantValidationMiddleware.IsValidTenantIdentifier(tenantId))
        {
            ModelState.AddModelError(nameof(model.TenantId), "Tenant inválido. Use apenas letras, números e hífen.");
            return View(model);
        }

        var response = await _authApi.LoginAsync(tenantId, model.Email.Trim(), model.Password, ct);
        if (response is null)
        {
            ModelState.AddModelError(string.Empty, "Invalid credentials.");
            return View(model);
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, response.UserId.ToString()),
            new(ClaimTypes.Email, response.Email),
            new(ClaimTypes.Name, response.FullName),
            new("tenant", response.TenantId),
            new("access_token", response.AccessToken)
        };

        foreach (var role in response.Roles ?? Array.Empty<string>())
            claims.Add(new Claim(ClaimTypes.Role, role));

        foreach (var permission in response.Permissions ?? Array.Empty<string>())
            claims.Add(new Claim("permission", permission));

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);

        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal,
            new AuthenticationProperties { IsPersistent = false });

        var redirectUrl = string.IsNullOrWhiteSpace(model.ReturnUrl) ? "/" : model.ReturnUrl;
        return LocalRedirect(redirectUrl);
    }

    [HttpPost("/Account/Logout")]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return RedirectToAction(nameof(Login));
    }

    [HttpGet("/Account/Profile")]
    public async Task<IActionResult> Profile(CancellationToken ct)
    {
        var current = await _authApi.GetCurrentUserAsync(ct);
        if (current is null)
        {
            ViewData["ErrorMessage"] = "Nao foi possivel carregar o perfil. Verifique a conexao com a API.";
            return View(BuildFallbackProfile());
        }

        return View(new ProfileViewModel
        {
            FullName = current.FullName,
            Email = current.Email,
            TenantId = current.TenantId
        });
    }

    [HttpPost("/Account/Profile")]
    public async Task<IActionResult> Profile([FromForm] ProfileViewModel model, CancellationToken ct)
    {
        var userId = GetCurrentUserId();
        if (userId is null)
            return RedirectToAction(nameof(Login));

        if (!ModelState.IsValid)
            return View(model);

        var updated = await _authApi.UpdateProfileAsync(model.FullName.Trim(), ct);
        if (updated is null)
        {
            ViewData["ErrorMessage"] = "Nao foi possivel atualizar o perfil. Verifique a conexao com a API.";
            return View(BuildFallbackProfile(model));
        }

        await RefreshUserClaimsAsync(updated.FullName, updated.Email);

        ViewData["Saved"] = true;
        return View(new ProfileViewModel
        {
            FullName = updated.FullName,
            Email = updated.Email,
            TenantId = updated.TenantId
        });
    }

    private Guid? GetCurrentUserId()
    {
        var idValue = User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (Guid.TryParse(idValue, out var id))
            return id;

        return null;
    }

    private async Task RefreshUserClaimsAsync(string fullName, string email)
    {
        var claims = User.Claims
            .Where(c => c.Type != ClaimTypes.Name && c.Type != ClaimTypes.Email)
            .ToList();

        claims.Add(new Claim(ClaimTypes.Name, fullName));
        claims.Add(new Claim(ClaimTypes.Email, email));

        var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
        await HttpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            new ClaimsPrincipal(identity),
            new AuthenticationProperties { IsPersistent = false });
    }

    private ProfileViewModel BuildFallbackProfile(ProfileViewModel? source = null)
    {
        return new ProfileViewModel
        {
            FullName = source?.FullName ?? (User?.Identity?.Name ?? string.Empty),
            Email = source?.Email ?? (User.FindFirst(ClaimTypes.Email)?.Value ?? string.Empty),
            TenantId = source?.TenantId ?? (User.FindFirst("tenant")?.Value ?? string.Empty)
        };
    }
}
