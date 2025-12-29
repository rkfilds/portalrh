using LioTecnica.Web.ViewModels.Seed;

namespace LioTecnica.Web.Services;

public static class MockDataService
{
    private const string VagaMarketingId = "3839eb62-b69a-4db6-8ae4-6276a98416af";
    private const string VagaQualidadeId = "dd12c352-f00e-4c75-8cb5-f69e7cbeefab";
    private const string VagaBiId = "522e4436-bae2-475b-9dd4-d12836a6b416";

    private const string CandMarianaId = "27bed6b7-21af-4a01-8f48-bbd21ff7f1f8";
    private const string CandCarlosId = "707b5868-23db-497f-9d80-c21dbea61f8d";
    private const string CandAnaId = "a8631d35-98bc-4402-9ec2-8f3397bdc862";
    private const string CandBrunoId = "e6375c65-3b1b-42c8-85d7-a87e6f070223";
    private const string CandDanielaId = "ddddb8d5-7756-4e04-ab5a-f06375ad3773";

    private const string InboxMarianaId = "ea04cfa6-0179-4126-892f-262a47956f44";
    private const string InboxAnaId = "7e1f58ff-7e74-48c2-8a1c-2a8ba7fef998";
    private const string InboxCarlosId = "e0eb1617-c887-4e91-a023-c1ecadacc886";

    private const string RoleAdminId = "7691a81a-46d1-48d0-a8ba-c105017114cc";
    private const string RoleRecruiterId = "c3d6b72b-fd52-4ef1-97ac-de865c00ba1a";
    private const string RoleManagerId = "b2af23dd-fe6c-4ef5-9a04-2d1510ad85d8";

    private const string UserFernandaId = "4d560cd6-f2d0-4548-8c1e-bb723eb01c87";
    private const string UserMarcosId = "0c68b5a5-7970-4702-8c19-9dc8538635c4";
    private const string UserAnaId = "2c6cc7fb-6911-4a1e-a390-265bac2cf564";

