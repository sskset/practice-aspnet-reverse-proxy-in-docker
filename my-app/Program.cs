using System.Collections.Concurrent;

var builder = WebApplication.CreateBuilder(args);
builder.Services.AddRazorPages();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseHsts();
}

app.UseHttpsRedirection();

var tasks = new ConcurrentDictionary<int, TaskItem>();
tasks.TryAdd(1, new TaskItem(1, "Connect Angular to the ASP.NET API", false));
tasks.TryAdd(2, new TaskItem(2, "Build a task list", true));
var nextTaskId = 2;

var tasksApi = app.MapGroup("/api/tasks");
tasksApi.MapGet("/", () => Results.Ok(tasks.Values.OrderBy(task => task.Id)));
tasksApi.MapGet("/{id:int}", (int id) =>
{
    if (!tasks.TryGetValue(id, out var task))
    {
        return Results.NotFound();
    }

    return Results.Ok(task);
});
tasksApi.MapPost("/", (CreateTaskRequest request) =>
{
    var title = request.Title?.Trim();
    if (string.IsNullOrWhiteSpace(title))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["title"] = new[] { "A task title is required." }
        });
    }

    var task = new TaskItem(Interlocked.Increment(ref nextTaskId), title, false);
    tasks.TryAdd(task.Id, task);
    return Results.Created($"/api/tasks/{task.Id}", task);
});
tasksApi.MapPut("/{id:int}", (int id, UpdateTaskRequest request) =>
{
    if (!tasks.TryGetValue(id, out var current))
    {
        return Results.NotFound();
    }

    var title = request.Title?.Trim();
    if (string.IsNullOrWhiteSpace(title))
    {
        return Results.ValidationProblem(new Dictionary<string, string[]>
        {
            ["title"] = new[] { "A task title is required." }
        });
    }

    var updated = new TaskItem(id, title, request.IsComplete);
    return tasks.TryUpdate(id, updated, current) ? Results.Ok(updated) : Results.Conflict();
});
tasksApi.MapDelete("/{id:int}", (int id) =>
    tasks.TryRemove(id, out _) ? Results.NoContent() : Results.NotFound());

app.MapStaticAssets();
app.MapRazorPages().WithStaticAssets();

app.Run();

record TaskItem(int Id, string Title, bool IsComplete);
record CreateTaskRequest(string? Title);
record UpdateTaskRequest(string? Title, bool IsComplete);
