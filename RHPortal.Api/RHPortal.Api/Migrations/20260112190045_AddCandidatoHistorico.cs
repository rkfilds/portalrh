using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RHPortal.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddCandidatoHistorico : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "CandidatoHistoricos",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    TenantId = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    CandidatoId = table.Column<Guid>(type: "TEXT", nullable: false),
                    VagaId = table.Column<Guid>(type: "TEXT", nullable: false),
                    AppliedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    LastContactAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    Interviewed = table.Column<bool>(type: "INTEGER", nullable: false),
                    InterviewAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: true),
                    Notes = table.Column<string>(type: "TEXT", maxLength: 800, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false),
                    UpdatedAtUtc = table.Column<DateTimeOffset>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_CandidatoHistoricos", x => x.Id);
                    table.ForeignKey(
                        name: "FK_CandidatoHistoricos_Candidatos_CandidatoId",
                        column: x => x.CandidatoId,
                        principalTable: "Candidatos",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_CandidatoHistoricos_Vagas_VagaId",
                        column: x => x.VagaId,
                        principalTable: "Vagas",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_CandidatoHistoricos_CandidatoId",
                table: "CandidatoHistoricos",
                column: "CandidatoId");

            migrationBuilder.CreateIndex(
                name: "IX_CandidatoHistoricos_TenantId_CandidatoId",
                table: "CandidatoHistoricos",
                columns: new[] { "TenantId", "CandidatoId" });

            migrationBuilder.CreateIndex(
                name: "IX_CandidatoHistoricos_TenantId_VagaId",
                table: "CandidatoHistoricos",
                columns: new[] { "TenantId", "VagaId" });

            migrationBuilder.CreateIndex(
                name: "IX_CandidatoHistoricos_VagaId",
                table: "CandidatoHistoricos",
                column: "VagaId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "CandidatoHistoricos");
        }
    }
}
