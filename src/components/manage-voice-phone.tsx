"use client";

import type { Call, Device as TwilioDevice } from "@twilio/voice-sdk";
import {
  Backspace,
  Dialpad,
  LoaderCircle,
  Microphone,
  MicrophoneOff,
  Phone,
  PhoneCall,
  PhoneOff,
  X,
} from "@/lib/icons";
import { useToast } from "@/components/toast-provider";
import { WorkspaceUtilityButton } from "@/components/ui/workspace-primitives";
import {
  formatVoiceNumber,
  normalizeVoiceNumber,
} from "@/lib/manage/voice-number";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from "react";

type PhoneState = "disconnected" | "connecting" | "ready" | "error";
type CallPhase = "dialing" | "ringing" | "active";
type Configuration = {
  configured: boolean;
  missing: string[];
  phoneNumber: string | null;
};
type ActiveCall = {
  call: Call;
  direction: "inbound" | "outbound";
  name: string;
  number: string;
  phase: CallPhase;
  connectedAt: number | null;
};
type VoiceHistoryCall = {
  id: string;
  direction: "inbound" | "outbound";
  status: string;
  display_name: string | null;
  caller_number: string;
  callee_number: string;
  created_at: string;
  duration_seconds: number | null;
  recording_sid: string | null;
  recording_duration_seconds: number | null;
  is_voicemail: boolean;
  is_read: boolean;
};

const DIGITS = [
  ["1", ""],
  ["2", "ABC"],
  ["3", "DEF"],
  ["4", "GHI"],
  ["5", "JKL"],
  ["6", "MNO"],
  ["7", "PQRS"],
  ["8", "TUV"],
  ["9", "WXYZ"],
  ["*", ""],
  ["0", "+"],
  ["#", ""],
] as const;

async function responsePayload<T>(response: Response) {
  return (await response.json().catch(() => ({}))) as T;
}

function callDisplayName(call: Call) {
  return call.customParameters.get("CallerName") || "Unknown caller";
}

function callDisplayNumber(call: Call) {
  return (
    call.customParameters.get("CallerNumber") ||
    call.parameters.From ||
    "Unknown number"
  );
}

