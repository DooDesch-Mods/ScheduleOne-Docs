---
title: "The Beam shim (`TightBeam.cs`)"
description: "Copy this single file into your mod project (namespace `TightBeam.Api`)."
sidebar:
  order: 54
---
Copy this single file into your mod project (namespace `TightBeam.Api`). It is Unity-free, has no
dependencies, and every call is a no-op when TightBeam is not installed - so you can ship it
unconditionally. See the [Modder API](/mods/tightbeam/guides/modder-api/) for how to use it. (Or reference `TightBeam.Api.dll`
instead of copying.)

```csharp
using System;
using System.Collections.Generic;
using System.Reflection;

namespace TightBeam.Api
{
    /// <summary>
    /// TightBeam's cross-mod control API for the player's flashlight. Reference TightBeam.Api.dll OR drop this single
    /// file into your mod. Drive the beam from any mod: on/off, brightness, range, colour, plus Blink/Flicker/Pulse and
    /// scoped per-field overrides (e.g. dim it in a dark room, flicker it near power).
    ///
    /// Every call is a zero-overhead no-op when TightBeam is not installed and lights up automatically when it is, so
    /// you can ship this unconditionally with no hard dependency. All calls MUST be on the Unity main thread.
    ///
    /// <code>
    ///   using TightBeam.Api;
    ///   Beam.Blink(3);                                   // event blink
    ///   var ov = Beam.BeginOverride("MyMod");            // scoped, per-field override
    ///   ov.SetIntensity(1f).SetSpotAngle(28f);           //   dim + narrow while in a zone
    ///   ov.Dispose();                                    // release -> beam returns to the player's own settings
    /// </code>
    /// </summary>
    public static class Beam
    {
        private static bool _bound;
        private static int _probeAttempts;
        private static readonly List<Action> _pending = new List<Action>();

        private static Func<bool> _isOn;
        private static Func<float> _getIntensity, _getRange, _getSpotAngle;
        private static Func<float[]> _getColor;
        private static Action<bool> _setOn;
        private static Action _toggle, _stopFlicker, _stopPulse;
        private static Action<float> _setIntensity, _setRange, _setSpotAngle;
        private static Action<float, float, float, float> _setColor;
        private static Action<int, float> _blink;
        private static Action<float, float, float> _flicker, _pulse;
        private static Action<float, float> _tempIntensity;
        private static Action<float, float, float, float, float> _tempColor;
        private static Func<string, int> _beginOverride;
        private static Action<int> _endOverride, _clrI, _clrR, _clrA, _clrC;
        private static Action<int, float> _ovI, _ovR, _ovA;
        private static Action<int, float, float, float, float> _ovC;
        private static Action<Action<bool>> _registerToggled;

        private static int _abi;
        private static Func<bool> _isMultiplayer;
        private static Func<ulong> _getLocalSteamId;
        private static Func<ulong[]> _getRemoteIds;
        private static Func<ulong, bool> _remoteHasTightBeam, _isRemoteRendered;
        private static Func<ulong, float[]> _getRemoteBeam, _getRemoteBeamPose;
        private static Action<Action<ulong, bool>> _registerRemoteToggled;
        private static readonly ulong[] _noIds = new ulong[0];

        /// <summary>Fires whenever the flashlight actually transitions on/off (player key or any mod's SetOn/Toggle).</summary>
        public static event Action<bool> OnToggled;

        /// <summary>Fires when ANOTHER player's beam goes on or off: (steamId, isOn).</summary>
        public static event Action<ulong, bool> OnRemoteToggled;

        /// <summary>True only when the TightBeam host is installed AND bound. You rarely need this - the API is a safe no-op when absent.</summary>
        public static bool Available { get { EnsureBound(); return _bound; } }

        /// <summary>ABI version of the host that is installed: 0 when absent, 1 for local-only builds, 2 and up once
        /// the other players' beams can be read.</summary>
        public static int AbiVersion { get { EnsureBound(); return _abi; } }

        public static bool IsOn { get { EnsureBound(); return _isOn != null && _isOn(); } }
        public static float Intensity { get { EnsureBound(); return _getIntensity?.Invoke() ?? 0f; } }
        public static float Range { get { EnsureBound(); return _getRange?.Invoke() ?? 0f; } }
        public static float SpotAngle { get { EnsureBound(); return _getSpotAngle?.Invoke() ?? 0f; } }
        public static void GetColor(out float r, out float g, out float b, out float a)
        {
            EnsureBound();
            var c = _getColor?.Invoke();
            if (c != null && c.Length >= 4) { r = c[0]; g = c[1]; b = c[2]; a = c[3]; } else { r = g = b = a = 0f; }
        }

        public static void TurnOn() => SetOn(true);
        public static void TurnOff() => SetOn(false);
        public static void Toggle() => Do(() => _toggle?.Invoke());
        public static void SetOn(bool on) => Do(() => _setOn?.Invoke(on));

        public static void SetIntensity(float value) => Do(() => _setIntensity?.Invoke(value));
        public static void SetRange(float meters) => Do(() => _setRange?.Invoke(meters));
        public static void SetSpotAngle(float degrees) => Do(() => _setSpotAngle?.Invoke(degrees));
        public static void SetColor(float r, float g, float b, float a = 1f) => Do(() => _setColor?.Invoke(r, g, b, a));
        public static void SetColorHex(string hex) { if (TryHex(hex, out var r, out var g, out var b, out var a)) SetColor(r, g, b, a); }

        public static void Blink(int times, float intervalSeconds = 0.12f) => Do(() => _blink?.Invoke(times, intervalSeconds));
        public static void Flicker(float strength01, float durationSeconds, float frequencyHz = 14f) => Do(() => _flicker?.Invoke(strength01, durationSeconds, frequencyHz));
        public static void StopFlicker() => Do(() => _stopFlicker?.Invoke());
        public static void Pulse(float amplitude01, float periodSeconds, float durationSeconds) => Do(() => _pulse?.Invoke(amplitude01, periodSeconds, durationSeconds));
        public static void StopPulse() => Do(() => _stopPulse?.Invoke());

        public static void SetTemporaryIntensity(float value, float seconds, float fadeSeconds = 0.25f) => Do(() => _tempIntensity?.Invoke(value, seconds));
        public static void SetTemporaryColor(float r, float g, float b, float seconds, float a = 1f, float fadeSeconds = 0.25f) => Do(() => _tempColor?.Invoke(r, g, b, a, seconds));

        // ----- other players' beams (host ABI 2+) -----------------------------------------------------------------
        // Read-only by design. Every player is the sole author of their own beam, so you drive the LOCAL beam as
        // usual and the state replicates on its own - a blackout you apply here is what the other players see.
        // Players are identified by SteamID64. Everything degrades to "nothing there" against an older host.

        /// <summary>True while in a session with at least one other player.</summary>
        public static bool IsMultiplayer { get { EnsureBound(); return _isMultiplayer != null && _isMultiplayer(); } }

        /// <summary>The local player's SteamID64, or 0 when it is not known yet.</summary>
        public static ulong LocalSteamId { get { EnsureBound(); return _getLocalSteamId?.Invoke() ?? 0UL; } }

        /// <summary>Every other player whose beam is being tracked. Never null; empty when alone or absent.</summary>
        public static ulong[] RemoteIds { get { EnsureBound(); return _getRemoteIds?.Invoke() ?? _noIds; } }

        /// <summary>Whether this player is running TightBeam and sharing their beam. False means TryGetRemote still
        /// answers, but with local defaults rather than their real settings.</summary>
        public static bool RemoteHasTightBeam(ulong steamId)
        {
            EnsureBound();
            return _remoteHasTightBeam != null && _remoteHasTightBeam(steamId);
        }

        /// <summary>Whether that player's beam is actually being drawn, as opposed to lit but culled by distance or
        /// the beam cap.</summary>
        public static bool IsRemoteRendered(ulong steamId)
        {
            EnsureBound();
            return _isRemoteRendered != null && _isRemoteRendered(steamId);
        }

        /// <summary>One player's beam as it is being drawn. False when that player is unknown.</summary>
        public static bool TryGetRemote(ulong steamId, out RemoteBeamState state)
        {
            EnsureBound();
            state = default;
            var v = _getRemoteBeam?.Invoke(steamId);
            if (v == null || v.Length < 8) return false;
            state = new RemoteBeamState
            {
                IsOn = v[0] != 0f,
                Intensity = v[1], Range = v[2], SpotAngle = v[3],
                R = v[4], G = v[5], B = v[6], A = v[7],
            };
            return true;
        }

        /// <summary>Where one player's beam starts and which way it points, for questions like "is that beam on me".
        /// False when the beam is not currently drawn.</summary>
        public static bool TryGetRemotePose(ulong steamId,
            out float px, out float py, out float pz, out float fx, out float fy, out float fz)
        {
            EnsureBound();
            px = py = pz = fx = fy = fz = 0f;
            var v = _getRemoteBeamPose?.Invoke(steamId);
            if (v == null || v.Length < 6) return false;
            px = v[0]; py = v[1]; pz = v[2]; fx = v[3]; fy = v[4]; fz = v[5];
            return true;
        }

        /// <summary>Begin a scoped, per-field override for one owner. Dispose() (or scope exit) releases it.</summary>
        public static OverrideHandle BeginOverride(string ownerId)
        {
            EnsureBound();
            int token = _beginOverride?.Invoke(ownerId ?? "?") ?? 0;
            return new OverrideHandle(token);
        }

        internal static void OvIntensity(int t, float v) => Do(() => _ovI?.Invoke(t, v));
        internal static void OvRange(int t, float v) => Do(() => _ovR?.Invoke(t, v));
        internal static void OvSpotAngle(int t, float v) => Do(() => _ovA?.Invoke(t, v));
        internal static void OvColor(int t, float r, float g, float b, float a) => Do(() => _ovC?.Invoke(t, r, g, b, a));
        internal static void ClrIntensity(int t) => Do(() => _clrI?.Invoke(t));
        internal static void ClrRange(int t) => Do(() => _clrR?.Invoke(t));
        internal static void ClrSpotAngle(int t) => Do(() => _clrA?.Invoke(t));
        internal static void ClrColor(int t) => Do(() => _clrC?.Invoke(t));
        internal static void EndOverride(int t) => Do(() => _endOverride?.Invoke(t));

        private static void Do(Action a) { EnsureBound(); if (_bound) a(); else _pending.Add(a); }
        private static void NotifyToggled(bool on) { try { OnToggled?.Invoke(on); } catch { } }
        private static void NotifyRemoteToggled(ulong id, bool on) { try { OnRemoteToggled?.Invoke(id, on); } catch { } }

        private static void EnsureBound()
        {
            if (_bound) return;
            try
            {
                Type t = FindBridge((_probeAttempts++ % 30) == 0);
                if (t == null) return;
                object abi = t.GetField("AbiVersion", BindingFlags.Public | BindingFlags.Static)?.GetValue(null);
                if (abi is int v && v < 1) return;
                _abi = abi is int av ? av : 1;

                _isOn = G<Func<bool>>(t, "IsOn");
                _getIntensity = G<Func<float>>(t, "GetIntensity");
                _getRange = G<Func<float>>(t, "GetRange");
                _getSpotAngle = G<Func<float>>(t, "GetSpotAngle");
                _getColor = G<Func<float[]>>(t, "GetColor");
                _setOn = G<Action<bool>>(t, "SetOn");
                _toggle = G<Action>(t, "Toggle");
                _setIntensity = G<Action<float>>(t, "SetIntensity");
                _setRange = G<Action<float>>(t, "SetRange");
                _setSpotAngle = G<Action<float>>(t, "SetSpotAngle");
                _setColor = G<Action<float, float, float, float>>(t, "SetColor");
                _blink = G<Action<int, float>>(t, "Blink");
                _flicker = G<Action<float, float, float>>(t, "Flicker");
                _stopFlicker = G<Action>(t, "StopFlicker");
                _pulse = G<Action<float, float, float>>(t, "Pulse");
                _stopPulse = G<Action>(t, "StopPulse");
                _tempIntensity = G<Action<float, float>>(t, "TempIntensity");
                _tempColor = G<Action<float, float, float, float, float>>(t, "TempColor");
                _beginOverride = G<Func<string, int>>(t, "BeginOverride");
                _endOverride = G<Action<int>>(t, "EndOverride");
                _ovI = G<Action<int, float>>(t, "OvIntensity");
                _ovR = G<Action<int, float>>(t, "OvRange");
                _ovA = G<Action<int, float>>(t, "OvSpotAngle");
                _ovC = G<Action<int, float, float, float, float>>(t, "OvColor");
                _clrI = G<Action<int>>(t, "ClrIntensity");
                _clrR = G<Action<int>>(t, "ClrRange");
                _clrA = G<Action<int>>(t, "ClrSpotAngle");
                _clrC = G<Action<int>>(t, "ClrColor");
                _registerToggled = G<Action<Action<bool>>>(t, "RegisterToggledListener");

                // ABI 2 additions. They resolve to null against an older host, which is exactly what makes every
                // member above degrade to "nothing there" instead of throwing.
                _isMultiplayer = G<Func<bool>>(t, "IsMultiplayer");
                _getLocalSteamId = G<Func<ulong>>(t, "GetLocalSteamId");
                _getRemoteIds = G<Func<ulong[]>>(t, "GetRemoteBeamIds");
                _remoteHasTightBeam = G<Func<ulong, bool>>(t, "RemoteHasTightBeam");
                _getRemoteBeam = G<Func<ulong, float[]>>(t, "GetRemoteBeam");
                _getRemoteBeamPose = G<Func<ulong, float[]>>(t, "GetRemoteBeamPose");
                _isRemoteRendered = G<Func<ulong, bool>>(t, "IsRemoteBeamRendered");
                _registerRemoteToggled = G<Action<Action<ulong, bool>>>(t, "RegisterRemoteToggledListener");

                // Gate on a v1 field. Keying this on a v2 field would make this shim refuse to bind to a v1 host
                // and silently break every consumer that ships against an older TightBeam.
                if (_setOn == null) return; // partial table - retry next call
                _bound = true;
                _registerToggled?.Invoke(NotifyToggled);
                _registerRemoteToggled?.Invoke(NotifyRemoteToggled);
                for (int i = 0; i < _pending.Count; i++) { try { _pending[i](); } catch { } }
                _pending.Clear();
            }
            catch { }
        }

        private static T G<T>(Type t, string field) where T : class
            => t.GetField(field, BindingFlags.Public | BindingFlags.Static)?.GetValue(null) as T;

        private static Type FindBridge(bool scan)
        {
            Type t = Type.GetType("TightBeam.Bridge.FlashlightBridge, TightBeam", false);
            if (t != null || !scan) return t;
            foreach (Assembly asm in AppDomain.CurrentDomain.GetAssemblies())
            {
                try { t = asm.GetType("TightBeam.Bridge.FlashlightBridge", false); if (t != null) return t; } catch { }
            }
            return null;
        }

        private static bool TryHex(string hex, out float r, out float g, out float b, out float a)
        {
            r = g = b = a = 1f;
            if (string.IsNullOrEmpty(hex)) return false;
            if (hex[0] == '#') hex = hex.Substring(1);
            if (hex.Length < 6) return false;
            try
            {
                r = Convert.ToInt32(hex.Substring(0, 2), 16) / 255f;
                g = Convert.ToInt32(hex.Substring(2, 2), 16) / 255f;
                b = Convert.ToInt32(hex.Substring(4, 2), 16) / 255f;
                a = hex.Length >= 8 ? Convert.ToInt32(hex.Substring(6, 2), 16) / 255f : 1f;
                return true;
            }
            catch { return false; }
        }
    }

    /// <summary>Another player's beam as it is being drawn on this machine.</summary>
    public struct RemoteBeamState
    {
        public bool IsOn;
        public float Intensity, Range, SpotAngle;
        public float R, G, B, A;
    }

    /// <summary>A scoped, per-field override on the flashlight for one owner. Set fields to drive the beam; Clear or
    /// Dispose to release them and let the player's own settings show through. Safe no-op if TightBeam is absent.</summary>
    public struct OverrideHandle : IDisposable
    {
        private readonly int _token;
        internal OverrideHandle(int token) { _token = token; }
        public OverrideHandle SetIntensity(float v) { Beam.OvIntensity(_token, v); return this; }
        public OverrideHandle SetRange(float m) { Beam.OvRange(_token, m); return this; }
        public OverrideHandle SetSpotAngle(float deg) { Beam.OvSpotAngle(_token, deg); return this; }
        public OverrideHandle SetColor(float r, float g, float b, float a = 1f) { Beam.OvColor(_token, r, g, b, a); return this; }
        public OverrideHandle ClearIntensity() { Beam.ClrIntensity(_token); return this; }
        public OverrideHandle ClearRange() { Beam.ClrRange(_token); return this; }
        public OverrideHandle ClearSpotAngle() { Beam.ClrSpotAngle(_token); return this; }
        public OverrideHandle ClearColor() { Beam.ClrColor(_token); return this; }
        public void Dispose() { Beam.EndOverride(_token); }
    }
}
```

