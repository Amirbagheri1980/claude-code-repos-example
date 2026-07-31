namespace Api.Chats;

public interface IChatService
{
    Task<JoinResponse> CreateRoomAsync(string name, ParticipantRole role, CancellationToken ct = default);

    Task<JoinResponse?> JoinRoomAsync(
        string chatId,
        string name,
        ParticipantRole role,
        CancellationToken ct = default
    );

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
}
