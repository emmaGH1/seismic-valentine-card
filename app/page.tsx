"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { toJpeg } from "html-to-image";

interface CardData {
  senderUsername: string;
  senderName: string;
  receiverUsername: string;
  receiverName: string;
  message: string;
  senderAvatar: string | null;
  receiverAvatar: string | null;
}

function getFallbackAvatar(seed: string): string {
  return `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(seed)}&backgroundColor=9E7B9F`;
}

function capitalize(name: string): string {
  return name
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function ValentineCardPage() {
  const [step, setStep] = useState<"form" | "card">("form");
  const [senderUsername, setSenderUsername] = useState("");
  const [senderName, setSenderName] = useState("");
  const [receiverUsername, setReceiverUsername] = useState("");
  const [receiverName, setReceiverName] = useState("");
  const [message, setMessage] = useState(
    "I just wanted to let you know I appreciate you & I believe in you. You are doing so so well. Keep going!"
  );
  const [cardData, setCardData] = useState<CardData | null>(null);
  const [loading, setLoading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  // Music
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const musicStartedRef = useRef(false);

  useEffect(() => {
    // Try autoplay on load (works on desktop usually)
    const audio = new Audio("/music.mp3");
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;

    audio.play()
      .then(() => { setIsPlaying(true); musicStartedRef.current = true; })
      .catch(() => {}); // blocked, we'll try on interaction

    // On first interaction, start music if it hasn't started yet
    // iOS requires audio.play() in the SAME call stack as user gesture
    const playOnInteraction = () => {
      if (musicStartedRef.current) return cleanup();
      if (audioRef.current) {
        audioRef.current.play()
          .then(() => { setIsPlaying(true); musicStartedRef.current = true; })
          .catch(() => {});
      }
      cleanup();
    };

    const cleanup = () => {
      document.removeEventListener("click", playOnInteraction, true);
      document.removeEventListener("touchend", playOnInteraction, true);
    };

    document.addEventListener("click", playOnInteraction, true);
    document.addEventListener("touchend", playOnInteraction, true);

    return () => {
      audio.pause();
      audio.src = "";
      cleanup();
    };
  }, []);

  const toggleMusic = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  };

  const handleGenerate = async () => {
    if (!senderName.trim() || !receiverName.trim()) return;
    setLoading(true);

    let senderAvatar: string | null = null;
    let receiverAvatar: string | null = null;

    if (senderUsername.trim()) {
      try {
        const res = await fetch(`/api/discord-avatar?username=${encodeURIComponent(senderUsername.trim())}`);
        if (res.ok) { const data = await res.json(); senderAvatar = data.avatarUrl; }
      } catch { /* fallback */ }
    }
    if (receiverUsername.trim()) {
      try {
        const res = await fetch(`/api/discord-avatar?username=${encodeURIComponent(receiverUsername.trim())}`);
        if (res.ok) { const data = await res.json(); receiverAvatar = data.avatarUrl; }
      } catch { /* fallback */ }
    }

    setCardData({
      senderUsername: senderUsername.trim(),
      senderName: senderName.trim(),
      receiverUsername: receiverUsername.trim(),
      receiverName: receiverName.trim(),
      message: message.trim(),
      senderAvatar: senderAvatar || getFallbackAvatar(senderUsername.trim() || senderName.trim()),
      receiverAvatar: receiverAvatar || getFallbackAvatar(receiverUsername.trim() || receiverName.trim()),
    });
    setStep("card");
    setLoading(false);
  };

  const handleDownload = useCallback(async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toJpeg(cardRef.current, { pixelRatio: 2, quality: 0.92 });
      const link = document.createElement("a");
      link.download = `valentine-seismic-${cardData?.receiverName || "card"}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error("Download failed:", err);
    }
  }, [cardData]);

  return (
    <main className="min-h-screen bg-[#1a0e1e] flex items-center justify-center p-4">
      <MusicToggle isPlaying={isPlaying} onToggle={toggleMusic} />
      {step === "form" ? (
        <FormStep
          senderUsername={senderUsername} setSenderUsername={setSenderUsername}
          senderName={senderName} setSenderName={setSenderName}
          receiverUsername={receiverUsername} setReceiverUsername={setReceiverUsername}
          receiverName={receiverName} setReceiverName={setReceiverName}
          message={message} setMessage={setMessage}
          onGenerate={handleGenerate} loading={loading}
        />
      ) : (
        <CardStep
          cardData={cardData!} cardRef={cardRef}
          onDownload={handleDownload} onBack={() => setStep("form")}
        />
      )}
    </main>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   MUSIC TOGGLE
   ═══════════════════════════════════════════════════════════════════════ */

function MusicToggle({ isPlaying, onToggle }: { isPlaying: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="fixed top-4 right-4 z-50 w-8 h-8 flex items-center justify-center rounded-full bg-[#6D4C6F]/40 hover:bg-[#6D4C6F]/60 transition-all"
      title={isPlaying ? "Mute" : "Unmute"}
    >
      {isPlaying ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="white">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="rgba(255,255,255,0.5)">
          <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
        </svg>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   FORM
   ═══════════════════════════════════════════════════════════════════════ */

function FormStep({
  senderUsername, setSenderUsername,
  senderName, setSenderName,
  receiverUsername, setReceiverUsername,
  receiverName, setReceiverName,
  message, setMessage,
  onGenerate, loading,
}: {
  senderUsername: string; setSenderUsername: (v: string) => void;
  senderName: string; setSenderName: (v: string) => void;
  receiverUsername: string; setReceiverUsername: (v: string) => void;
  receiverName: string; setReceiverName: (v: string) => void;
  message: string; setMessage: (v: string) => void;
  onGenerate: () => void; loading: boolean;
}) {
  const isValid = senderName.trim() && receiverName.trim();

  return (
    <div className="w-full max-w-xl relative z-10 animate-fadeIn">
      <div className="text-center mb-8">
        <p className="text-[#9E7B9F] uppercase tracking-[0.3em] text-xs font-medium mb-2">Seismic Community</p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          Valentine&apos;s Card
        </h1>
        <p className="text-[#9E7B9F]/60 text-sm">Send love to your favorite Seismic fren</p>
      </div>

      <div className="relative bg-[#f5ede8] rounded-sm shadow-2xl overflow-hidden">
        <div className="absolute inset-3 border-2 border-dashed border-[#6D4C6F]/30 rounded-sm pointer-events-none" />

        {/* Stamp */}
        <div className="absolute top-6 right-6 w-16 h-20 bg-[#6D4C6F] rounded-sm flex items-center justify-center shadow-md z-10">
          <div className="w-12 h-16 border-2 border-dashed border-[#9E7B9F]/50 rounded-sm flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-[#f5ede8]">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="currentColor" />
            </svg>
          </div>
        </div>

        <div className="p-8 md:p-10 space-y-5">
          {/* To */}
          <div>
            <label className="block text-[#6D4C6F] text-sm font-semibold mb-3 uppercase tracking-wider" style={{ fontFamily: "'Playfair Display', serif" }}>To</label>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={receiverName} onChange={(e) => setReceiverName(e.target.value)} placeholder="Their name"
                className="w-full bg-transparent border-b-2 border-[#6D4C6F]/30 focus:border-[#6D4C6F] text-[#3a2040] placeholder-[#9E7B9F]/40 py-2 px-1 outline-none transition-colors text-lg"
                style={{ fontFamily: "'Caveat', cursive" }} />
              <input type="text" value={receiverUsername} onChange={(e) => setReceiverUsername(e.target.value)} placeholder="Discord username (optional)"
                className="w-full bg-transparent border-b-2 border-[#6D4C6F]/30 focus:border-[#6D4C6F] text-[#3a2040] placeholder-[#9E7B9F]/40 py-2 px-1 outline-none transition-colors text-sm"
                style={{ fontFamily: "'Caveat', cursive" }} />
            </div>
          </div>

          {/* From */}
          <div>
            <label className="block text-[#6D4C6F] text-sm font-semibold mb-3 uppercase tracking-wider" style={{ fontFamily: "'Playfair Display', serif" }}>From</label>
            <div className="grid grid-cols-2 gap-3">
              <input type="text" value={senderName} onChange={(e) => setSenderName(e.target.value)} placeholder="Your name"
                className="w-full bg-transparent border-b-2 border-[#6D4C6F]/30 focus:border-[#6D4C6F] text-[#3a2040] placeholder-[#9E7B9F]/40 py-2 px-1 outline-none transition-colors text-lg"
                style={{ fontFamily: "'Caveat', cursive" }} />
              <input type="text" value={senderUsername} onChange={(e) => setSenderUsername(e.target.value)} placeholder="Discord username (optional)"
                className="w-full bg-transparent border-b-2 border-[#6D4C6F]/30 focus:border-[#6D4C6F] text-[#3a2040] placeholder-[#9E7B9F]/40 py-2 px-1 outline-none transition-colors text-sm"
                style={{ fontFamily: "'Caveat', cursive" }} />
            </div>
          </div>

          {/* Message */}
          <div>
            <label className="block text-[#6D4C6F] text-sm font-semibold mb-3 uppercase tracking-wider" style={{ fontFamily: "'Playfair Display', serif" }}>Your Message</label>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} rows={4} maxLength={200}
              className="w-full bg-transparent border-b-2 border-[#6D4C6F]/30 focus:border-[#6D4C6F] text-[#3a2040] placeholder-[#9E7B9F]/40 py-2 px-1 outline-none transition-colors text-lg resize-none"
              style={{ fontFamily: "'Caveat', cursive", lineHeight: "1.8", backgroundImage: "repeating-linear-gradient(transparent, transparent 2.05em, rgba(109,76,111,0.15) 2.05em, rgba(109,76,111,0.15) 2.1em)" }} />
            <p className="text-right text-[#9E7B9F]/40 text-xs mt-1">{message.length}/200</p>
          </div>

          <button onClick={onGenerate} disabled={loading || !isValid}
            className="w-full py-4 bg-[#6D4C6F] hover:bg-[#5a3d5c] disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-sm font-semibold text-lg transition-all duration-300 shadow-lg hover:shadow-xl active:scale-[0.98]"
            style={{ fontFamily: "'Playfair Display', serif" }}>
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Generating...
              </span>
            ) : "Generate Card ♥"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════
   CARD — Fully fluid, no CSS transform. Scales naturally on all screens.
   ═══════════════════════════════════════════════════════════════════════ */

function CardStep({
  cardData, cardRef, onDownload, onBack,
}: {
  cardData: CardData;
  cardRef: React.RefObject<HTMLDivElement | null>;
  onDownload: () => void;
  onBack: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  // Calculate scale factor: how big is our container vs the ideal 540px
  useEffect(() => {
    const update = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        setScale(Math.min(w / 540, 1));
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  // Helper: scale pixel values relative to 540px base
  const s = (px: number) => Math.round(px * scale);

  const msgLen = cardData.message.length;
  const baseMsgFont = msgLen <= 40 ? 24 : msgLen <= 80 ? 20 : msgLen <= 120 ? 18 : msgLen <= 160 ? 16 : 14;

  return (
    <div className="w-full max-w-lg relative z-10 flex flex-col items-center gap-4 animate-fadeIn">
      {/* Card container — fluid, square */}
      <div
        ref={containerRef}
        style={{ width: "100%", maxWidth: 540 }}
      >
        <div
          ref={cardRef}
          style={{
            width: "100%",
            aspectRatio: "1 / 1",
            position: "relative",
            overflow: "hidden",
            backgroundColor: "#f5ddd1",
          }}
        >
          {/* Envelope background */}
          <img
            src="/envelope.jpg"
            alt=""
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            crossOrigin="anonymous"
          />

          {/* Valentine branding */}
          <div style={{
            position: "absolute",
            top: "3%",
            right: "5%",
            textAlign: "right",
            zIndex: 5,
          }}>
            <p style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: s(10),
              color: "rgba(109,76,111,0.5)",
              textTransform: "uppercase",
              letterSpacing: "0.2em",
            }}>
              Happy Valentine&apos;s Day
            </p>
            <p style={{
              fontFamily: "'Caveat', cursive",
              fontSize: s(8),
              color: "rgba(109,76,111,0.35)",
              marginTop: 1,
            }}>
              Seismic Community 2026
            </p>
          </div>

          {/* Letter area: Receiver + Message */}
          <div style={{
            position: "absolute",
            top: "20%",
            left: "21%",
            right: "12%",
            height: "28%",
            display: "flex",
            flexDirection: "column",
            justifyContent: "flex-start",
            padding: `${s(8)}px ${s(16)}px`,
          }}>
            <div style={{
              display: "flex",
              alignItems: "center",
              gap: s(8),
              marginBottom: s(10),
            }}>
              <div style={{
                width: s(32),
                height: s(32),
                borderRadius: "50%",
                border: `${s(2)}px solid rgba(158,123,159,0.4)`,
                overflow: "hidden",
                backgroundColor: "rgba(158,123,159,0.08)",
                flexShrink: 0,
              }}>
                <img
                  src={cardData.receiverAvatar || ""}
                  alt={cardData.receiverName}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  crossOrigin="anonymous"
                />
              </div>
              <p style={{
                fontFamily: "'Caveat', cursive",
                fontSize: s(20),
                color: "#3a2040",
                fontWeight: 700,
                lineHeight: 1.1,
              }}>
                Dear {capitalize(cardData.receiverName)},
              </p>
            </div>

            <p style={{
              fontFamily: "'Caveat', cursive",
              fontSize: s(baseMsgFont),
              color: "#3a2040",
              lineHeight: 1.55,
              paddingLeft: s(4),
              width: "80%",
            }}>
              {cardData.message}
            </p>
          </div>

          {/* Sender info */}
          <div style={{
            position: "absolute",
            top: "70%",
            left: "70%",
            transform: "translateX(-50%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: s(4),
          }}>
            <div style={{
              width: s(44),
              height: s(44),
              borderRadius: "50%",
              border: `${s(2.5)}px solid rgba(255,255,255,0.6)`,
              overflow: "hidden",
              backgroundColor: "rgba(158,123,159,0.1)",
              boxShadow: `0 ${s(2)}px ${s(10)}px rgba(0,0,0,0.12)`,
            }}>
              <img
                src={cardData.senderAvatar || ""}
                alt={cardData.senderName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
                crossOrigin="anonymous"
              />
            </div>
            <p style={{
              fontFamily: "'Caveat', cursive",
              fontSize: s(18),
              color: "#5a3050",
              fontWeight: 700,
              whiteSpace: "nowrap",
            }}>
              With love, {capitalize(cardData.senderName)} ♥
            </p>
          </div>

          {/* Bottom branding */}
          <div style={{
            position: "absolute",
            bottom: "3%",
            left: 0,
            right: 0,
            textAlign: "center",
          }}>
            <p style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: s(9),
              color: "rgba(109,76,111,0.35)",
              letterSpacing: "0.25em",
              textTransform: "uppercase",
            }}>
              ♥ Would You Be My Valentine? ♥
            </p>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-3 w-full">
        <button onClick={onBack}
          className="flex-1 py-3 border-2 border-[#9E7B9F]/30 text-[#9E7B9F] rounded-sm font-medium hover:bg-[#9E7B9F]/10 transition-all"
          style={{ fontFamily: "'Playfair Display', serif" }}>
          ← Edit
        </button>
        <button onClick={onDownload}
          className="flex-[2] py-3 bg-[#6D4C6F] hover:bg-[#5a3d5c] text-white rounded-sm font-semibold transition-all shadow-lg hover:shadow-xl active:scale-[0.98]"
          style={{ fontFamily: "'Playfair Display', serif" }}>
          Download for 𝕏
        </button>
      </div>
    </div>
  );
}