import { useEffect, useMemo, useState } from "react";

export default function Accessibility({ onDone }) {
  const options = useMemo(
    () => [
      "Step-free access",
      "Accessible Bathrooms",
      "Reserved seating",
      "Tactile floor indicators",
      "Assistance staff",
      "Interpreters",
      "Live speech-to-text",
      "No flashing lights",
      "None",
    ],
    []
  );


  const [selected, setSelected] = useState(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
  
    if (!token || !userId) return;
  
    (async () => {
      try {
        const res = await fetch(`/api/accessibility`, { headers: { Authorization: `Bearer ${token}` } })

  
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load accessibility");
  
        const existing = Array.isArray(data.accessibility) ? data.accessibility : [];
  
        if (existing.length) {
          setSelected(new Set(existing));
          if (typeof onDone === "function") onDone(); //auto skip
        }
      } catch (e) {
        console.error(e);
      }
    })();
  }, [onDone]);

  
  const toggle = (name) => {
    setSelected((prev) => {
      const next = new Set(prev);

      // If "None" is chosen, clear everything else
      if (name === "None") {
        if (next.has("None")) next.delete("None");
        else {
          next.clear();
          next.add("None");
        }
        return next;
      }

      // If choosing any other option, remove "None"
      next.delete("None");
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const onContinue = async () => {
    const picked = Array.from(selected);
    setSaving(true);
    setError("");
    setSuccess("");

    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");

    if (!token || !userId) {
      setSaving(false);
      setError("You must be logged in to save accessibility preferences.");
      return;
    }

    try {
      const res = await fetch("/api/accessibility", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: Number(userId),
          accessibility: picked,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "Failed to save accessibility preferences");
      }

      setSuccess("Accessibility saved successfully ✨");

      // Let parent decide where to go next
      if (typeof onDone === "function") onDone();
    } catch (e) {
      setError(e.message || "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.page}>
      <div style={styles.content}>
        <h1 style={styles.title}>Accessibility</h1>
        <p style={styles.subtitle}>
          Choose what you need so we can show suitable events.
        </p>

        <div style={styles.grid}>
          {options.map((name) => {
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
          disabled={selected.size === 0 || saving}
          style={{
            ...styles.continue,
            opacity: selected.size && !saving ? 1 : 0.5,
            cursor: selected.size && !saving ? "pointer" : "not-allowed",
          }}
        >
          {saving ? "Saving..." : "Continue"}
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
