# ASP.NET Core and Angular demo

This repository contains an ASP.NET Core app and an Angular app. ASP.NET Core
serves the site header and footer, the Angular app renders the main content, and
the Angular task board calls REST endpoints hosted by ASP.NET Core.

## Prerequisites

- Docker Desktop
- Windows PowerShell for the local hostname and certificate setup
- Node.js and npm if you want to run Angular separately
- The .NET 10 SDK if you want to build ASP.NET Core outside Docker

## Run the complete site

1. Make `mysite.com` resolve to your own computer. Open
   `C:\Windows\System32\drivers\etc\hosts` as an administrator and add this
   line if it is not already present:

   ```text
   127.0.0.1 mysite.com
   ```

2. From the repository root, create and trust a local HTTPS certificate:

   ```powershell
   .\setup-dev-certificate.ps1
   ```

   The certificate is valid for `mysite.com`. The script saves the private
   certificate and its password under `.certs\`, which is excluded from Git.
   This is a local development certificate, not a production certificate.

3. Build and start the application:

   ```powershell
   docker compose up --build -d
   ```

4. Open [https://mysite.com](https://mysite.com). HTTP requests to
   `http://mysite.com` redirect to HTTPS. ASP.NET Core renders the navigation
   and footer; Angular renders the task board between them.

5. To view application logs or stop the application:

   ```powershell
   docker compose logs -f my-app
   docker compose down
   ```

Docker builds Angular in a Node stage, copies its production files into the
ASP.NET Core app, and publishes them with the .NET app. In the combined site,
the browser calls the API on the same origin, so no CORS configuration is
needed.

## REST API

The sample task API is available at `https://mysite.com/api/tasks`.

| Method | Route | Description |
| --- | --- | --- |
| `GET` | `/api/tasks` | List tasks |
| `GET` | `/api/tasks/{id}` | Get one task |
| `POST` | `/api/tasks` | Create a task with a `title` |
| `PUT` | `/api/tasks/{id}` | Replace a task's `title` and `isComplete` |
| `DELETE` | `/api/tasks/{id}` | Delete a task |

For example, in PowerShell:

```powershell
$api = 'https://mysite.com/api/tasks'

# List tasks
Invoke-RestMethod -Uri $api

# Create a task
$task = Invoke-RestMethod -Uri $api -Method Post `
  -ContentType 'application/json' -Body '{"title":"Try the API"}'

# Mark it complete
$body = @{ title = $task.title; isComplete = $true } | ConvertTo-Json
Invoke-RestMethod -Uri "$api/$($task.id)" -Method Put `
  -ContentType 'application/json' -Body $body

# Delete it
Invoke-RestMethod -Uri "$api/$($task.id)" -Method Delete
```

Tasks are stored in memory for this demo. They reset when the ASP.NET Core app
restarts; no database is configured.

## Run Angular independently

Start the ASP.NET Core container first so the API is available. Then open a
second PowerShell terminal from the repository root:

```powershell
Set-Location my-ng-app
npm ci
npm start
```

Open [http://localhost:4200](http://localhost:4200) to view Angular without
the ASP.NET header and footer. The Angular development server proxies `/api`
requests to `https://mysite.com` using `proxy.conf.json`. The proxy's relaxed
certificate check is only for local development.

## Build and test

Build the ASP.NET Core project locally:

```powershell
dotnet build my-app\my-app.csproj
```

Build and test Angular:

```powershell
Set-Location my-ng-app
npm ci
npm run build
npm test -- --watch=false
```

## Project layout

- `my-app\` — ASP.NET Core Razor layout, REST API, and Dockerfile
- `my-ng-app\` — Angular task board, API service, and development proxy
- `docker-compose.yml` — local HTTP/HTTPS ports and app service
- `setup-dev-certificate.ps1` — creates and trusts the local `mysite.com` certificate
