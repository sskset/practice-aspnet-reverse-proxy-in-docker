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

## Debug ASP.NET Core in Docker from VS Code

Install Microsoft's C# extension (`ms-dotnettools.csharp`) for VS Code and open
the repository root as your workspace. Select **Docker: Debug my-app** in the
Run and Debug panel and press F5. The pre-launch task builds a Debug image
with `vsdbg` and recreates the container. VS Code launches `/app/my-app.dll`
under the debugger, so startup breakpoints can be hit too. The post-debug task
stops the debug container.

To check it, set a breakpoint on `var builder = WebApplication.CreateBuilder(args);`
in `my-app/Program.cs` and press F5. Continue execution, then set a breakpoint
inside the `GET /api/tasks/{id}` handler (on `tasks.TryGetValue`) and open
`https://mysite.com/api/tasks/1`. Request-handler breakpoints only run when a
matching request is sent. Press F5 again after source edits to rebuild the
container; this workflow does not enable Hot Reload. This configuration debugs
C# server code; Angular TypeScript requires a browser debugger and source maps.

If a breakpoint stays hollow, inspect its hover message and the Debug Console.
Check that `my-app.dll` loaded symbols and that you selected the Docker debug
configuration. `/src/my-app` in the container's symbols maps to the workspace's
`my-app` directory through `sourceFileMap` in `.vscode/launch.json`.

The Debug build disables compiler optimization for this app, and the launch
configuration disables Just My Code. Framework assemblies may still be
optimized; those messages do not mean this app was built in Release.

`requireExactSource: false` in `.vscode/launch.json` works around a
[C# extension 2.160.4 regression](https://github.com/dotnet/vscode-csharp/issues/9802):
it sends unsupported SHA384/SHA512 source checksums to the remote debugger,
which rejects line breakpoints even though VS Code displays solid red dots.
This setting skips source checksum validation, so always rebuild with F5 after
editing code to keep the source and container binaries synchronized. Once your
C# extension includes the fix, you can remove this setting to restore source
checksum validation.

The debug container uses the same ports and certificate as the regular
container. If the regular Compose app is running, the debug task recreates that
service with the debug image. The normal `docker compose up` workflow continues
to use the Release image.

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