    public static SeedBundle BuildSeedBundle()
    {
        var now = DateTimeOffset.UtcNow;

        var vagas = new List<VagaSeed>
        {
            new()
            {
                Id = VagaMarketingId,
                Codigo = "MKT-JR-001",
                Titulo = "Analista de Marketing Jr",
                Area = "Marketing",
                Modalidade = "Hibrido",
                Status = "aberta",
                Cidade = "Embu das Artes",
                Uf = "SP",
                Senioridade = "Junior",
                Threshold = 70,
                Descricao = "Apoiar campanhas, CRM e analises. Perfil analitico e mao na massa.",
                CreatedAt = Iso(now.AddDays(-4)),
                UpdatedAt = Iso(now.AddHours(-6)),
                Weights = new PesoSeed { Competencia = 40, Experiencia = 30, Formacao = 15, Localidade = 15 },
                Requisitos = new List<RequisitoSeed>
                {
                    new() { Id = "6e789fe0-1fea-499a-bbfc-9ca35b4fe35d", Categoria = "Ferramenta/Tecnologia", Termo = "Power BI", Peso = 9, Obrigatorio = true, Sinonimos = new []{ "pbi", "powerbi" }, Obs = "Dashboards e KPIs" },
                    new() { Id = "2d9f7b80-e9ca-42b0-a9a7-7ffdac48e91c", Categoria = "Competencia", Termo = "Google Analytics", Peso = 7, Obrigatorio = false, Sinonimos = new []{ "ga4", "analytics" }, Obs = "" },
                    new() { Id = "e8b38885-9004-42e0-8e44-12a506022691", Categoria = "Experiencia", Termo = "Campanhas de performance", Peso = 8, Obrigatorio = true, Sinonimos = new []{ "midia paga", "ads" }, Obs = "Meta/Google Ads" },
                    new() { Id = "670a9de7-c7f6-4c82-8f59-41a5e6f1919b", Categoria = "Competencia", Termo = "Excel", Peso = 6, Obrigatorio = false, Sinonimos = new []{ "planilhas" }, Obs = "" }
                }
            },
            new()
            {
                Id = VagaQualidadeId,
                Codigo = "QLD-PL-003",
                Titulo = "Supervisor de Qualidade",
                Area = "Qualidade",
                Modalidade = "Presencial",
                Status = "pausada",
                Cidade = "Embu das Artes",
                Uf = "SP",
                Senioridade = "Gestao",
                Threshold = 75,
                Descricao = "Gestao da qualidade, auditorias e controle de processos.",
                CreatedAt = Iso(now.AddDays(-12)),
                UpdatedAt = Iso(now.AddDays(-2)),
                Weights = new PesoSeed { Competencia = 35, Experiencia = 40, Formacao = 20, Localidade = 5 },
                Requisitos = new List<RequisitoSeed>
                {
                    new() { Id = "85a41917-fcb4-4f6b-b656-f5baceaa00e8", Categoria = "Certificacao", Termo = "BPF", Peso = 8, Obrigatorio = true, Sinonimos = new []{ "boas praticas de fabricacao" }, Obs = "" },
                    new() { Id = "fdfbfae3-8002-4b29-abe2-94a7e9f9c27f", Categoria = "Experiencia", Termo = "Auditoria interna", Peso = 8, Obrigatorio = true, Sinonimos = new []{ "auditorias" }, Obs = "" },
                    new() { Id = "73e48a43-c3ef-4452-a353-8210948f46ec", Categoria = "Formacao", Termo = "Engenharia de Alimentos", Peso = 7, Obrigatorio = false, Sinonimos = new []{ "alimentos" }, Obs = "" }
                }
            },
            new()
            {
                Id = VagaBiId,
                Codigo = "TI-PL-010",
                Titulo = "Analista de Dados (BI)",
                Area = "TI",
                Modalidade = "Remoto",
                Status = "aberta",
                Cidade = "",
                Uf = "",
                Senioridade = "Pleno",
                Threshold = 80,
                Descricao = "Modelagem e criacao de dashboards. Integracoes e rotinas de dados.",
                CreatedAt = Iso(now.AddDays(-2)),
                UpdatedAt = Iso(now.AddDays(-1)),
                Weights = new PesoSeed { Competencia = 45, Experiencia = 35, Formacao = 10, Localidade = 10 },
                Requisitos = new List<RequisitoSeed>
                {
                    new() { Id = "8127c7f8-1a18-48ba-941d-5618dbaa421d", Categoria = "Ferramenta/Tecnologia", Termo = "SQL", Peso = 10, Obrigatorio = true, Sinonimos = new []{ "postgres", "t-sql" }, Obs = "" },
                    new() { Id = "eb7e6573-3e6e-4d8b-b80a-37da574f84a2", Categoria = "Ferramenta/Tecnologia", Termo = "ETL", Peso = 7, Obrigatorio = false, Sinonimos = new []{ "pipelines" }, Obs = "" },
                    new() { Id = "de7ca2d9-e6d4-4a46-b03e-6a8e4ffac2c3", Categoria = "Competencia", Termo = "Modelagem dimensional", Peso = 8, Obrigatorio = true, Sinonimos = new []{ "star schema" }, Obs = "" }
                }
            }
        };

        var candidatos = new List<CandidatoSeed>
        {
            new()
            {
                Id = CandMarianaId,
                Nome = "Mariana Souza",
                Email = "mariana.souza@@email.com",
                Fone = "(11) 98888-7777",
                Cidade = "Embu das Artes",
                Uf = "SP",
                Fonte = "Email",
                Status = "triagem",
                VagaId = VagaMarketingId,
                Obs = "Boa comunicacao. Experiencia com marketing digital.",
                CvText = "Experiencia com campanhas de performance, excel avancado, dashboards e power bi.",
                CreatedAt = Iso(now.AddDays(-2)),
                UpdatedAt = Iso(now.AddHours(-4)),
                LastMatch = null
            },
            new()
            {
                Id = CandCarlosId,
                Nome = "Carlos Henrique",
                Email = "carlos.h@@email.com",
                Fone = "(11) 97777-1111",
                Cidade = "Sao Paulo",
                Uf = "SP",
                Fonte = "LinkedIn",
                Status = "pendente",
                VagaId = VagaMarketingId,
                Obs = "",
                CvText = "Atuacao como analista. Excel avancado. Nocoes de BI.",
                CreatedAt = Iso(now.AddDays(-1)),
                UpdatedAt = Iso(now.AddDays(-1)),
                LastMatch = null
            },
            new()
            {
                Id = CandAnaId,
                Nome = "Ana Paula Ribeiro",
                Email = "ana.ribeiro@@email.com",
                Fone = "(11) 96666-2222",
                Cidade = "Osasco",
                Uf = "SP",
                Fonte = "Indicacao",
                Status = "aprovado",
                VagaId = VagaMarketingId,
                Obs = "Perfil excelente. Forte em BI.",
                CvText = "PowerBI, SQL, modelagem dimensional e analytics.",
                CreatedAt = Iso(now.AddDays(-6)),
                UpdatedAt = Iso(now.AddDays(-2)),
                LastMatch = null
            },
            new()
            {
                Id = CandBrunoId,
                Nome = "Bruno Teixeira",
                Email = "bruno.t@@email.com",
                Fone = "(11) 95555-1212",
                Cidade = "Taboao da Serra",
                Uf = "SP",
                Fonte = "Email",
                Status = "reprovado",
                VagaId = VagaMarketingId,
                Obs = "Sem requisito obrigatorio.",
                CvText = "Experiencia generalista em apoio administrativo.",
                CreatedAt = Iso(now.AddDays(-5)),
                UpdatedAt = Iso(now.AddDays(-3)),
                LastMatch = null
            },
            new()
            {
                Id = CandDanielaId,
                Nome = "Daniela Alves",
                Email = "daniela.alves@@email.com",
                Fone = "(11) 94444-3030",
                Cidade = "Embu das Artes",
                Uf = "SP",
                Fonte = "Pasta",
                Status = "novo",
                VagaId = VagaBiId,
                Obs = "",
                CvText = "Power BI, SQL e reporting.",
                CreatedAt = Iso(now.AddDays(-3)),
                UpdatedAt = Iso(now.AddDays(-3)),
                LastMatch = null
            }
        };

        var inbox = new List<InboxSeed>
        {
            new()
            {
                Id = InboxMarianaId,
                Origem = "email",
                Status = "novo",
                RecebidoEm = Iso(now.AddMinutes(-30)),
                Remetente = "mariana.souza@@email.com",
                Assunto = "Curriculo - Analista de Dados",
                Destinatario = "rh@@liotecnica.com.br",
                VagaId = VagaBiId,
                Anexos = new List<InboxAnexoSeed>
                {
                    new() { Nome = "Mariana_Souza_CV.pdf", Tipo = "pdf", TamanhoKB = 284, Hash = "demo-1" }
                },
                Processamento = new InboxProcessamentoSeed { Pct = 0, Etapa = "Aguardando", Log = Array.Empty<string>(), Tentativas = 0, UltimoErro = null },
                PreviewText = "Experiencia com excel avancado, dashboards e power bi..."
            },
            new()
            {
                Id = InboxAnaId,
                Origem = "pasta",
                Status = "processando",
                RecebidoEm = Iso(now.AddMinutes(-12)),
                Remetente = "watcher@@server",
                Assunto = "Novo arquivo em pasta monitorada",
                Destinatario = "FS: \\\\RH\\Curriculos\\Entrada",
                VagaId = VagaBiId,
                Anexos = new List<InboxAnexoSeed>
                {
                    new() { Nome = "Ana_Ribeiro.docx", Tipo = "docx", TamanhoKB = 512, Hash = "demo-2" }
                },
                Processamento = new InboxProcessamentoSeed
                {
                    Pct = 55,
                    Etapa = "Extraindo texto",
                    Log = new[] { "Arquivo detectado", "Upload ok", "Extraindo texto..." },
                    Tentativas = 1,
                    UltimoErro = null
                },
                PreviewText = "PowerBI, SQL, modelagem dimensional e analytics..."
            },
            new()
            {
                Id = InboxCarlosId,
                Origem = "email",
                Status = "falha",
                RecebidoEm = Iso(now.AddMinutes(-90)),
                Remetente = "carlos.h@@email.com",
                Assunto = "CV atualizado (PDF protegido)",
                Destinatario = "rh@@liotecnica.com.br",
                VagaId = VagaBiId,
                Anexos = new List<InboxAnexoSeed>
                {
                    new() { Nome = "CarlosH_CV.pdf", Tipo = "pdf", TamanhoKB = 190, Hash = "demo-3" }
                },
                Processamento = new InboxProcessamentoSeed
                {
                    Pct = 100,
                    Etapa = "Falha",
                    Log = new[] { "Anexo encontrado", "Tentativa de leitura", "PDF com senha" },
                    Tentativas = 2,
                    UltimoErro = "PDF protegido por senha"
                },
                PreviewText = ""
            }
        };

        var roles = BuildRoles(now);
        var users = BuildUsers(now);

        var dashboardRows = new List<DashboardRowSeed>
        {
            new() { Vaga = "Analista de Marketing Jr", Cand = "Camila R.", Origem = "Email", Match = 92, Etapa = "Triagem" },
            new() { Vaga = "Engenheiro de Processos", Cand = "Rafael S.", Origem = "Pasta", Match = 88, Etapa = "Em analise" },
            new() { Vaga = "Supervisor de Qualidade", Cand = "Patricia M.", Origem = "Email", Match = 84, Etapa = "Entrevista" },
            new() { Vaga = "Assistente de RH", Cand = "Daniel A.", Origem = "Pasta", Match = 81, Etapa = "Triagem" },
            new() { Vaga = "Engenheiro de Processos", Cand = "Bruno T.", Origem = "Email", Match = 78, Etapa = "Recebido" }
        };

        var dashboardSeries = new[] { 8, 12, 10, 14, 18, 20, 16, 22, 25, 19, 21, 28, 24, 30 };

        var reports = new List<ReportSeed>
        {
            new() { Id = "r1", Icon = "bar-chart", Title = "Entrada por Origem", Desc = "Quantidade de itens recebidos por Email/Pasta/Upload no periodo.", Scope = "entrada" },
            new() { Id = "r2", Icon = "exclamation-triangle", Title = "Falhas de Processamento", Desc = "Principais causas de falha (PDF protegido, parser, arquivo vazio).", Scope = "entrada" },
            new() { Id = "r3", Icon = "people", Title = "Pipeline RH (Status do Candidato)", Desc = "Distribuicao por status: triagem, matching, aprovado, reprovado.", Scope = "candidatos" },
            new() { Id = "r4", Icon = "briefcase", Title = "Funil por Vaga", Desc = "Candidatos por vaga: recebidos -> triados -> match >= threshold.", Scope = "vagas" },
            new() { Id = "r5", Icon = "stars", Title = "Ranking de Matching", Desc = "Top candidatos por percentual de match (demo).", Scope = "matching" }
        };

        return new SeedBundle
        {
            Vagas = vagas,
            SelectedVagaId = VagaMarketingId,
            Candidatos = candidatos,
            SelectedCandidatoId = CandMarianaId,
            Inbox = inbox,
            SelectedInboxId = InboxMarianaId,
            Roles = roles,
            Users = users,
            DashboardRows = dashboardRows,
            DashboardSeries = dashboardSeries,
            Reports = reports
        };
    }

