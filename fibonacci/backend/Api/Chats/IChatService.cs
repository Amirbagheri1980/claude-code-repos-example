namespace Api.Chats;

public interface IChatService
{
    Task<JoinResponse> CreateRoomAsync(string name, ParticipantRole role, CancellationToken ct = default);

    // Always assigns ParticipantRole.User — joining an existing room never creates
    // a second facilitator; the room's facilitator (if any) is whoever created it.
    Task<JoinResponse?> JoinRoomAsync(string chatId, string name, CancellationToken ct = default);

    Task<ChatStateResponse?> GetStateAsync(
        string chatId,
        string? requestingParticipantId,
        CancellationToken ct = default
    );

    Task<bool> SetSelectionAsync(
        string chatId,
        string participantId,
        string? value,
        CancellationToken ct = default
    );

    Task<bool> RevealAsync(string chatId, CancellationToken ct = default);

    Task<bool> RestartAsync(string chatId, CancellationToken ct = default);

    Task<bool> CloseAsync(string chatId, CancellationToken ct = default);

    Task<bool> RemoveParticipantAsync(string chatId, string participantId, CancellationToken ct = default);
}
