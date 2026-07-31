using Amazon.DynamoDBv2;
using Amazon.DynamoDBv2.Model;
using NSubstitute;

namespace Api.Tests.Fakes;

/// <summary>
/// Minimal in-memory stand-in for IAmazonDynamoDB covering only the operations
/// ChatService uses, so tests exercise real business logic without touching AWS.
/// </summary>
public static class InMemoryDynamoDb
{
    public static IAmazonDynamoDB Create()
    {
        var table = new Dictionary<(string ChatId, string SortKey), Dictionary<string, AttributeValue>>();
        var client = Substitute.For<IAmazonDynamoDB>();

        client
            .GetItemAsync(Arg.Any<GetItemRequest>(), Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                var request = callInfo.Arg<GetItemRequest>()!;
                var key = KeyOf(request.Key);
                return Task.FromResult(
                    table.TryGetValue(key, out var item)
                        ? new GetItemResponse { Item = new Dictionary<string, AttributeValue>(item) }
                        : new GetItemResponse { Item = null }
                );
            });

        client
            .PutItemAsync(Arg.Any<PutItemRequest>(), Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                var request = callInfo.Arg<PutItemRequest>()!;
                var key = KeyOf(request.Item);
                if (request.ConditionExpression == "attribute_not_exists(ChatId)" && table.ContainsKey(key))
                {
                    throw new ConditionalCheckFailedException("Conditional check failed.");
                }
                table[key] = new Dictionary<string, AttributeValue>(request.Item);
                return Task.FromResult(new PutItemResponse());
            });

        client
            .UpdateItemAsync(Arg.Any<UpdateItemRequest>(), Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                var request = callInfo.Arg<UpdateItemRequest>()!;
                var key = KeyOf(request.Key);
                var item = table.TryGetValue(key, out var existing)
                    ? new Dictionary<string, AttributeValue>(existing)
                    : new Dictionary<string, AttributeValue>(request.Key);

                ApplyUpdateExpression(item, request);

                table[key] = item;
                return Task.FromResult(new UpdateItemResponse());
            });

        client
            .QueryAsync(Arg.Any<QueryRequest>(), Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                var request = callInfo.Arg<QueryRequest>()!;
                var chatId = request.ExpressionAttributeValues[":chatId"].S;
                var items = table
                    .Where(entry => entry.Key.ChatId == chatId)
                    .Select(entry => new Dictionary<string, AttributeValue>(entry.Value))
                    .ToList();
                return Task.FromResult(new QueryResponse { Items = items });
            });

        client
            .BatchWriteItemAsync(Arg.Any<BatchWriteItemRequest>(), Arg.Any<CancellationToken>())
            .Returns(callInfo =>
            {
                var request = callInfo.Arg<BatchWriteItemRequest>()!;
                foreach (var writeRequest in request.RequestItems.Values.SelectMany(list => list))
                {
                    if (writeRequest.DeleteRequest is { } deleteRequest)
                    {
                        table.Remove(KeyOf(deleteRequest.Key));
                    }
                }
                return Task.FromResult(new BatchWriteItemResponse());
            });

        return client;
    }

    private static void ApplyUpdateExpression(
        Dictionary<string, AttributeValue> item,
        UpdateItemRequest request
    )
    {
        var expression = request.UpdateExpression;
        if (expression.StartsWith("REMOVE "))
        {
            item.Remove(expression["REMOVE ".Length..].Trim());
            return;
        }

        var assignment = expression["SET ".Length..].Trim();
        var parts = assignment.Split('=', 2);
        var attribute = parts[0].Trim();
        var placeholder = parts[1].Trim();
        item[attribute] = request.ExpressionAttributeValues[placeholder];
    }

    private static (string, string) KeyOf(Dictionary<string, AttributeValue> item) =>
        (item["ChatId"].S, item["SortKey"].S);
}
