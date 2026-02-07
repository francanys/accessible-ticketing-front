import { useEffect, useMemo, useState } from "react";

export default function Interests({ onDoneNonHost, onDoneHost }) {
  const interests = useMemo(
    () => [
      "Music",
      "Concerts",
      "Art",
      "Fashion",
      "Film",
      "Theatre",
      "Comedy",
      "Sports",
      "Food",
      "Tech",
      "Dance",
      "Wellness",
    ],
    []
  );

  const [selected, setSelected] = useState(new Set());
  const [loadingExisting, setLoadingExisting] = useState(true);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const toggle = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  // load existing interests once
  useEffect(() => {
    const token = sessionStorage.getItem("token"); // or from state/context
    const isHost = sessionStorage.getItem("isHost") === "true";
  
    if (!token) {
      setLoadingExisting(false);
      return;
    }
  
    (async () => {
      try {
        const res = await fetch(`/api/interests`, {
          headers: { Authorization: `Bearer ${token}` },
        });
  
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load interests");
  
        const existing = Array.isArray(data.interests) ? data.interests : [];
        if (existing.length) {
          setSelected(new Set(existing));
          if (isHost) onDoneHost?.();
          else onDoneNonHost?.();
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoadingExisting(false);
      }
    })();
  }, [onDoneHost, onDoneNonHost]);
  

  const onContinue = async () => {
    const picked = Array.from(selected);
    setSaving(true);
    setError("");
    setSuccess("");

    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (!token || !userId) {
      setSaving(false);
      setError("You must be logged in to save interests.");
      return;
    }

    try {
      const res = await fetch("/api/interests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: Number(userId),
          interests: picked,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to save interests");

      setSuccess("Interests saved successfully");

      const isHost = localStorage.getItem("isHost") === "true";

      if (isHost) {
        if (typeof onDoneHost === "function") onDoneHost();
        return;
      }

      if (typeof onDoneNonHost === "function") onDoneNonHost();
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const disableContinue = selected.size === 0 || saving || loadingExisting;

  return (
    <div style={styles.page}>
      <div style={styles.content}>
        <h1 style={styles.title}>Pick your interests</h1>
        <p style={styles.subtitle}>Choose a few so we can personalise your feed.</p>

        <div style={styles.grid}>
          {interests.map((name) => {
            const isOn = selected.has(name);
            return (
              <button
                key={name}
                type="button"
                onClick={() => toggle(name)}
                style={{
                  ...styles.card,
                  ...(isOn ? styles.cardOn : styles.cardOff),
                }}
              >
                <span style={styles.cardText}>{name}</span>
              </button>
            );
          })}
        </div>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}
      </div>

      <div style={styles.footer}>
        <button
          type="button"
          onClick={onContinue}
          disabled={disableContinue}
          style={{
            ...styles.continue,
            opacity: !disableContinue ? 1 : 0.5,
            cursor: !disableContinue ? "pointer" : "not-allowed",
          }}
        >
          {loadingExisting ? "Loading..." : saving ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
}


const styles = {
  page: {
    minHeight: "100vh",
    padding: 24,
    maxWidth: 900,
    margin: "0 auto",
    background: "black",
    color: "white",
    fontFamily: '"Antonio", system-ui, -apple-system, Segoe UI, Roboto, Arial',
  },
  content: {},
  title: {
    margin: 0,
    fontSize: 34,
    letterSpacing: -0.5,
    fontFamily: '"Anton", sans-serif',
    textAlign: "center",
    marginTop: 100,
  },
  subtitle: {
    marginTop: 8,
    marginBottom: 22,
    opacity: 0.7,
    textAlign: "center",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    columnGap: 52,
    rowGap: 24,
    maxWidth: 680,
    marginInline: "auto",
    marginTop: 50,
  },
  card: {
    height: 60,
    borderRadius: 30,
    border: "1px solid #F200FF",
    background: "#323232",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "transform 120ms ease, box-shadow 120ms ease, border 120ms ease",
  },
  cardOff: {
    boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
  },
  cardOn: {
    border: "2px solid rgba(242, 0, 255, 0.5)",
    background: "rgba(242, 0, 255, 0.3)",
    boxShadow: "0 8px 24px rgba(242, 0, 255, 0.35)",
    transform: "translateY(-1px)",
  },
  cardText: {
    fontSize: 16,
    fontWeight: 600,
    color: "white",
  },
  footer: {
    marginTop: 22,
    display: "flex",
    justifyContent: "center",
  },
  continue: {
    padding: "12px 18px",
    borderRadius: 0,
    border: "1px solid #F200FF",
    background: "#323232",
    color: "white",
    fontWeight: 700,
  },
  error: {
    marginTop: 18,
    textAlign: "center",
    color: "#ff7ad9",
  },
  success: {
    marginTop: 18,
    textAlign: "center",
    color: "#9dffb0",
  },
  
};
