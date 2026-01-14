using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.Tokens;
using RhPortal.Api.Contracts.Authentication;
using RhPortal.Api.Domain.Entities;
using RhPortal.Api.Infrastructure.Data;
using RhPortal.Api.Infrastructure.Security;
using RhPortal.Api.Infrastructure.Tenancy;

namespace RhPortal.Api.Application.Authentication;

public sealed class AuthenticationService
{
    private readonly UserManager<ApplicationUser> _userManager;
    private readonly AppDbContext _db;
    private readonly ITenantContext _tenantContext;
    private readonly JwtOptions _jwtOptions;

    public AuthenticationService(
        UserManager<ApplicationUser> userManager,
        AppDbContext db,
        ITenantContext tenantContext,
        IOptions<JwtOptions> jwtOptions)
    {
        _userManager = userManager;
        _db = db;
        _tenantContext = tenantContext;
        _jwtOptions = jwtOptions.Value;
    }

    public async Task<LoginResponse?> LoginAsync(LoginRequest request, CancellationToken ct)
    {
        var email = request.Email.Trim();
        if (string.IsNullOrWhiteSpace(email)) return null;

        var user = await _userManager.Users.FirstOrDefaultAsync(x => x.Email == email, ct);
        if (user is null || !user.IsActive) return null;

        var validPassword = await _userManager.CheckPasswordAsync(user, request.Password);
        if (!validPassword) return null;

        var roleNames = await _userManager.GetRolesAsync(user);
        var roleIds = await _db.UserRoles
            .Where(x => x.UserId == user.Id)
            .Select(x => x.RoleId)
            .ToListAsync(ct);

        var permissions = await _db.RoleMenus
            .Where(x => roleIds.Contains(x.RoleId))
            .Select(x => x.PermissionKey)
            .Distinct()
            .ToListAsync(ct);

        var token = CreateJwtToken(user, roleNames, permissions);

        return new LoginResponse(
            AccessToken: token,
            AccessTokenExpirationMinutes: _jwtOptions.AccessTokenExpirationMinutes,
            UserId: user.Id,
            Email: user.Email ?? string.Empty,
            FullName: user.FullName,
            TenantId: _tenantContext.TenantId,
            Roles: roleNames.ToList(),
            Permissions: permissions
        );
    }

    public async Task<CurrentUserResponse?> GetCurrentUserAsync(Guid userId, CancellationToken ct)
    {
        var user = await _userManager.Users.FirstOrDefaultAsync(x => x.Id == userId, ct);
        if (user is null) return null;

        var roleNames = await _userManager.GetRolesAsync(user);
        var roleIds = await _db.UserRoles
            .Where(x => x.UserId == user.Id)
            .Select(x => x.RoleId)
            .ToListAsync(ct);

        var permissions = await _db.RoleMenus
            .Where(x => roleIds.Contains(x.RoleId))
            .Select(x => x.PermissionKey)
            .Distinct()
            .ToListAsync(ct);

        return new CurrentUserResponse(
            UserId: user.Id,
            Email: user.Email ?? string.Empty,
            FullName: user.FullName,
            TenantId: _tenantContext.TenantId,
            Roles: roleNames.ToList(),
            Permissions: permissions
        );
    }

    public async Task<CurrentUserResponse?> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct)
    {
        var user = await _userManager.Users.FirstOrDefaultAsync(x => x.Id == userId, ct);
        if (user is null) return null;

        var fullName = request.FullName.Trim();
        if (string.IsNullOrWhiteSpace(fullName))
            throw new InvalidOperationException("Full name is required.");

        user.FullName = fullName;
        var result = await _userManager.UpdateAsync(user);
        if (!result.Succeeded)
            throw new InvalidOperationException(string.Join("; ", result.Errors.Select(x => x.Description)));

        return await GetCurrentUserAsync(userId, ct);
    }

    private string CreateJwtToken(ApplicationUser user, IEnumerable<string> roleNames, IEnumerable<string> permissions)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, user.Id.ToString()),
            new(ClaimTypes.Email, user.Email ?? string.Empty),
            new(ClaimTypes.Name, user.FullName),
            new("tenant", _tenantContext.TenantId)
        };

        foreach (var role in roleNames)
            claims.Add(new Claim(ClaimTypes.Role, role));

        foreach (var permission in permissions.Distinct())
            claims.Add(new Claim(PermissionConstants.ClaimType, permission));

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(_jwtOptions.SigningKey));
        var credentials = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var expires = DateTime.UtcNow.AddMinutes(_jwtOptions.AccessTokenExpirationMinutes);

        var token = new JwtSecurityToken(
            issuer: _jwtOptions.Issuer,
            audience: _jwtOptions.Audience,
            claims: claims,
            expires: expires,
            signingCredentials: credentials
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
