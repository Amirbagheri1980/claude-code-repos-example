using Api.Chats;
using Api.Tests.Fakes;

namespace Api.Tests;

public class ChatServiceTests
{
    private static ChatService CreateService() => new(InMemoryDynamoDb.Create(), "TestChats");

    [Fact]
    public async Task Join_FirstParticipant_CreatesNewChat()
    {
        var service = CreateService();

        var response = await service.JoinAsync("Ada", ParticipantRole.User);

        Assert.NotEmpty(response.ChatId);
        Assert.NotEmpty(response.ParticipantId);
    }

    [Fact]
    public async Task Join_SecondParticipant_JoinsSameActiveChat()
    {
        var service = CreateService();

        var first = await service.JoinAsync("Ada", ParticipantRole.User);
        var second = await service.JoinAsync("Grace", ParticipantRole.Facilitator);

        Assert.Equal(first.ChatId, second.ChatId);
    }

    [Fact]
    public async Task GetState_UnknownChat_ReturnsNull()
    {
        var service = CreateService();

        var state = await service.GetStateAsync("missing-chat", requestingParticipantId: null);

        Assert.Null(state);
    }

    [Fact]
    public async Task Selection_IsHiddenFromOthers_UntilRevealed()
    {
        var service = CreateService();
        var user = await service.JoinAsync("Ada", ParticipantRole.User);
        var facilitator = await service.JoinAsync("Grace", ParticipantRole.Facilitator);

        await service.SetSelectionAsync(user.ChatId, user.ParticipantId, "5");

        var stateForFacilitator = await service.GetStateAsync(user.ChatId, facilitator.ParticipantId);
        var seenByFacilitator = stateForFacilitator!.Participants.Single(p =>
            p.ParticipantId == user.ParticipantId
        );
        Assert.True(seenByFacilitator.HasSelected);
        Assert.Null(seenByFacilitator.Selection);

        var stateForSelf = await service.GetStateAsync(user.ChatId, user.ParticipantId);
        var seenBySelf = stateForSelf!.Participants.Single(p => p.ParticipantId == user.ParticipantId);
        Assert.Equal("5", seenBySelf.Selection);
    }

    [Fact]
    public async Task Reveal_MakesSelectionsVisibleToEveryone()
    {
        var service = CreateService();
        var user = await service.JoinAsync("Ada", ParticipantRole.User);
        var facilitator = await service.JoinAsync("Grace", ParticipantRole.Facilitator);
        await service.SetSelectionAsync(user.ChatId, user.ParticipantId, "8");

        var revealed = await service.RevealAsync(user.ChatId);

        Assert.True(revealed);
        var state = await service.GetStateAsync(user.ChatId, facilitator.ParticipantId);
        Assert.True(state!.Revealed);
        Assert.Equal("8", state.Participants.Single(p => p.ParticipantId == user.ParticipantId).Selection);
    }

    [Fact]
    public async Task Selection_ToggleToNull_ClearsIt()
    {
        var service = CreateService();
        var user = await service.JoinAsync("Ada", ParticipantRole.User);

        await service.SetSelectionAsync(user.ChatId, user.ParticipantId, "5");
        await service.SetSelectionAsync(user.ChatId, user.ParticipantId, null);

        var state = await service.GetStateAsync(user.ChatId, user.ParticipantId);
        var entry = state!.Participants.Single();
        Assert.False(entry.HasSelected);
        Assert.Null(entry.Selection);
    }

    [Fact]
    public async Task SetSelection_UnknownParticipant_ReturnsFalse()
    {
        var service = CreateService();
        var user = await service.JoinAsync("Ada", ParticipantRole.User);

        var ok = await service.SetSelectionAsync(user.ChatId, "no-such-participant", "5");

        Assert.False(ok);
    }

    [Fact]
    public async Task Restart_ClearsSelectionsAndReveal_ButKeepsParticipants()
    {
        var service = CreateService();
        var user = await service.JoinAsync("Ada", ParticipantRole.User);
        var facilitator = await service.JoinAsync("Grace", ParticipantRole.Facilitator);
        await service.SetSelectionAsync(user.ChatId, user.ParticipantId, "8");
        await service.RevealAsync(user.ChatId);

        var restarted = await service.RestartAsync(user.ChatId);

        Assert.True(restarted);
        var state = await service.GetStateAsync(user.ChatId, user.ParticipantId);
        Assert.NotNull(state);
        Assert.False(state!.Revealed);
        Assert.Equal(2, state.Participants.Count);
        Assert.All(state.Participants, p => Assert.False(p.HasSelected));
        Assert.All(state.Participants, p => Assert.Null(p.Selection));
    }

    [Fact]
    public async Task Restart_IncrementsRoundId()
    {
        var service = CreateService();
        var user = await service.JoinAsync("Ada", ParticipantRole.User);
        var before = await service.GetStateAsync(user.ChatId, user.ParticipantId);

        await service.RestartAsync(user.ChatId);

        var after = await service.GetStateAsync(user.ChatId, user.ParticipantId);
        Assert.Equal(before!.RoundId + 1, after!.RoundId);
    }

    [Fact]
    public async Task Restart_UnknownChat_ReturnsFalse()
    {
        var service = CreateService();

        var restarted = await service.RestartAsync("missing-chat");

        Assert.False(restarted);
    }

    [Fact]
    public async Task Close_DeletesAllChatData_AndNextJoinStartsAFreshChat()
    {
        var service = CreateService();
        var first = await service.JoinAsync("Ada", ParticipantRole.User);
        await service.SetSelectionAsync(first.ChatId, first.ParticipantId, "13");

        var closed = await service.CloseAsync(first.ChatId);

        Assert.True(closed);
        Assert.Null(await service.GetStateAsync(first.ChatId, null));

        var next = await service.JoinAsync("Grace", ParticipantRole.Facilitator);
        Assert.NotEqual(first.ChatId, next.ChatId);
    }

    [Fact]
    public async Task Close_UnknownChat_ReturnsFalse()
    {
        var service = CreateService();

        var closed = await service.CloseAsync("missing-chat");

        Assert.False(closed);
    }
}
