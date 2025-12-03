import { useEffect, useState, useRef } from "react";
import { auth, db } from "../src/firebase";
import { collection, addDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import jsPDF from "jspdf";

export default function Home() {
  const nav = useNavigate();

  // TEXT STATES
  const [text, setText] = useState("");
  const [interim, setInterim] = useState("");
  const [isListening, setIsListening] = useState(false);

  const recRef = useRef(null);
  const manualStopRef = useRef(false);

  // TRANSLATION
  const [targetLang, setTargetLang] = useState("Filipino");
  const [translated, setTranslated] = useState("");

  // PROFILE MENU
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    if (!auth.currentUser) nav("/");
  }, [nav]);

  // ----------------------------------------
  // 🎤 SPEECH RECOGNITION
  // ----------------------------------------
  const toggleListening = () => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!isListening) {
      if (!SpeechRecognition) {
        alert("Speech Recognition API not supported.");
        return;
      }

      manualStopRef.current = false;

      // CLEAR textarea ONLY when START pressed
      setText("");
      setInterim("");

      const recognition = new SpeechRecognition();
      recognition.lang = "en-US";
      recognition.continuous = true;
      recognition.interimResults = true;

      let silenceTimer = null;

      recognition.onresult = (e) => {
        let finalTranscript = "";
        let interimTranscript = "";

        for (let i = e.resultIndex; i < e.results.length; i++) {
          const res = e.results[i];
          const txt = res[0].transcript.trim();

          // APPEND ALL WORDS (no skipping)
          if (res.isFinal) finalTranscript += txt + " ";
          else interimTranscript += txt + " ";
        }

        // Append final text
        if (finalTranscript) setText((prev) => prev + finalTranscript);
        setInterim(interimTranscript);

        // auto-stop after 3 minutes of silence
        clearTimeout(silenceTimer);
        silenceTimer = setTimeout(() => {
          recognition.stop();
        }, 180000);
      };

      recognition.onerror = () => {};

      recognition.onend = () => {
        if (!manualStopRef.current) {
          try { recognition.start(); } catch {}
        }
      };

      recognition.start();
      recRef.current = recognition;
      setIsListening(true);

    } else {
      // STOP
      manualStopRef.current = true;
      recRef.current?.stop();
      recRef.current = null;
      setIsListening(false);

      // Only clear interim
      setInterim("");
    }
  };

  const combinedText = () => (text + " " + interim).trim();

  // ----------------------------------------
  // 💾 SAVE NOTE
  // ----------------------------------------
  const saveNote = async () => {
    const payload = combinedText();
    if (!payload) return alert("Nothing to save");

    try {
      await addDoc(collection(db, "notes"), {
        uid: auth.currentUser.uid,
        text: payload,
        created: new Date(),
      });
      alert("Note saved!");
    } catch (err) {
      alert("Save failed: " + err.message);
    }
  };

  // ----------------------------------------
  // 📝 SUMMARY
  // ----------------------------------------
  const summarize = async () => {
    const input = combinedText();
    if (!input) return alert("Nothing to summarize");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer YOUR_OPENAI_KEY",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: `Summarize this:\n${input}` }],
      }),
    });

    const data = await res.json();
    setText(data?.choices?.[0]?.message?.content || "");
    setInterim("");
  };

  // ----------------------------------------
  // 🌐 TRANSLATION
  // ----------------------------------------
  const translateAPI = async (txt, lang) => {
    if (!txt) return "";

    const langMap = {
      Filipino: "tl",
      Spanish: "es",
      French: "fr",
      German: "de",
      Japanese: "ja",
      English: "en",
    };

    const target = langMap[lang] || "en";

    try {
      const res = await fetch("https://translate.astian.org/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          q: txt,
          source: "auto",
          target,
          format: "text",
        }),
      });

      const result = await res.json();
      return result.translatedText || "";
    } catch (err) {
      console.error("Translation error:", err);
      return "";
    }
  };

  const translate = async (lang) => {
    const input = combinedText();
    if (!input) return alert("Nothing to translate");

    setTranslated("Translating...");
    const output = await translateAPI(input, lang);
    setTranslated(output || "Translation failed.");
  };

  // ----------------------------------------
  // 📄 EXPORT PDF
  // ----------------------------------------
  const exportPDF = () => {
    const payload = combinedText();
    if (!payload) return alert("Nothing to export");

    const pdf = new jsPDF();
    pdf.text(payload, 10, 10);
    pdf.save("note.pdf");
  };

  // ----------------------------------------
  // 🔓 LOGOUT
  // ----------------------------------------
  const logout = async () => {
    try {
      await auth.signOut();
      nav("/");
    } catch (err) {
      alert("Logout failed: " + err.message);
    }
  };

  // ----------------------------------------
  // UI
  // ----------------------------------------
  return (
    <div style={{ position: "relative", padding: 20 }}>
      <h1>EchoNote</h1>

      {/* PROFILE DROPDOWN */}
      <div style={{ position: "absolute", top: 10, right: 10 }}>
        <div
          onClick={() => setShowMenu(!showMenu)}
          style={{
            width: 40,
            height: 40,
            borderRadius: "50%",
            background: "#007bff",
            color: "white",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          {auth.currentUser?.email?.[0].toUpperCase()}
        </div>

        {showMenu && (
          <div
            style={{
              position: "absolute",
              marginTop: 10,
              right: 0,
              width: 150,
              background: "red",
              border: "1px solid #ccc",
              borderRadius: 6,
              boxShadow: "0px 3px 6px rgba(0,0,0,0.1)",
              zIndex: 20,
            }}
          >
            <div
              onClick={() => nav("/settings")}
              style={{
                padding: 10,
                borderBottom: "1px solid #060505ff",
                cursor: "pointer",
              }}
            >
              ⚙ Settings
            </div>

            <div
              onClick={logout}
              style={{
                padding: 10,
                color: "white",
                cursor: "pointer",
              }}
            >
              🚪 Logout
            </div>
          </div>
        )}
      </div>

      {/* CONTROL BAR */}
      <div style={{ marginBottom: 8, marginTop: 20 }}>
        <button onClick={toggleListening}>
          {isListening ? "🎤 Stop Speaking" : "🎤 Start Speaking"}
        </button>

        <label style={{ marginLeft: 12 }}>
          Language:
          <select
            value={targetLang}
            onChange={(e) => setTargetLang(e.target.value)}
            style={{ marginLeft: 6 }}
          >
            <option>Filipino</option>
            <option>Spanish</option>
            <option>French</option>
            <option>German</option>
            <option>Japanese</option>
            <option>English</option>
          </select>
        </label>
      </div>

      {/* TEXT AREA */}
      <textarea
        rows="10"
        cols="70"
        value={text + (interim ? " " + interim : "")}
        onChange={(e) => {
          if (!isListening) {   
            // Only allow editing when NOT listening
            setText(e.target.value);
            setInterim("");
          }
        }}
      />

      {/* ACTION BUTTONS */}
      <div style={{ marginTop: 8 }}>
        <button onClick={saveNote}>Save Note</button>
        <button onClick={summarize} style={{ marginLeft: 8 }}>
          Summarize
        </button>
        <button onClick={() => translate(targetLang)} style={{ marginLeft: 8 }}>
          Translate Now
        </button>
        <button onClick={exportPDF} style={{ marginLeft: 8 }}>
          Export PDF
        </button>
      </div>

      {/* TRANSLATED TEXT */}
      {translated && (
        <div style={{ marginTop: 12, padding: 8, border: "1px solid #ddd" }}>
          <strong>Translated ({targetLang}):</strong>
          <div>{translated}</div>
        </div>
      )}
    </div>
  );
}
