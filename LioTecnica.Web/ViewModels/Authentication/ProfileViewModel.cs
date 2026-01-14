using System.ComponentModel.DataAnnotations;

namespace LioTecnica.Web.ViewModels.Authentication;

public sealed class ProfileViewModel
{
    [Required(ErrorMessage = "Informe o nome.")]
    public string FullName { get; set; } = string.Empty;

    public string Email { get; set; } = string.Empty;

    public string TenantId { get; set; } = string.Empty;
}
