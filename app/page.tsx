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

/* ═══════════════════════════════════════════════════════════════════════
   MUSIC PLAYER — place your audio file as /public/music.mp3
   ═══════════════════════════════════════════════════════════════════════ */

function MusicToggle({ isPlaying, onToggle }: { isPlaying: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#9E7B9F]/30 hover:border-[#9E7B9F]/60 transition-all group"
      title={isPlaying ? "Pause music" : "Play music"}
    >
      {/* Animated bars when playing, static when paused */}
      <div className="flex items-end gap-[2px] h-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-[3px] rounded-full"
            style={{
              backgroundColor: isPlaying ? "#9E7B9F" : "rgba(158,123,159,0.3)",
              height: isPlaying ? undefined : "40%",
              animation: isPlaying ? `musicBar 0.8s ease-in-out ${i * 0.15}s infinite alternate` : "none",
            }}
          />
        ))}
      </div>
      <span className="text-[#9E7B9F]/60 text-[10px] uppercase tracking-wider">
        {isPlaying ? "♫" : "♪"}
      </span>
    </button>
  );
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

  // Music state
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const hasUnmutedRef = useRef(false);

  // Initialize audio — start muted to bypass autoplay restrictions
  useEffect(() => {
    const audio = new Audio("/music.mp3");
    audio.loop = true;
    audio.volume = 0.4;
    audioRef.current = audio;

    // Try autoplay with sound first
    audio.play()
      .then(() => {
        setIsPlaying(true);
        hasUnmutedRef.current = true;
      })
      .catch(() => {
        // Browser blocked it — start muted, unmute on first interaction
        audio.muted = true;
        audio.play().catch(() => {}); // muted autoplay usually works

        const unmute = () => {
          if (!hasUnmutedRef.current && audioRef.current) {
            audioRef.current.muted = false;
            audioRef.current.play()
              .then(() => {
                setIsPlaying(true);
                hasUnmutedRef.current = true;
              })
              .catch(() => {});
          }
          document.removeEventListener("click", unmute);
          document.removeEventListener("touchstart", unmute);
          document.removeEventListener("keydown", unmute);
        };

        document.addEventListener("click", unmute);
        document.addEventListener("touchstart", unmute);
        document.addEventListener("keydown", unmute);
      });

    return () => {
      audio.pause();
      audio.src = "";
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

    // Try Discord bot avatars if usernames provided
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

    const element = cardRef.current;
    const originalTransform = element.style.transform;

    try {
      element.style.transform = "none";

      const dataUrl = await toJpeg(element, {
        pixelRatio: 3,
        quality: 1,
        width: 540,
        height: 540,
      });

      element.style.transform = originalTransform;

      const link = document.createElement("a");
      link.download = `valentine-seismic-${cardData?.receiverName || "card"}.jpg`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      element.style.transform = originalTransform;
      console.error("Failed to generate image:", err);
    }
  }, [cardData, cardRef]);

  return (
    <main className="min-h-screen bg-[#1a0e1e] flex items-center justify-center p-4">
      <div className="fixed inset-0 opacity-[0.03] pointer-events-none"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)' opacity='1'/%3E%3C/svg%3E")` }} />
      {step === "form" ? (
        <FormStep
          senderUsername={senderUsername} setSenderUsername={setSenderUsername}
          senderName={senderName} setSenderName={setSenderName}
          receiverUsername={receiverUsername} setReceiverUsername={setReceiverUsername}
          receiverName={receiverName} setReceiverName={setReceiverName}
          message={message} setMessage={setMessage}
          onGenerate={handleGenerate} loading={loading}
          isPlaying={isPlaying} onToggleMusic={toggleMusic}
        />
      ) : (
        <CardStep cardData={cardData!} cardRef={cardRef} onDownload={handleDownload} onBack={() => setStep("form")}
          isPlaying={isPlaying} onToggleMusic={toggleMusic} />
      )}
    </main>
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
  isPlaying, onToggleMusic,
}: {
  senderUsername: string; setSenderUsername: (v: string) => void;
  senderName: string; setSenderName: (v: string) => void;
  receiverUsername: string; setReceiverUsername: (v: string) => void;
  receiverName: string; setReceiverName: (v: string) => void;
  message: string; setMessage: (v: string) => void;
  onGenerate: () => void; loading: boolean;
  isPlaying: boolean; onToggleMusic: () => void;
}) {
  const isValid = senderName.trim() && receiverName.trim();

  return (
    <div className="w-full max-w-xl relative z-10 animate-fadeIn">
      <div className="text-center mb-8">
        <p className="text-[#9E7B9F] uppercase tracking-[0.3em] text-xs font-medium mb-2">Seismic Community</p>
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2" style={{ fontFamily: "'Playfair Display', serif" }}>
          Valentine&apos;s Card
        </h1>
        <p className="text-[#9E7B9F]/60 text-sm mb-3">Send love to your favorite Seismic fren</p>
        <MusicToggle isPlaying={isPlaying} onToggle={onToggleMusic} />
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
   CARD — Uses /envelope.jpg as background image
   ═══════════════════════════════════════════════════════════════════════ */

function getMessageFontSize(message: string): number {
  const len = message.length;
  if (len <= 40) return 24;
  if (len <= 80) return 20;
  if (len <= 120) return 18;
  if (len <= 160) return 16;
  return 14;
}

function CardStep({
  cardData, cardRef, onDownload, onBack,
  isPlaying, onToggleMusic,
}: {
  cardData: CardData;
  cardRef: React.RefObject<HTMLDivElement | null>;
  onDownload: () => void;
  onBack: () => void;
  isPlaying: boolean;
  onToggleMusic: () => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const messageFontSize = getMessageFontSize(cardData.message);

  // Scale the fixed 540px card to fit the container width
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const scale = Math.min(containerWidth / 540, 1);
        containerRef.current.style.setProperty("--card-scale", String(scale));
      }
    };
    updateScale();
    window.addEventListener("resize", updateScale);
    return () => window.removeEventListener("resize", updateScale);
  }, []);

  return (
    <div className="w-full max-w-lg relative z-10 flex flex-col items-center gap-6 animate-fadeIn">
      {/* Music toggle on card view */}
      <MusicToggle isPlaying={isPlaying} onToggle={onToggleMusic} />
      {/* Responsive wrapper — scales the fixed-size card to fit screen */}
      <div
        ref={containerRef}
        style={{
          width: "100%",
          maxWidth: 540,
          aspectRatio: "1 / 1",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* The actual card — always 540x540, scaled via CSS transform on mobile */}
        <div
          ref={cardRef}
          style={{
            width: 540,
            height: 540,
            position: "absolute",
            top: 0,
            left: 0,
            transformOrigin: "top left",
            transform: "scale(var(--card-scale, 1))",
            overflow: "hidden",
          }}
        >
        {/* Envelope background image */}
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

        {/* ── VALENTINE BRANDING (top-right area) ── */}
        <div style={{
          position: "absolute",
          top: "3%",
          right: "5%",
          textAlign: "right",
          zIndex: 5,
        }}>
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 10,
            color: "rgba(109,76,111,0.5)",
            textTransform: "uppercase",
            letterSpacing: "0.2em",
          }}>
            Happy Valentine&apos;s Day
          </p>
          <p style={{
            fontFamily: "'Caveat', cursive",
            fontSize: 8,
            color: "rgba(109,76,111,0.35)",
            marginTop: 1,
          }}>
            Seismic Community 2026
          </p>
        </div>

        {/* ── LETTER AREA: Receiver + Message ── */}
        <div style={{
          position: "absolute",
          top: "20%",
          left: "21%",
          right: "12%",
          height: "28%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          padding: "8px 16px",
        }}>
          {/* Dear Name with avatar */}
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 10,
          }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: "2px solid rgba(158,123,159,0.4)",
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
              fontSize: 20,
              color: "#3a2040",
              fontWeight: 700,
              lineHeight: 1.1,
            }}>
              Dear {capitalize(cardData.receiverName)},
            </p>
          </div>

          {/* Message */}
          <p style={{
            fontFamily: "'Caveat', cursive",
            fontSize: messageFontSize,
            color: "#3a2040",
            lineHeight: 1.55,
            paddingLeft: 4,
            width: "80%",
          }}>
            {cardData.message}
          </p>
        </div>

        {/* ── ENVELOPE AREA: Sender info ── */}
        <div style={{
          position: "absolute",
          top: "70%",
          left: "70%",
          transform: "translateX(-50%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
        }}>
          <div style={{
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: "2.5px solid rgba(255,255,255,0.6)",
            overflow: "hidden",
            backgroundColor: "rgba(158,123,159,0.1)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.12)",
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
            fontSize: 18,
            color: "#5a3050",
            fontWeight: 700,
          }}>
            With love, {capitalize(cardData.senderName)} ♥
          </p>
        </div>

        {/* ── BOTTOM BRANDING ── */}
        <div style={{
          position: "absolute",
          bottom: "3%",
          left: 0,
          right: 0,
          textAlign: "center",
        }}>
          <p style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 9,
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