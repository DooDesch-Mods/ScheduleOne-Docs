---
title: React to players and send messages
description: Know when your session starts and ends, who is in it, and send your own messages between players.
sidebar:
  order: 3
---

Use the session events, the player list, notices and messages. Side Hustle runs the Steam lobby, so you need no netcode of your own.

**You need:** a registered gamemode. See [Add a gamemode](/mods/sidehustle/guides/getting-started/).

## Steps

1. Subscribe to the session events once, in the same class as your descriptor.

   ```csharp
   API.SessionStarted += ctx =>
   {
       if (ctx.Descriptor.Id != "you.yourmode") return;   // fires for every gamemode
       Log.Msg($"started as {ctx.Role} with {API.Players.Count} player(s)");
   };
   API.SessionEnded += id => { if (id == "you.yourmode") Log.Msg("ended"); };
   ```

   - `SessionStarted` fires after your launch callback returns. `API.CurrentSession` and `API.Players` are set by then.
   - `SessionEnded` fires once, right after `OnExitToHub`. It also fires for a failed or aborted session.
   - `ctx.Role` is `Host`, `Client` or `Singleplayer`.

2. Track players.

   ```csharp
   API.PlayerJoined += p => Log.Msg($"joined: {p}");
   API.PlayerLeft += p => Log.Msg($"left: {p}");
   ```

   - Players who are in the lobby at the start are in `API.Players`. They do not raise `PlayerJoined`.
   - The list is polled about twice a second. In a World session, `PlayerJoined` fires before the character spawns.
   - `PlayerLeft` does not fire for the remaining players when the session ends.
   - `SessionPlayer` has `SteamId`, `DisplayName`, `IsHost` and `IsLocal`.

3. Show a notice to the local player.

   ```csharp
   API.ShowNotice("Round 2 starts in 10 seconds.", 5f);
   ```

   In the world this is the game's notification popup. In the menu it is the hub's toast, with a fixed duration.

4. Send messages to the other players.

   ```csharp
   API.SendToAll("you.yourmode", "score", "red:3,blue:1");
   API.SendTo(steamId, "you.yourmode", "role", "seeker");
   ```

   - Messages go to the other players only, never to yourself.
   - Delivery is reliable. A payload is at most `API.MaxMessageBytes` bytes.
   - `false` means no session lobby or a refused message. The reason is in the log.

5. Receive messages.

   ```csharp
   API.OnMessage("you.yourmode", msg =>
   {
       if (msg.Channel == "score") ApplyScore(msg.Text);
   });
   ```

   Handlers run on the main thread. Only members of the session lobby can send to you. `SenderSteamId` comes from Steam, not from the payload.

6. Optional, host only: remove a player.

   ```csharp
   API.KickPlayer(steamId, "Too many players");
   ```

   It never kicks the host. On a client it does nothing.

All calls are safe from any thread. Calls off the main thread run on the next frame.

## Check it works

1. Host your gamemode and join with a second instance.
2. The host log shows `joined:` with the client's name.
3. Send a message from the client. The host's handler runs with the client's `SenderSteamId`.

## Run on Side Hustle 2.x too

These members need Side Hustle 3.0. On an older Side Hustle they are missing, and a call fails.
Ask for each feature by name before you use it:

```csharp
if (SideHustleLink.Has("session-events") && SideHustleLink.Has("messages"))
    SideHustleLink.TryCall(() => Gamemode.Subscribe(), "lifecycle events", LoggerInstance);
```

The names are the constants on `ApiFeatures`, for example `players`, `notices` and `messages`.

## Next

- [Run your gamemode in the game world](/mods/sidehustle/guides/world-gamemodes/)
- [`API` in the API reference](/mods/sidehustle/api/)
