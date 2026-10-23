# Connect your Spotify account

This guide describes the first version under development. Use it only with a
verified Dot host and released Ability package; neither a GitHub source folder
nor the development descriptor is a published installation link.

You need Spotify Premium, the macOS 26 Apple Silicon Dot desktop app, and your own
[Spotify Developer app](https://developer.spotify.com/dashboard). Development
mode requires Premium for the app owner and restricts access to allowlisted
users. Follow the dashboard's current limits; this setup is for personal use.
See [quota modes](https://developer.spotify.com/documentation/web-api/concepts/quota-modes).

1. Create a Web API application in the Developer Dashboard. Read and accept
   Spotify's developer terms yourself. Name it without implying Spotify endorsement.
2. Register this exact redirect URI, without a port:

   ```text
   http://127.0.0.1/abilities/oauth/callback
   ```

   Dot chooses an available loopback port when connecting. Spotify permits this
   for a registered loopback IP literal. Do not use `localhost`. See the
   [redirect rules](https://developer.spotify.com/documentation/web-api/concepts/redirect_uri).

3. Add the Spotify account you intend to use to the app's allowed users if the
   dashboard requires it.
4. Open **Abilities** in the sidebar and review the released package’s identity,
   source revision, access and storage paths before choosing **Install**. Enable
   the workspace master switch, then select Spotify in the intended Dot’s settings.
5. Enter the public **Client ID** in that Dot's Spotify settings. Never enter a
   client secret, Spotify password, access token or refresh token.
6. Select **Connect account**. Review Spotify's consent in your system browser
   and return to Dot. Dot handles [PKCE](https://developer.spotify.com/documentation/web-api/tutorials/code-pkce-flow)
   and credential storage. Each Dot connects separately.
7. Open Spotify and start a player. Type a request in Dot, such as “Pause Spotify,”
   “Search Spotify for Synthetic Song,” or “Create a private playlist called My List.”

Commands are typed. Spotify results and any choices appear on screen; the AI
receives only generic status and opaque references. Choose a displayed result
when several recordings or devices match. Track lists are limited to 40 per action.
Once access is approved, individual actions do not ask for that permission again.

## Change or remove access

Use the selected Dot's Ability settings to **Disconnect** Spotify; this clears
that binding's credentials, pending connections and private cached results.
To revoke the developer app's provider authorization too, remove its access on
[your Spotify account's Apps page](https://www.spotify.com/account/apps/).

Disconnect also disables the binding. Enable it before connecting again.
Changing Client ID requires reconnecting. **Disable** stops new actions and
workers; it is distinct from disconnecting the saved account. **Forget** removes
that Dot's saved Ability state. Restored or moved workspaces require fresh consent
and reconnection. Quitting Dot stops workers; it does not stop Spotify's music.

## If a request fails

| Situation                                      | What to do                                                                                                     |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| No player, missing device or restricted device | Open Spotify, start a player, or explicitly choose an available device. Dot will not silently switch players.  |
| Connect/reconnect required                     | Check Client ID, the exact redirect registration and allowlist, then connect again.                            |
| Spotify denies access                          | Check scopes, Premium, developer-app access and playlist write permissions. A 403 has several possible causes. |
| Volume unsupported                             | Use Spotify or the device's own volume control.                                                                |
| Request limit reached                          | Wait for the displayed delay. Do not repeatedly retry or rotate client IDs.                                    |
| Outcome unknown                                | Check Spotify before making a new request; an action may already have happened.                                |
| Playlist created, additions unconfirmed        | Open the displayed playlist link and inspect it. Do not create a replacement automatically.                    |
| Selection expired                              | Make a new search; private choices expire after at most ten minutes.                                           |

Provider documentation rechecked October 23, 2026. Account eligibility and API
behavior can change. A successful fixture test is not a live account test.
