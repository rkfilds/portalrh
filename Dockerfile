# ====== build ======
FROM mcr.microsoft.com/dotnet/sdk:8.0 AS build
WORKDIR /src

# Restaura pelo .sln para cache decente
COPY LioTecnica.sln ./
COPY LioTecnica.Web/*.csproj LioTecnica.Web/
RUN dotnet restore ./LioTecnica.sln

# Copia tudo e publica
COPY . .
RUN dotnet publish LioTecnica.Web/LioTecnica.Web.csproj -c Release -o /out /p:UseAppHost=false

# ====== runtime ======
FROM mcr.microsoft.com/dotnet/aspnet:8.0 AS final
WORKDIR /app

# Copia artefatos
COPY --from=build /out .

# Ambiente de produção (o PORT vem do Render)
ENV ASPNETCORE_ENVIRONMENT=Production

# Sobe o app; a porta efetiva é definida pelo Program.cs (PORT ou 8080 local)
CMD ["dotnet","LioTecnica.Web.dll"]
