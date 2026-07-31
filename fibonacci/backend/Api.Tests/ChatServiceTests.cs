using Api.Chats;
using Api.Tests.Fakes;

namespace Api.Tests;

public class ChatServiceTests
{
    private static ChatService CreateService(Func<string>? roomCodeGenerator = null) =>
        new(InMemoryDynamoDb.Create(), "TestChats", roomCodeGenerator);

    [Fact]
    public async Task CreateRoom_CreatesNewChatWithFirstParticipant()
    {
        var service = CreateService();

        var response = await service.CreateRoomAsync("Ada", ParticipantRole.User);

        Assert.NotEmpty(response.ChatId);
        Assert.NotEmpty(response.ParticipantId);
    }

    [Fact]
    public async Task CreateRoom_GeneratesShortUnambiguousAlphanumericCode()
    {
        var service = CreateService();

        var response = await service.CreateRoomAsync("Ada", ParticipantRole.User);

        Assert.Matches("^[A-HJ-KM-NP-Z2-9]{6}$", response.ChatId);
    }

    [Fact]
    public async Task CreateRoom_RetriesWhenGeneratedCodeCollides()
    {
        var db = InMemoryDynamoDb.Create();
        var occupant = new ChatService(db, "TestChats", () => "AAAAAA");
        await occupant.CreateRoomAsync("Existing", ParticipantRole.Facilitator);

        var codes = new Queue<string>(new[] { "AAAAAA", "BBBBBB" });
        var service = new ChatService(db, "TestChats", () => codes.Dequeue());

        var result = await service.CreateRoomAsync("Ada", ParticipantRole.User);

        Assert.Equal("BBBBBB", result.ChatId);
    }

    [Fact]
    public async Task CreateRoom_ExhaustsAttempts_ThrowsInvalidOperationException()
    {
        var db = InMemoryDynamoDb.Create();
        var occupant = new ChatService(db, "TestChats", () => "AAAAAA");
        await occupant.CreateRoomAsync("Existing", ParticipantRole.Facilitator);

        var service = new ChatService(db, "TestChats", () => "AAAAAA");

        await Assert.ThrowsAsync<InvalidOperationException>(
            () => service.CreateRoomAsync("Ada", ParticipantRole.User)
        );
    }

    [Fact]
    public async Task JoinRoom_AddsParticipantToExistingRoom()
    {
        var service = CreateService();
        var first = await service.CreateRoomAsync("Ada", ParticipantRole.User);

        var second = await service.JoinRoomAsync(first.ChatId, "Grace");

        Assert.NotNull(second);
        Assert.Equal(first.ChatId, second!.ChatId);
    }

    [Fact]
    public async Task JoinRoom_AlwaysAssignsUserRole()
    {
        // Guards the "no more than one facilitator per room" invariant: the room's
        // facilitator (if any) is only ever whoever called CreateRoomAsync.
        var service = CreateService();
        var creator = await service.CreateRoomAsync("Ada", ParticipantRole.Facilitator);

        var joiner = await service.JoinRoomAsync(creator.ChatId, "Grace");

        Assert.Equal(ParticipantRole.User, joiner!.Role);
    }

    [Fact]
    public async Task JoinRoom_UnknownChatId_ReturnsNull()
    {
        var service = CreateService();

        var result = await service.JoinRoomAsync("missing-chat", "Ada");

        Assert.Null(result);
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
        var user = await service.CreateRoomAsync("Ada", ParticipantRole.User);
        var secondParticipant = await service.JoinRoomAsync(user.ChatId, "Grace");

        await service.SetSelectionAsync(user.ChatId, user.ParticipantId, "5");

        var stateForOther = await service.GetStateAsync(user.ChatId, secondParticipant!.ParticipantId);
        var seenByOther = stateForOther!.Participants.Single(p => p.ParticipantId == user.ParticipantId);
        Assert.True(seenByOther.HasSelected);
        Assert.Null(seenByOther.Selection);

        var stateForSelf = await service.GetStateAsync(user.ChatId, user.ParticipantId);
        var seenBySelf = stateForSelf!.Participants.Single(p => p.ParticipantId == user.ParticipantId);
        Assert.Equal("5", seenBySelf.Selection);
    }

