using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;

namespace Api.Chats;

public class ChatService : IChatService
{
    private const string ActivePointerChatId = "ACTIVE";
    private const string PointerSortKey = "POINTER";
    private const string MetaSortKey = "META";
    private const string ParticipantSortKeyPrefix = "PARTICIPANT#";

    private readonly IAmazonDynamoDB _dynamoDb;
    private readonly string _tableName;

    public ChatService(IAmazonDynamoDB dynamoDb, string tableName)
    {
        _dynamoDb = dynamoDb;
        _tableName = tableName;
    }

    public async Task<JoinResponse> JoinAsync(
        string name,
        ParticipantRole role,
        CancellationToken ct = default
    )
    {
        var chatId = await GetOrCreateActiveChatIdAsync(ct);

        var participantId = Guid.NewGuid().ToString("N");
        await _dynamoDb.PutItemAsync(
            new PutItemRequest
            {
                TableName = _tableName,
                Item = new Dictionary<string, AttributeValue>
                {
                    ["ChatId"] = new(chatId),
                    ["SortKey"] = new(ParticipantSortKeyPrefix + participantId),
                    ["ParticipantId"] = new(participantId),
                    ["Name"] = new(name),
                    ["Role"] = new(role.ToString()),
                    ["JoinedAt"] = new(DateTimeOffset.UtcNow.ToString("O")),
                },
            },
            ct
        );

        return new JoinResponse(chatId, participantId, role);
    }

    public async Task<ChatStateResponse?> GetStateAsync(
        string chatId,
        string? requestingParticipantId,
        CancellationToken ct = default
    )
    {
        var items = await QueryChatItemsAsync(chatId, ct);

        var meta = items.FirstOrDefault(item => item["SortKey"].S == MetaSortKey);
        if (meta is null)
        {
            return null;
        }

        var revealed = meta.TryGetValue("Revealed", out var revealedValue) && revealedValue.BOOL == true;
        var roundId = meta.TryGetValue("RoundId", out var roundIdValue) ? int.Parse(roundIdValue.N) : 0;

        var participants = items
            .Where(item => item["SortKey"].S.StartsWith(ParticipantSortKeyPrefix))
            .Select(item =>
            {
                var participantId = item["ParticipantId"].S;
                var hasSelection = item.TryGetValue("Selection", out var selectionValue);
                var isSelf = participantId == requestingParticipantId;
                var canSeeSelection = revealed || isSelf;

                return new ParticipantDto(
                    ParticipantId: participantId,
                    Name: item["Name"].S,
                    Role: Enum.Parse<ParticipantRole>(item["Role"].S),
                    HasSelected: hasSelection,
                    Selection: canSeeSelection && hasSelection ? selectionValue!.S : null
                );
            })
            .ToList();

        return new ChatStateResponse(revealed, roundId, participants);
    }

    public async Task<bool> SetSelectionAsync(
        string chatId,
        string participantId,
        string? value,
        CancellationToken ct = default
    )
    {
        var key = new Dictionary<string, AttributeValue>
        {
            ["ChatId"] = new(chatId),
            ["SortKey"] = new(ParticipantSortKeyPrefix + participantId),
        };

        var existing = await _dynamoDb.GetItemAsync(
            new GetItemRequest { TableName = _tableName, Key = key },
            ct
        );
        if (existing.Item is not { Count: > 0 })
        {
            return false;
        }

        if (value is null)
        {
            await _dynamoDb.UpdateItemAsync(
                new UpdateItemRequest
                {
                    TableName = _tableName,
                    Key = key,
                    UpdateExpression = "REMOVE Selection",
                },
                ct
            );
        }
        else
        {
            await _dynamoDb.UpdateItemAsync(
                new UpdateItemRequest
                {
                    TableName = _tableName,
                    Key = key,
                    UpdateExpression = "SET Selection = :value",
                    ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                    {
                        [":value"] = new(value),
                    },
                },
                ct
            );
        }

        return true;
    }

    public async Task<bool> RevealAsync(string chatId, CancellationToken ct = default)
    {
        var key = new Dictionary<string, AttributeValue>
        {
            ["ChatId"] = new(chatId),
            ["SortKey"] = new(MetaSortKey),
        };

        var existing = await _dynamoDb.GetItemAsync(
            new GetItemRequest { TableName = _tableName, Key = key },
            ct
        );
        if (existing.Item is not { Count: > 0 })
        {
            return false;
        }

        await _dynamoDb.UpdateItemAsync(
            new UpdateItemRequest
            {
                TableName = _tableName,
                Key = key,
                UpdateExpression = "SET Revealed = :revealed",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    [":revealed"] = new() { BOOL = true },
                },
            },
            ct
        );

