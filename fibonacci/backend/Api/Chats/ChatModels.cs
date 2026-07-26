using System.Text.Json.Serialization;

namespace Api.Chats;

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum ParticipantRole
{
    User,
    Facilitator,
}

public record JoinRequest(string Name, ParticipantRole Role);

public record JoinResponse(string ChatId, string ParticipantId, ParticipantRole Role);

public record SelectionRequest(string? Value);

public record ParticipantDto(
    string ParticipantId,
    string Name,
    ParticipantRole Role,
    bool HasSelected,
    string? Selection
);

public record ChatStateResponse(bool Revealed, IReadOnlyList<ParticipantDto> Participants);