    private static IReadOnlyList<RoleSeed> BuildRoles(DateTimeOffset now)
    {
        var adminPerms = BuildPermissions(true);
        var recruiterPerms = BuildPermissions(false);

        SetPermissions(recruiterPerms, new[] { "vagas", "candidatos", "triagem", "matching", "entrada" }, view: true, create: true, edit: true, export: true);
        SetPermissions(recruiterPerms, new[] { "relatorios" }, view: true, export: true);
        SetPermissions(recruiterPerms, new[] { "dashboard" }, view: true);

        var managerPerms = BuildPermissions(false);
        SetPermissions(managerPerms, new[] { "dashboard", "relatorios", "vagas", "candidatos", "matching" }, view: true, export: true);
        SetPermissions(managerPerms, new[] { "triagem" }, view: true, edit: true);

        return new List<RoleSeed>
        {
            new()
            {
                Id = RoleAdminId,
                Name = "Admin RH",
                Desc = "Acesso total (admin).",
                Perms = adminPerms,
                BuiltIn = true,
                CreatedAt = Iso(now.AddDays(-30)),
                UpdatedAt = Iso(now.AddDays(-7))
            },
            new()
            {
                Id = RoleRecruiterId,
                Name = "Recrutador",
                Desc = "Opera vagas, triagem e matching.",
                Perms = recruiterPerms,
                BuiltIn = false,
                CreatedAt = Iso(now.AddDays(-20)),
                UpdatedAt = Iso(now.AddDays(-5))
            },
            new()
            {
                Id = RoleManagerId,
                Name = "Gestor",
                Desc = "Acompanha funil e aprovacoes.",
                Perms = managerPerms,
                BuiltIn = false,
                CreatedAt = Iso(now.AddDays(-18)),
                UpdatedAt = Iso(now.AddDays(-3))
            }
        };
    }

