FROM node:22-alpine AS angular-build
WORKDIR /src/my-ng-app
COPY my-ng-app/package*.json ./
RUN npm ci
COPY my-ng-app/ ./
RUN npm run build -- --configuration production

FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS base
WORKDIR /app
EXPOSE 8080 443
USER $APP_UID

FROM mcr.microsoft.com/dotnet/sdk:10.0 AS build
WORKDIR /src
COPY my-app/my-app.csproj my-app/
RUN dotnet restore "my-app/my-app.csproj"
COPY my-app/ my-app/
COPY --from=angular-build /src/my-ng-app/dist/my-ng-app/browser/ my-app/wwwroot/
WORKDIR /src/my-app
RUN dotnet publish "my-app.csproj" --configuration Release --output /app/publish --no-restore

FROM base AS final
WORKDIR /app
COPY --from=build /app/publish .
ENTRYPOINT ["dotnet", "my-app.dll"]