        return true;
    }

    public async Task<bool> RestartAsync(string chatId, CancellationToken ct = default)
    {
        var items = await QueryChatItemsAsync(chatId, ct);

        var meta = items.FirstOrDefault(item => item["SortKey"].S == MetaSortKey);
        if (meta is null)
        {
            return false;
        }

        var currentRoundId = meta.TryGetValue("RoundId", out var roundIdValue) ? int.Parse(roundIdValue.N) : 0;

        var metaKey = new Dictionary<string, AttributeValue>
        {
            ["ChatId"] = new(chatId),
            ["SortKey"] = new(MetaSortKey),
        };

        await _dynamoDb.UpdateItemAsync(
            new UpdateItemRequest
            {
                TableName = _tableName,
                Key = metaKey,
                UpdateExpression = "SET Revealed = :revealed",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    [":revealed"] = new() { BOOL = false },
                },
            },
            ct
        );

        await _dynamoDb.UpdateItemAsync(
            new UpdateItemRequest
            {
                TableName = _tableName,
                Key = metaKey,
                UpdateExpression = "SET RoundId = :roundId",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    [":roundId"] = new() { N = (currentRoundId + 1).ToString() },
                },
            },
            ct
        );

        var participantsWithSelection = items.Where(item =>
            item["SortKey"].S.StartsWith(ParticipantSortKeyPrefix) && item.ContainsKey("Selection")
        );

        foreach (var participant in participantsWithSelection)
        {
            await _dynamoDb.UpdateItemAsync(
                new UpdateItemRequest
                {
                    TableName = _tableName,
                    Key = new Dictionary<string, AttributeValue>
                    {
                        ["ChatId"] = participant["ChatId"],
                        ["SortKey"] = participant["SortKey"],
                    },
                    UpdateExpression = "REMOVE Selection",
                },
                ct
            );
        }

        return true;
    }

    public async Task<bool> CloseAsync(string chatId, CancellationToken ct = default)
    {
        var items = await QueryChatItemsAsync(chatId, ct);
        if (items.Count == 0)
        {
            return false;
        }

        var deleteRequests = items
            .Select(item => new WriteRequest(
                new DeleteRequest
                {
                    Key = new Dictionary<string, AttributeValue>
                    {
                        ["ChatId"] = item["ChatId"],
                        ["SortKey"] = item["SortKey"],
                    },
                }
            ))
            .ToList();

        deleteRequests.Add(
            new WriteRequest(
                new DeleteRequest
                {
                    Key = new Dictionary<string, AttributeValue>
                    {
                        ["ChatId"] = new(ActivePointerChatId),
                        ["SortKey"] = new(PointerSortKey),
                    },
                }
            )
        );

        foreach (var batch in deleteRequests.Chunk(25))
        {
            await _dynamoDb.BatchWriteItemAsync(
                new BatchWriteItemRequest
                {
                    RequestItems = new Dictionary<string, List<WriteRequest>> { [_tableName] = batch.ToList() },
                },
                ct
            );
        }

        return true;
    }

    private async Task<string> GetOrCreateActiveChatIdAsync(CancellationToken ct)
    {
        var pointerKey = new Dictionary<string, AttributeValue>
        {
            ["ChatId"] = new(ActivePointerChatId),
            ["SortKey"] = new(PointerSortKey),
        };

        var pointer = await _dynamoDb.GetItemAsync(
            new GetItemRequest { TableName = _tableName, Key = pointerKey },
            ct
        );
        if (pointer.Item is { Count: > 0 })
        {
            return pointer.Item["CurrentChatId"].S;
        }

        var chatId = Guid.NewGuid().ToString("N");

        await _dynamoDb.PutItemAsync(
            new PutItemRequest
            {
                TableName = _tableName,
                Item = new Dictionary<string, AttributeValue>
                {
                    ["ChatId"] = new(ActivePointerChatId),
                    ["SortKey"] = new(PointerSortKey),
                    ["CurrentChatId"] = new(chatId),
                },
            },
            ct
        );

        await _dynamoDb.PutItemAsync(
            new PutItemRequest
            {
                TableName = _tableName,
                Item = new Dictionary<string, AttributeValue>
                {
                    ["ChatId"] = new(chatId),
                    ["SortKey"] = new(MetaSortKey),
                    ["Revealed"] = new() { BOOL = false },
                    ["RoundId"] = new() { N = "0" },
                    ["CreatedAt"] = new(DateTimeOffset.UtcNow.ToString("O")),
                },
            },
            ct
        );

        return chatId;
    }

    private async Task<List<Dictionary<string, AttributeValue>>> QueryChatItemsAsync(
        string chatId,
        CancellationToken ct
    )
    {
        var response = await _dynamoDb.QueryAsync(
            new QueryRequest
            {
                TableName = _tableName,
                KeyConditionExpression = "ChatId = :chatId",
                ExpressionAttributeValues = new Dictionary<string, AttributeValue>
                {
                    [":chatId"] = new(chatId),
                },
            },
            ct
        );

        return response.Items;
    }
}