function formatDuration(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${String(minutes).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function ManageVoicePhone() {
  const toast = useToast();
  const panelId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const incomingAnswerRef = useRef<HTMLButtonElement>(null);
  const incomingToastRef = useRef<number | null>(null);
  const deviceRef = useRef<TwilioDevice | null>(null);
  const activeCallRef = useRef<Call | null>(null);
  const initializingRef = useRef<Promise<TwilioDevice> | null>(null);
  const [configuration, setConfiguration] = useState<Configuration | null>(null);
  const [phoneState, setPhoneState] = useState<PhoneState>("disconnected");
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelClosing, setPanelClosing] = useState(false);
  const [activeCall, setActiveCall] = useState<ActiveCall | null>(null);
  const [incomingCall, setIncomingCall] = useState<ActiveCall | null>(null);
  const [dialNumber, setDialNumber] = useState("");
  const [showActiveDialpad, setShowActiveDialpad] = useState(false);
  const [muted, setMuted] = useState(false);
  const [now, setNow] = useState(0);
  const [history, setHistory] = useState<VoiceHistoryCall[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [playingRecording, setPlayingRecording] = useState<string | null>(null);

  const loadConfiguration = useCallback(async () => {
    try {
      const response = await fetch("/api/manage/voice/status", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = await responsePayload<Configuration & { error?: string }>(response);
      if (!response.ok) throw new Error(payload.error || "Unable to check the phone setup.");
      setConfiguration(payload);
      return payload;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to check the phone setup.";
      setPhoneError(message);
      setPhoneState("error");
      return null;
    }
  }, []);

  const closePanel = useCallback(() => {
    setPanelOpen(false);
    setPanelClosing(true);
  }, []);

  const openPanel = useCallback(() => {
    setPanelClosing(false);
    setPanelOpen(true);
    if (!configuration) void loadConfiguration();
  }, [configuration, loadConfiguration]);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const response = await fetch("/api/manage/voice/calls?limit=8", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = await responsePayload<{ calls?: VoiceHistoryCall[] }>(response);
      if (!response.ok) throw new Error("Unable to load recent calls.");
      setHistory(payload.calls || []);
    } catch (error) {
      toast.error("Call history unavailable", error instanceof Error ? error.message : "Try again shortly.");
    } finally {
      setHistoryLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!panelOpen || !configuration?.configured) return;
    const refreshId = window.setTimeout(() => void loadHistory(), 0);
    return () => window.clearTimeout(refreshId);
  }, [configuration?.configured, loadHistory, panelOpen]);

  useEffect(() => {
    const refresh = () => {
      if (panelOpen && configuration?.configured) void loadHistory();
    };
    window.addEventListener("costivra-voice-history-refresh", refresh);
    return () => window.removeEventListener("costivra-voice-history-refresh", refresh);
  }, [configuration?.configured, loadHistory, panelOpen]);

  useEffect(() => {
    if (!panelOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || incomingCall) return;
      event.preventDefault();
      closePanel();
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [closePanel, incomingCall, panelOpen]);

  useEffect(() => {
    if (activeCall?.phase !== "active") return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeCall?.phase]);

  useEffect(() => {
    if (incomingCall) incomingAnswerRef.current?.focus({ preventScroll: true });
  }, [incomingCall]);

  const dismissIncomingToast = useCallback(() => {
    if (incomingToastRef.current == null) return;
    toast.dismiss(incomingToastRef.current);
    incomingToastRef.current = null;
  }, [toast]);

  const clearCall = useCallback(() => {
    dismissIncomingToast();
    activeCallRef.current = null;
    setActiveCall(null);
    setIncomingCall(null);
    setMuted(false);
    setShowActiveDialpad(false);
    window.dispatchEvent(new Event("costivra-voice-history-refresh"));
  }, [dismissIncomingToast]);

  const attachCallEvents = useCallback(
    (call: Call, initial: ActiveCall) => {
      activeCallRef.current = call;
      setActiveCall(initial);
      call.on("ringing", () => {
        setActiveCall((current) =>
          current ? { ...current, phase: "ringing" } : current,
        );
      });
      call.on("accept", () => {
        const connectedAt = Date.now();
        setNow(connectedAt);
        setActiveCall((current) =>
          current ? { ...current, phase: "active", connectedAt } : current,
        );
        setIncomingCall(null);
        openPanel();
      });
      call.on("mute", (isMuted) => setMuted(isMuted));
      call.on("disconnect", clearCall);
      call.on("cancel", clearCall);
      call.on("reject", clearCall);
      call.on("error", (error) => {
        toast.error("Call ended", error.message || "The call could not continue.");
        clearCall();
      });
    },
    [clearCall, openPanel, toast],
  );

  const refreshToken = useCallback(async () => {
    const response = await fetch("/api/manage/voice/token", {
      cache: "no-store",
      headers: { Accept: "application/json" },
    });
    const payload = await responsePayload<{ token?: string; error?: string }>(response);
    if (!response.ok || !payload.token) {
      throw new Error(payload.error || "Unable to authorize the Costivra browser phone.");
    }
    return payload.token;
  }, []);

  const initializePhone = useCallback(async () => {
    const readiness = configuration ?? (await loadConfiguration());
    if (!readiness?.configured) {
      throw new Error("Add the Twilio project settings before turning on the phone.");
    }
    if (deviceRef.current && deviceRef.current.state !== "destroyed") {
      if (deviceRef.current.state === "unregistered") await deviceRef.current.register();
      return deviceRef.current;
    }
    if (initializingRef.current) return initializingRef.current;

    const pending = (async () => {
      setPhoneState("connecting");
      setPhoneError(null);
      const [{ Device }, token] = await Promise.all([
        import("@twilio/voice-sdk"),
        refreshToken(),
      ]);
      const device = new Device(token, {
        allowIncomingWhileBusy: false,
        appName: "Costivra Manage",
        appVersion: "1.0.0",
        closeProtection: "A Costivra call is active. Leave this page?",
        tokenRefreshMs: 30_000,
      });
      device.on("registering", () => setPhoneState("connecting"));
      device.on("registered", () => setPhoneState("ready"));
      device.on("unregistered", () => setPhoneState("disconnected"));
      device.on("incoming", (call) => {
        const incoming: ActiveCall = {
          call,
          direction: "inbound",
          name: callDisplayName(call),
          number: callDisplayNumber(call),
          phase: "ringing",
          connectedAt: null,
        };
        attachCallEvents(call, incoming);
        setIncomingCall(incoming);
        closePanel();
        navigator.vibrate?.([180, 90, 180]);
        incomingToastRef.current = toast.show({
          title: `Incoming call from ${incoming.name}`,
          message: formatVoiceNumber(incoming.number),
          tone: "info",
          duration: 20_000,
          actionLabel: "View call",
          onActionClick: openPanel,
        });
      });
      device.on("tokenWillExpire", async () => {
        try {
          device.updateToken(await refreshToken());
        } catch {
          setPhoneError("The phone session could not refresh. Turn the phone on again.");
          setPhoneState("error");
        }
      });
      device.on("error", (error) => {
        setPhoneError(error.message || "The browser phone could not connect.");
        setPhoneState("error");
      });
      deviceRef.current = device;
      await device.register();
      return device;
    })();

    initializingRef.current = pending;
    try {
      return await pending;
    } finally {
      initializingRef.current = null;
    }
  }, [attachCallEvents, closePanel, configuration, loadConfiguration, openPanel, refreshToken, toast]);

  const enablePhone = useCallback(async () => {
    try {
      await initializePhone();
      toast.success("Phone ready", "Incoming calls can now ring in this browser.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "The phone could not start.";
      setPhoneError(message);
      setPhoneState("error");
      toast.error("Phone unavailable", message);
    }
  }, [initializePhone, toast]);

  const disablePhone = useCallback(() => {
    activeCallRef.current?.disconnect();
    activeCallRef.current = null;
    deviceRef.current?.destroy();
    deviceRef.current = null;
    clearCall();
    setPhoneState("disconnected");
    setPhoneError(null);
    toast.info("Phone turned off", "This browser will not receive calls until you turn it on again.");
  }, [clearCall, toast]);

  const startCall = useCallback(async () => {
    const destination = normalizeVoiceNumber(dialNumber);
    if (!destination) {
      toast.warning("Check the number", "Enter a phone number with an area code.");
      return;
    }
    if (activeCallRef.current) {
      toast.warning("Call already active", "End the current call before starting another.");
      return;
    }
    try {
      const device = await initializePhone();
      const call = await device.connect({ params: { To: destination } });
      attachCallEvents(call, {
        call,
        direction: "outbound",
        name: formatVoiceNumber(destination),
        number: destination,
        phase: "dialing",
        connectedAt: null,
      });
      openPanel();
    } catch (error) {
      const message = error instanceof Error ? error.message : "The call could not start.";
      toast.error("Unable to call", message);
    }
  }, [attachCallEvents, dialNumber, initializePhone, openPanel, toast]);

  const answerIncoming = useCallback(() => {
    if (!incomingCall) return;
    dismissIncomingToast();
    incomingCall.call.accept();
    openPanel();
  }, [dismissIncomingToast, incomingCall, openPanel]);

  const declineIncoming = useCallback(() => {
    if (!incomingCall) return;
    dismissIncomingToast();
    incomingCall.call.reject();
    clearCall();
  }, [clearCall, dismissIncomingToast, incomingCall]);

  useEffect(() => {
    return () => {
      activeCallRef.current?.disconnect();
      deviceRef.current?.destroy();
    };
  }, []);

  const iconState = activeCall
    ? "active"
    : phoneState === "ready"
      ? "ready"
      : phoneState === "connecting"
        ? "connecting"
        : "disconnected";
  const iconLabel = activeCall
    ? activeCall.phase === "active"
      ? "Active call"
      : activeCall.direction === "inbound"
        ? "Incoming call"
        : "Call connecting"
    : phoneState === "ready"
      ? "Phone ready"
      : phoneState === "connecting"
        ? "Phone connecting"
        : "Phone disconnected";
  const renderPanel = panelOpen || panelClosing;
  const connectedSeconds =
    activeCall?.connectedAt ? Math.max(0, Math.floor((now - activeCall.connectedAt) / 1000)) : 0;

  return (
    <div className="manage-voice" data-phone-state={iconState}>
      <WorkspaceUtilityButton
        active={panelOpen || Boolean(activeCall)}
        aria-controls={panelId}
        aria-expanded={panelOpen}
        aria-haspopup="dialog"
        aria-label={`${iconLabel}. Open phone.`}
        className="manage-voice-trigger"
        onClick={() => (panelOpen ? closePanel() : openPanel())}
        ref={triggerRef}
        title={iconLabel}
      >
        <Phone aria-hidden="true" size={18} />
        <span aria-hidden="true" className="manage-voice-status-dot" />
      </WorkspaceUtilityButton>

      {renderPanel ? (
        <section
          aria-hidden={!panelOpen}
          aria-label="Costivra phone"
          aria-modal="false"
          className={`manage-voice-panel${panelClosing ? " is-closing" : ""}`}
          id={panelId}
          inert={!panelOpen}
          onAnimationEnd={() => {
            if (!panelClosing) return;
            setPanelClosing(false);
            triggerRef.current?.focus({ preventScroll: true });
          }}
          role="dialog"
        >
          <header className="manage-voice-panel__header">
            <div>
              <span className={`manage-voice-state manage-voice-state--${iconState}`}>
                <i aria-hidden="true" /> {iconLabel}
              </span>
              <strong>Costivra phone</strong>
              {configuration?.phoneNumber ? <small>Calling from {configuration.phoneNumber}</small> : null}
            </div>
            <button aria-label="Close phone" className="workspace-close-button" onClick={closePanel} type="button">
              <X aria-hidden="true" size={17} />
            </button>
          </header>

          {activeCall ? (
            <div className="manage-voice-active">
              <div className="manage-voice-active__identity">
                <span className={`manage-voice-active__icon is-${activeCall.phase}`}>
                  <PhoneCall aria-hidden="true" size={24} />
                </span>
                <p>{activeCall.phase === "active" ? formatDuration(connectedSeconds) : activeCall.phase === "ringing" ? "Ringing" : "Calling"}</p>
                <h2>{activeCall.name}</h2>
                <span>{formatVoiceNumber(activeCall.number)}</span>
              </div>

              {showActiveDialpad ? (
                <DialpadGrid
                  label="Send keypad tone"
                  onDigit={(digit) => activeCall.call.sendDigits(digit)}
                />
              ) : null}

              <div className="manage-voice-call-controls">
                <button
                  aria-label={muted ? "Unmute microphone" : "Mute microphone"}
                  aria-pressed={muted}
                  className={muted ? "is-selected" : ""}
                  onClick={() => activeCall.call.mute(!muted)}
                  type="button"
                >
                  {muted ? <MicrophoneOff aria-hidden="true" size={19} /> : <Microphone aria-hidden="true" size={19} />}
                  <span>{muted ? "Unmute" : "Mute"}</span>
                </button>
                <button
                  aria-label={showActiveDialpad ? "Hide keypad" : "Show keypad"}
                  aria-pressed={showActiveDialpad}
                  className={showActiveDialpad ? "is-selected" : ""}
                  onClick={() => setShowActiveDialpad((current) => !current)}
                  type="button"
                >
                  <Dialpad aria-hidden="true" size={19} />
                  <span>Keypad</span>
                </button>
                <button
                  aria-label="End call"
                  className="is-end"
                  onClick={() => activeCall.call.disconnect()}
                  type="button"
                >
                  <PhoneOff aria-hidden="true" size={20} />
                  <span>End</span>
                </button>
              </div>
            </div>
          ) : configuration && !configuration.configured ? (
            <div className="manage-voice-setup">
              <span className="manage-voice-setup__icon"><Phone aria-hidden="true" size={22} /></span>
              <h2>{configuration.missing.includes("COSTIVRA_MAIN_NUMBER") ? "Choose a Costivra number" : "Connect your Twilio project"}</h2>
              <p>
                {configuration.missing.includes("COSTIVRA_MAIN_NUMBER")
                  ? "Purchase and designate a main number in Settings. Costivra reads that choice dynamically, so you do not need to enter a phone number here."
                  : "The phone is built and safely offline. Add the server-only values below, then redeploy."}
              </p>
              <ul>
                {configuration.missing.map((key) => (
                  <li key={key}>
                    {key === "COSTIVRA_MAIN_NUMBER" ? "Purchase and designate a main number in Manage Settings" : <code>{key}</code>}
                  </li>
                ))}
              </ul>
              <button className="manage-voice-secondary" onClick={() => void loadConfiguration()} type="button">
                Check setup again
              </button>
            </div>
          ) : phoneState !== "ready" ? (
            <div className="manage-voice-setup">
              <span className="manage-voice-setup__icon">
                {phoneState === "connecting" ? <LoaderCircle aria-hidden="true" className="manage-voice-spinner" size={22} /> : <Phone aria-hidden="true" size={22} />}
              </span>
              <h2>{phoneState === "error" ? "Phone needs attention" : "Turn on this browser"}</h2>
              <p>{phoneError || "Turn the phone on when you want this Manage session to place and receive calls."}</p>
              <button className="manage-voice-primary" disabled={phoneState === "connecting"} onClick={() => void enablePhone()} type="button">
                {phoneState === "connecting" ? "Connecting…" : "Turn on phone"}
              </button>
            </div>
          ) : (
            <div className="manage-voice-dialer">
              <label htmlFor={`${panelId}-number`}>Phone number</label>
              <div className="manage-voice-number-field">
                <input
                  autoComplete="tel"
                  id={`${panelId}-number`}
                  inputMode="tel"
                  onChange={(event) => setDialNumber(event.target.value.slice(0, 24))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") void startCall();
                  }}
                  placeholder="(214) 555-0123"
                  type="tel"
                  value={dialNumber}
                />
                {dialNumber ? (
                  <button aria-label="Delete last digit" onClick={() => setDialNumber((current) => current.slice(0, -1))} type="button">
                    <Backspace aria-hidden="true" size={18} />
                  </button>
                ) : null}
              </div>
              <DialpadGrid
                label="Enter phone number"
                onDigit={(digit) => setDialNumber((current) => `${current}${digit}`.slice(0, 24))}
              />
              <button className="manage-voice-call-button" disabled={!normalizeVoiceNumber(dialNumber)} onClick={() => void startCall()} type="button">
                <PhoneCall aria-hidden="true" size={18} /> Call
              </button>
              <button className="manage-voice-turn-off" onClick={disablePhone} type="button">Turn off browser phone</button>
              <section aria-labelledby={`${panelId}-recent-calls`} className="manage-voice-history">
                <div className="manage-voice-history__heading">
                  <h3 id={`${panelId}-recent-calls`}>Recent calls</h3>
                  <button aria-label="Refresh recent calls" disabled={historyLoading} onClick={() => void loadHistory()} type="button">{historyLoading ? "Loading…" : "Refresh"}</button>
                </div>
                {historyLoading && history.length === 0 ? <p className="manage-voice-history__empty">Loading recent calls…</p> : history.length === 0 ? <p className="manage-voice-history__empty">No calls yet. Your recent inbound calls and browser calls will appear here.</p> : (
                  <div className="manage-voice-history__list">
                    {history.map((item) => {
                      const number = item.direction === "inbound" ? item.caller_number : item.callee_number;
                      const label = item.is_voicemail ? "Voicemail" : item.direction === "inbound" ? (item.status === "completed" ? "Incoming call" : "Missed call") : "Outbound call";
                      return <div className={`manage-voice-history__row${item.is_voicemail && !item.is_read ? " is-unread" : ""}`} key={item.id}>
                        <span className="manage-voice-history__icon" aria-hidden="true"><PhoneCall size={16} /></span>
                        <div><strong>{item.display_name || formatVoiceNumber(number)}</strong><small>{label} · {new Date(item.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</small></div>
                        <span className="manage-voice-history__meta">{item.is_voicemail && item.recording_sid ? <button aria-label={`Play voicemail from ${formatVoiceNumber(number)}`} className="manage-voice-history__play" onClick={() => setPlayingRecording((current) => current === item.recording_sid ? null : item.recording_sid)} type="button"><PhoneCall aria-hidden="true" size={15} /> Play</button> : item.duration_seconds ? formatDuration(item.duration_seconds) : ""}</span>
                        {playingRecording === item.recording_sid && item.recording_sid ? <audio autoPlay className="manage-voice-history__audio" controls onEnded={() => setPlayingRecording(null)} src={`/api/manage/voice/recordings/${item.recording_sid}`} /> : null}
                      </div>;
                    })}
                  </div>
                )}
              </section>
            </div>
          )}
        </section>
      ) : null}

      {incomingCall ? (
        <section aria-label={`Incoming call from ${incomingCall.name}`} aria-modal="false" className="manage-incoming-call" role="alertdialog">
          <div className="manage-incoming-call__identity">
            <span><PhoneCall aria-hidden="true" size={22} /></span>
            <div>
              <small>Incoming Costivra call</small>
              <strong>{incomingCall.name}</strong>
              <p>{formatVoiceNumber(incomingCall.number)}</p>
            </div>
          </div>
          <div className="manage-incoming-call__actions">
            <button className="is-decline" onClick={declineIncoming} type="button"><PhoneOff aria-hidden="true" size={18} /> Decline</button>
            <button className="is-answer" onClick={answerIncoming} ref={incomingAnswerRef} type="button"><PhoneCall aria-hidden="true" size={18} /> Answer</button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function DialpadGrid({ label, onDigit }: { label: string; onDigit: (digit: string) => void }) {
  return (
    <div aria-label={label} className="manage-voice-keypad" role="group">
      {DIGITS.map(([digit, letters]) => (
        <button aria-label={`${digit}${letters ? `, ${letters}` : ""}`} key={digit} onClick={() => onDigit(digit)} type="button">
          <strong>{digit}</strong>
          <span>{letters || "\u00a0"}</span>
        </button>
      ))}
    </div>
  );
}
