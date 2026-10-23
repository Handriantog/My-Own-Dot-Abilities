import { createQueryTools } from "./queries.mjs";
import { createPlaybackTools } from "./playback.mjs";
import { createLibraryTools } from "./library.mjs";
import { mapSpotifyFailure, SpotifyFailure } from "./errors.mjs";
export async function dispatchTool({
  tool,
  arguments: input,
  selection,
  client,
  signal,
}) {
  try {
    if (signal?.aborted) throw new SpotifyFailure("cancelled");
    const tools = {
      ...createQueryTools(client),
      ...createPlaybackTools(client),
      ...createLibraryTools(client),
    };
    if (!Object.hasOwn(tools, tool))
      throw new SpotifyFailure("permission_denied");
    return await tools[tool](input, selection);
  } catch (error) {
    return mapSpotifyFailure(error);
  }
}
