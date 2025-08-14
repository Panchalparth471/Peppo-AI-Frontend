import { useState, useRef, useEffect } from "react";
import Svg from "./Svg";

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [videoUrl, setVideoUrl] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [isMock, setIsMock] = useState(false);
  const messagesEndRef = useRef(null);
  const abortRef = useRef(null);

  // read API base from env (CRA: REACT_APP_API_BASE_URL). Trim trailing slash.
  const rawApiBase = process.env.REACT_APP_API_BASE_URL || "";
  const API_BASE = rawApiBase ? rawApiBase.replace(/\/+$/, "") : "";

  // helper to build full API URL (falls back to relative if API_BASE is empty)
  const apiUrl = (path) => `${API_BASE}${path.startsWith("/") ? "" : "/"}${path}`;

  // scroll to bottom helper
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, videoUrl]);

  // create a session on mount
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(apiUrl("/api/session"), { method: "POST" });
        if (!res.ok) {
          console.warn("Failed to create session:", await res.text());
          return;
        }
        const data = await res.json();
        if (mounted && data.session_id) setSessionId(data.session_id);
      } catch (err) {
        console.warn("Session creation error:", err);
      }
    })();

    return () => {
      mounted = false;
      // abort any inflight request on unmount
      if (abortRef.current) abortRef.current.abort();
      // revoke any object urls
      if (videoUrl) URL.revokeObjectURL(videoUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addMessage = (msg) => setMessages((m) => [...m, msg]);

  const sendMessageFromSuggestion = (message) => {
    setInput(message);
    sendMessage(message);
  };

  // main action: send prompt to backend, receive video blob
  const sendMessage = async (manualInput) => {
    const prompt = manualInput ?? input;
    if (!prompt || prompt.trim() === "") return;

    // add user message
    addMessage({ text: prompt, sender: "user", ts: Date.now() });
    setInput("");
    setLoading(true);

    // abort controller for this request
    const ac = new AbortController();
    abortRef.current = ac;

    try {
      // ensure we have a session id (fallback: create one synchronously)
      let sid = sessionId;
      if (!sid) {
        try {
          // create a session via /api/session
          const sRes = await fetch(apiUrl("/api/session"), { method: "POST" });
          if (sRes.ok) {
            const sData = await sRes.json();
            sid = sData.session_id;
            setSessionId(sid);
          }
        } catch (e) {
          console.warn("Could not create session on demand:", e);
        }
      }

      // POST prompt to backend with session id
      const res = await fetch(apiUrl("/api/generate-video"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, session_id: sid }),
        signal: ac.signal,
      });

      // update session id from response header if server returned a fresh one
      const respSession = res.headers.get("X-Session-Id");
      if (respSession) {
        setSessionId(respSession);
      }

      // check for backend errors that return JSON (or text)
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        // attempt to parse error body
        if (contentType.includes("application/json")) {
          const j = await res.json();
          addMessage({ text: `Failed to generate video: ${j.error || JSON.stringify(j)}`, sender: "bot" });
        } else {
          const txt = await res.text();
          addMessage({ text: `Failed to generate video: ${txt}`, sender: "bot" });
        }
        setLoading(false);
        return;
      }

      // If server returned JSON even with 200 (some backends might), treat as message
      if (contentType.includes("application/json")) {
        const j = await res.json();
        addMessage({ text: "Server response: " + (j.message || JSON.stringify(j)), sender: "bot" });
        setLoading(false);
        return;
      }

      // Otherwise assume it's a video blob
      const blob = await res.blob();

      // create object URL and store
      const url = URL.createObjectURL(blob);

      // read mock header if present — use local variable so message text is accurate
      const mockHeader = res.headers.get("X-Video-Mock");
      const wasMock = mockHeader === "true";
      setIsMock(wasMock); // update state for UI if needed

      // revoke previous videoUrl to avoid leaks
      if (videoUrl) {
        try {
          URL.revokeObjectURL(videoUrl);
        } catch (e) {
          // ignore
        }
      }

      setVideoUrl(url);

      // add bot message that contains video — use 'wasMock' not the state variable immediately
      addMessage({
        text: wasMock ? "Generated (mock) video" : "Generated video",
        sender: "bot",
        videoUrl: url,
        ts: Date.now(),
      });
    } catch (e) {
      if (e.name === "AbortError") {
        addMessage({ text: "Generation aborted.", sender: "bot" });
      } else {
        console.error("Network/generation error:", e);
        addMessage({ text: "Network error while generating video.", sender: "bot" });
      }
    } finally {
      setLoading(false);
      abortRef.current = null;
    }
  };

  const handleRefresh = () => {
    // simple page reset UX
    // revoke object URLs
    messages.forEach((m) => {
      if (m.videoUrl) {
        try {
          URL.revokeObjectURL(m.videoUrl);
        } catch (e) {
          /* ignore */
        }
      }
    });
    if (videoUrl) {
      try {
        URL.revokeObjectURL(videoUrl);
      } catch (e) {}
    }
    setMessages([]);
    setVideoUrl(null);
    setIsMock(false);
  };

  // small spinner element reused in two places
  const SmallSpinner = ({ size = 18 }) => (
    <svg
      className="animate-spin"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: "inline-block", verticalAlign: "middle" }}
    >
      <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.15)" strokeWidth="4" />
      <path d="M22 12a10 10 0 00-10-10" stroke="white" strokeWidth="4" strokeLinecap="round" />
    </svg>
  );

  return (
    <div className="w-full h-screen flex">
      <div className="w-full h-screen flex flex-col bg-gradient items-center p-7 justify-between ">
        <div onClick={handleRefresh} className="w-[80%] flex justify-end cursor-pointer">
          <svg width="25" height="27" viewBox="0 0 25 27" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4.05 20.634V18.042H20.736V20.634H4.05Z" fill="white" />
          </svg>
        </div>

        <div className="flex items-center mt-16 flex-col w-full h-1/4 gap-10">
          <div>
            <svg width="61" height="64" viewBox="0 0 61 64" fill="none" xmlns="http://www.w3.org/2000/svg"></svg>
          </div>
          <div className="text-white text-[24px]">Ask our AI Anything</div>
        </div>

        <div className="flex flex-col w-full px-[20%]">
          {messages.length === 0 ? (
            <>
              <div className="text-white text-[14px] mb-4">Suggestions on what to ask our AI</div>
              <div
                className="flex border text-[14px] border-white/20 text-white items-center p-5 bg-white/10 mb-2 rounded-md cursor-pointer"
                onClick={() => sendMessageFromSuggestion("A dramatic ocean sunset with whales breaching, 5s cinematic shot")}
              >
                A dramatic ocean sunset with whales breaching, 5s cinematic shot
              </div>
              <div
                className="flex border text-[14px] border-white/20 text-white items-center p-5 bg-white/10 mb-2 rounded-md cursor-pointer"
                onClick={() => sendMessageFromSuggestion("A futuristic cityscape at night with neon lights, 7s fly-through")}
              >
                A futuristic cityscape at night with neon lights, 7s fly-through
              </div>
              <div
                className="flex border text-[14px] border-white/20 text-white items-center p-5 bg-white/10 mb-2 rounded-md cursor-pointer"
                onClick={() => sendMessageFromSuggestion("A calm forest with falling leaves and soft sunlight, 6s")}
              >
                A calm forest with falling leaves and soft sunlight, 6s
              </div>
            </>
          ) : (
            <div className="text-white text-[14px] no-scrollbar mb-4 h-80 overflow-y-auto flex flex-col gap-2 relative">
              {messages.map((msg, index) => {
                const isLastUserMsg = index === messages.length - 1 && msg.sender === "user";
                return (
                  <div key={index}>
                    {msg.sender === "user" ? (
                      <div className="text-[11px] text-white/50 text-right mb-1">ME</div>
                    ) : (
                      <div className="mb-1">
                        <Svg />
                      </div>
                    )}

                    {/* FIX: removed fixed small height (h-2) so content can expand.
                        Use max-width and break-words so bubble grows with content and the video sits below the text. */}
                    <div
                      className={`flex flex-col justify-center text-[14px] border border-white/20 text-white p-5 bg-white/10 mb-2 rounded-md max-w-[70%] break-words ${
                        msg.sender === "user" ? "ml-auto" : "mr-auto"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <div>{msg.text}</div>
                        {/* show small spinner next to the most recent user message while loading */}
                        {isLastUserMsg && loading && (
                          <div title="Generating..." className="ml-2">
                            <SmallSpinner size={14} />
                          </div>
                        )}
                      </div>

                      {/* Video now sits neatly below the text */}
                      {msg.videoUrl && (
                        <div className="mt-3">
                          <video
                            controls
                            width={320}
                            src={msg.videoUrl}
                            className="rounded-md shadow-md"
                            style={{ display: "block" }}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}

          <div className="bg-white flex mt-9 items-center justify-between p-3 rounded-md">
            <div className="w-[90%]">
              <input
                type="text"
                className="outline-none w-full placeholder-[#303030]"
                placeholder="Ask me about anything about your projects or request a short video (5-10s)"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                disabled={loading}
              />
            </div>

            {/* Send button + small spinner indicator */}
            <div className="flex items-center gap-3">
              <div onClick={() => sendMessage()} className={`cursor-pointer px-4 py-2 rounded-md ${loading ? "opacity-60 pointer-events-none" : ""}`} style={{ background: "#111827", color: "white" }}>
                Send
              </div>

              {/* small spinner shown while loading */}
              {loading && (
                <div className="flex items-center" title="Generating video">
                  <SmallSpinner size={18} />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Chat;
