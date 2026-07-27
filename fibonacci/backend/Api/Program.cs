using Amazon;
using Amazon.DynamoDBv2;
using Api.Chats;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddSingleton<IAmazonDynamoDB>(sp =>
{
    var region = builder.Configuration["Aws:Region"] ?? "ap-southeast-2";
    return new AmazonDynamoDBClient(RegionEndpoint.GetBySystemName(region));
});
builder.Services.AddSingleton<IChatService>(sp => new ChatService(
    sp.GetRequiredService<IAmazonDynamoDB>(),
    builder.Configuration["Aws:TableName"] ?? "FibonacciChats"
));

var corsOrigin = builder.Configuration["Cors:AllowedOrigin"] ?? "http://localhost:5173";
builder.Services.AddCors(options =>
    options.AddDefaultPolicy(policy => policy.WithOrigins(corsOrigin).AllowAnyHeader().AllowAnyMethod())
);

var app = builder.Build();

app.UseCors();

app.MapGet("/health", () => Results.Ok());

var chats = app.MapGroup("/api/chats");

chats.MapPost(
    "/join",
    async (JoinRequest request, IChatService chatService, CancellationToken ct) =>
    {
        var name = request.Name.Trim();
        if (name.Length == 0)
        {
            return Results.BadRequest("Name is required.");
        }

        var result = await chatService.JoinAsync(name, request.Role, ct);
        return Results.Ok(result);
    }
);

chats.MapGet(
    "/{chatId}",
    async (
        string chatId,
        string? participantId,
        IChatService chatService,
        CancellationToken ct
    ) =>
    {
        var state = await chatService.GetStateAsync(chatId, participantId, ct);
        return state is null ? Results.NotFound() : Results.Ok(state);
    }
);

chats.MapPut(
    "/{chatId}/participants/{participantId}/selection",
    async (
        string chatId,
        string participantId,
        SelectionRequest request,
        IChatService chatService,
        CancellationToken ct
    ) =>
    {
        var ok = await chatService.SetSelectionAsync(chatId, participantId, request.Value, ct);
        return ok ? Results.NoContent() : Results.NotFound();
    }
);

chats.MapPost(
    "/{chatId}/reveal",
    async (string chatId, IChatService chatService, CancellationToken ct) =>
    {
        var ok = await chatService.RevealAsync(chatId, ct);
        return ok ? Results.NoContent() : Results.NotFound();
    }
);

chats.MapPost(
    "/{chatId}/restart",
    async (string chatId, IChatService chatService, CancellationToken ct) =>
    {
        var ok = await chatService.RestartAsync(chatId, ct);
        return ok ? Results.NoContent() : Results.NotFound();
    }
);

chats.MapPost(
    "/{chatId}/close",
    async (string chatId, IChatService chatService, CancellationToken ct) =>
    {
        var ok = await chatService.CloseAsync(chatId, ct);
        return ok ? Results.NoContent() : Results.NotFound();
    }
);

app.Run();
