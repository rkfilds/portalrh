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
        var userId = GetCurrentUserId();
        if (userId is null)
            return RedirectToAction(nameof(Login));

        var user = await _usersApi.GetByIdAsync(userId.Value, ct);
        if (user is null)
            return NotFound();

        return View(new ProfileViewModel
        {
            FullName = user.FullName,
            Email = user.Email,
            TenantId = User.FindFirst("tenant")?.Value ?? string.Empty
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

        var current = await _usersApi.GetByIdAsync(userId.Value, ct);
        if (current is null)
            return NotFound();

        var updateRequest = new UsersApiClient.UserUpdateRequest(
            current.Email,
            model.FullName.Trim(),
            current.IsActive);

        var updated = await _usersApi.UpdateAsync(userId.Value, updateRequest, ct);
        if (updated is null)
        {
            ModelState.AddModelError(string.Empty, "Nao foi possivel atualizar o perfil.");
            return View(model);
        }

        await RefreshUserClaimsAsync(updated.FullName, updated.Email);

        ViewData["Saved"] = true;
        return View(new ProfileViewModel
        {
            FullName = updated.FullName,
            Email = updated.Email,
            TenantId = User.FindFirst("tenant")?.Value ?? string.Empty
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
}