    [Fact]
    public async Task Reveal_MakesSelectionsVisibleToEveryone()
    {
        var service = CreateService();
        var user = await service.CreateRoomAsync("Ada", ParticipantRole.User);
        var secondParticipant = await service.JoinRoomAsync(user.ChatId, "Grace");
        await service.SetSelectionAsync(user.ChatId, user.ParticipantId, "8");

        var revealed = await service.RevealAsync(user.ChatId);

        Assert.True(revealed);
        var state = await service.GetStateAsync(user.ChatId, secondParticipant!.ParticipantId);
        Assert.True(state!.Revealed);
        Assert.Equal("8", state.Participants.Single(p => p.ParticipantId == user.ParticipantId).Selection);
    }

    [Fact]
    public async Task Selection_ToggleToNull_ClearsIt()
    {
        var service = CreateService();
        var user = await service.CreateRoomAsync("Ada", ParticipantRole.User);

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
        var user = await service.CreateRoomAsync("Ada", ParticipantRole.User);

        var ok = await service.SetSelectionAsync(user.ChatId, "no-such-participant", "5");

        Assert.False(ok);
    }

    [Fact]
    public async Task Restart_ClearsSelectionsAndReveal_ButKeepsParticipants()
    {
        var service = CreateService();
        var user = await service.CreateRoomAsync("Ada", ParticipantRole.User);
        var secondParticipant = await service.JoinRoomAsync(user.ChatId, "Grace");
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
        Assert.NotNull(secondParticipant);
    }

    [Fact]
    public async Task Restart_IncrementsRoundId()
    {
        var service = CreateService();
        var user = await service.CreateRoomAsync("Ada", ParticipantRole.User);
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
    public async Task Close_DeletesAllChatData_AndFreesRoomCodeForReuse()
    {
        var db = InMemoryDynamoDb.Create();
        var service = new ChatService(db, "TestChats", () => "AAAAAA");
        var first = await service.CreateRoomAsync("Ada", ParticipantRole.User);
        await service.SetSelectionAsync(first.ChatId, first.ParticipantId, "13");

        var closed = await service.CloseAsync(first.ChatId);

        Assert.True(closed);
        Assert.Null(await service.GetStateAsync(first.ChatId, null));

        var next = await service.CreateRoomAsync("Grace", ParticipantRole.Facilitator);
        Assert.Equal("AAAAAA", next.ChatId);
    }

    [Fact]
    public async Task Close_UnknownChat_ReturnsFalse()
    {
        var service = CreateService();

        var closed = await service.CloseAsync("missing-chat");

        Assert.False(closed);
    }

    [Fact]
    public async Task RemoveParticipant_RemovesThemFromRoomState()
    {
        var service = CreateService();
        var facilitator = await service.CreateRoomAsync("Grace", ParticipantRole.Facilitator);
        var user = await service.JoinRoomAsync(facilitator.ChatId, "Ada");

        var removed = await service.RemoveParticipantAsync(facilitator.ChatId, user!.ParticipantId);

        Assert.True(removed);
        var state = await service.GetStateAsync(facilitator.ChatId, facilitator.ParticipantId);
        Assert.DoesNotContain(state!.Participants, p => p.ParticipantId == user.ParticipantId);
        Assert.Single(state.Participants);
    }

    [Fact]
    public async Task RemoveParticipant_UnknownParticipant_ReturnsFalse()
    {
        var service = CreateService();
        var facilitator = await service.CreateRoomAsync("Grace", ParticipantRole.Facilitator);

        var removed = await service.RemoveParticipantAsync(facilitator.ChatId, "no-such-participant");

        Assert.False(removed);
    }
}
