using LioTecnica.Web.Helpers;
using LioTecnica.Web.Services;
using LioTecnica.Web.ViewModels;
using Microsoft.AspNetCore.Mvc;

namespace LioTecnica.Web.Controllers;

public class AreasController : Controller
{
    public IActionResult Index()
    {
        var seed = MockDataService.BuildSeedBundle();
        var model = new PageSeedViewModel
        {
            SeedJson = SeedJsonHelper.ToJson(seed)
        };
        return View(model);
    }
}
