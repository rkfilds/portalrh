# ====== build ======
FROM mcr.microsoft.com/dotnet/sdk:9.0 AS build
WORKDIR /src

# Restore for cache efficiency
COPY LioTecnica.sln ./
COPY RHPortal.Api/RHPortal.Api/*.csproj RHPortal.Api/RHPortal.Api/
RUN dotnet restore RHPortal.Api/RHPortal.Api/RHPortal.Api.csproj

# Copy source and publish
COPY . .
RUN dotnet publish RHPortal.Api/RHPortal.Api/RHPortal.Api.csproj -c Release -o /out /p:UseAppHost=false

# ====== runtime ======
FROM mcr.microsoft.com/dotnet/aspnet:9.0 AS final
WORKDIR /app

COPY --from=build /out .

ENV ASPNETCORE_ENVIRONMENT=Production

CMD ["dotnet","RHPortal.Api.dll"]