    private static IReadOnlyList<UserSeed> BuildUsers(DateTimeOffset now)
    {
        return new List<UserSeed>
        {
            new()
            {
                Id = UserFernandaId,
                Name = "Fernanda Lima",
                Email = "fernanda.lima@@liotecnica.com.br",
                Dept = "RH",
                Status = "active",
                RoleIds = new[] { RoleAdminId },
                MfaEnabled = true,
                CreatedAt = Iso(now.AddDays(-22)),
                UpdatedAt = Iso(now.AddDays(-2)),
                LastLoginAt = Iso(now.AddDays(-1))
            },
            new()
            {
                Id = UserMarcosId,
                Name = "Marcos Azevedo",
                Email = "marcos.azevedo@@liotecnica.com.br",
                Dept = "RH",
                Status = "active",
                RoleIds = new[] { RoleRecruiterId },
                MfaEnabled = false,
                CreatedAt = Iso(now.AddDays(-19)),
                UpdatedAt = Iso(now.AddDays(-4)),
                LastLoginAt = Iso(now.AddDays(-3))
            },
            new()
            {
                Id = UserAnaId,
                Name = "Ana Ribeiro",
                Email = "ana.ribeiro@@liotecnica.com.br",
                Dept = "Gestao",
                Status = "invited",
                RoleIds = new[] { RoleManagerId },
                MfaEnabled = false,
                CreatedAt = Iso(now.AddDays(-15)),
                UpdatedAt = Iso(now.AddDays(-6)),
                LastLoginAt = null
            }
        };
    }

    private static Dictionary<string, PermissionSeed> BuildPermissions(bool adminAll)
    {
        var modules = new[] { "dashboard", "vagas", "candidatos", "triagem", "matching", "entrada", "relatorios", "config", "usuarios" };
        var perms = new Dictionary<string, PermissionSeed>();

        foreach (var key in modules)
        {
            perms[key] = adminAll
                ? new PermissionSeed { View = true, Create = true, Edit = true, Delete = true, Export = true, Admin = true }
                : new PermissionSeed();
        }

        return perms;
    }

    private static void SetPermissions(Dictionary<string, PermissionSeed> perms, IEnumerable<string> modules, bool view = false, bool create = false, bool edit = false, bool delete = false, bool export = false, bool admin = false)
    {
        foreach (var module in modules)
        {
            perms[module] = new PermissionSeed
            {
                View = view,
                Create = create,
                Edit = edit,
                Delete = delete,
                Export = export,
                Admin = admin
            };
        }
    }

    private static string Iso(DateTimeOffset value) => value.ToString("o");
}
