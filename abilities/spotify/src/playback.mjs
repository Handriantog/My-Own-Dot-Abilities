import { parseToolInput } from "./inputs.mjs";
import { selectionTargets, resolveTracks, continuation } from "./targets.mjs";
import {
  availableDevices,
  normalize,
  ownerList,
  ownerText,
} from "./resolve.mjs";

const limitation = (text) => ({
  ...ownerText(text, "error"),
  code: "provider_error",
});
async function chooseDevice(client, tool, input, targets) {
  const { body } = await client.request("devices");
  const devices = availableDevices(body).filter((device) => !device.restricted);
  if (targets.deviceId) {
    const device = devices.find((item) => item.id === targets.deviceId);
    return device
      ? { device, explicit: true }
      : {
          outcome: limitation(
            "That player is no longer available. Choose a current Spotify device.",
          ),
        };
  }
  if (!input.device) {
    const active = devices.filter((device) => device.active);
    return active.length === 1
      ? { device: active[0], explicit: false }
      : {
          outcome: limitation(
            "Open Spotify and start a player, or explicitly choose an available device.",
          ),
        };
  }
  const matches = devices.filter(
    (device) => normalize(device.name) === normalize(input.device),
  );
  if (matches.length === 1) return { device: matches[0], explicit: true };
  const choices = matches.length ? matches : devices;
  if (!choices.length)
    return {
      outcome: limitation(
        "No usable Spotify player is available. Open Spotify first.",
      ),
    };
  return {
    outcome: ownerList(
      "Choose a Spotify player",
      choices.map((device) => ({
        label: device.name,
        detail: device.active ? "Active player" : "Available player",
        action: continuation(tool, input, { ...targets, deviceId: device.id }),
      })),
      "selection_needed",
    ),
  };
}
export function createPlaybackTools(client) {
  const execute = async (tool, value, selection) => {
    const input = parseToolInput(tool, value);
    let targets = selectionTargets(tool, input, selection);
    if (tool === "play" || tool === "queue") {
      const resolution = await resolveTracks(client, tool, input, targets, {
        optional: tool === "play",
        context: tool === "play",
      });
      if (resolution.outcome) return resolution.outcome;
      targets = resolution.targets;
    }
    const selected = await chooseDevice(client, tool, input, targets);
    if (selected.outcome) return selected.outcome;
    const { device } = selected;
    const query = { device_id: device.id };
    if (tool === "volume" && !device.volume)
      return limitation(
        "This Spotify player does not support volume control. Change its volume in Spotify or on the device.",
      );
    if (tool === "play") {
      if (selected.explicit && !device.active)
        await client.request("transfer", {
          body: { device_ids: [device.id], play: false },
        });
      await client.request("play", {
        query,
        body: targets.trackUris
          ? { uris: targets.trackUris }
          : targets.contextUri
            ? { context_uri: targets.contextUri }
            : {},
      });
      return ownerText("Playback started.");
    }
    if (tool === "pause") await client.request("pause", { query });
    else if (tool === "skip")
      await client.request(
        input.direction === "previous" ? "previous" : "next",
        { query },
      );
    else if (tool === "queue")
      await client.request("queue", {
        query: { ...query, uri: targets.trackUris[0] },
      });
    else if (tool === "volume")
      await client.request("volume", {
        query: { ...query, volume_percent: input.percent },
      });
    return ownerText(
      {
        pause: "Playback paused.",
        skip: "Track skipped.",
        queue: "Track added to the queue.",
        volume: "Volume changed.",
      }[tool],
    );
  };
  return Object.fromEntries(
    ["play", "pause", "skip", "queue", "volume"].map((tool) => [
      tool,
      (input, selection) => execute(tool, input, selection),
    ]),
  );
}
