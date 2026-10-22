# Spotify Ability privacy notice

Effective for development version 0.1.0, October 23, 2026.

This Ability runs locally within My Own Dots. It requests Spotify playback/device
information, search results and playlists to perform the commands you request.
It can control your player, create/edit private playlists and save library items;
this worker's library tools accept tracks only. The exact scopes and API routes
are listed in [ability.json](ability.json) and shown before approval.

Dot sends your requested searches and actions to Spotify. Spotify handles these
under its [privacy policy](https://www.spotify.com/legal/privacy-policy/).
GitHub serves the installation package and source. This worker has no analytics,
advertising, telemetry, background polling or additional service endpoint.

The host owns browser authorization and encrypted local credentials. The worker
receives neither tokens nor your Spotify password. Your public developer Client
ID is stored as per-Dot configuration. Changing it requires a new connection.
Credentials are separate for each Dot and are excluded from portable backups.

Provider results are local, owner-only UI data, retained in memory for at most
ten minutes and removed earlier on disconnect/revocation or host shutdown. They
are not persisted into conversations, model prompts, summaries, memory,
embeddings, logs, backups or AI speech input. This worker writes no provider
catalog or operation journal to disk. The host may persist generic invocation
receipts and opaque references to prevent duplicate actions; these contain no
Spotify response metadata and cannot restore expired private results.

Your own typed requests still follow Dot's configured chat/inference and storage
behavior. If you type a song title or playlist name, that user-authored text can
be sent to your selected AI provider and saved in your conversation. This notice
does not promise that your own messages are private from the model you use.

Use **Disconnect** in the selected Dot's Ability settings to clear its stored
Spotify credentials and private results. Remove provider access on Spotify's
[Apps page](https://www.spotify.com/account/apps/) to revoke the developer app too.
Disconnecting does not delete playlists or liked songs already saved in Spotify.
Use Spotify to change those. Disable is not the same as disconnect.

For source or privacy questions, contact the maintainer through the repository's
[issue tracker](https://github.com/Handriantog/My-Own-Dot-Abilities/issues).
Never include tokens, passwords or private Spotify data in an issue.
