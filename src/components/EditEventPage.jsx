import { useEffect, useState } from "react";

const ACCESS_OPTIONS = [
  "Step-free access",
  "Accessible bathrooms",
  "Reserved seating",
  "Tactile floor indicators",
  "Assistance staff",
  "Sign language interpreters",
  "Live speech-to-text",
  "No flashing lights",
  "None",
];

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || "";

function toImageSrc(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const origin = API_ORIGIN.replace(/\/+$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return origin ? `${origin}${path}` : path;
}

function norm(s) {
  return String(s || "").trim();
}

export default function EditEventPage({ eventId, onDone }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [existing, setExisting] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accessibility, setAccessibility] = useState([]);
  const [location, setLocation] = useState("");

  const [photos, setPhotos] = useState([]); // new File[]
  const [photoPreviews, setPhotoPreviews] = useState([]); // object URLs

  // load event
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(`/api/events/${eventId}`, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load event");
        if (!alive) return;

        const e = data.event;
        setExisting(e);

        setTitle(e.title || "");
        setDescription(e.description || "");
        setLocation(e.locationText || "");
        setAccessibility(Array.isArray(e.accessibility) ? e.accessibility : []);
      } catch (e) {
        if (!alive) return;
        setError(e.message || "Failed to load event");
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
      (photoPreviews || []).forEach((u) => {
        try {
          URL.revokeObjectURL(u);
        } catch {}
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const onPickPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    const previews = files.map((f) => URL.createObjectURL(f));

    // cleanup previous previews
    (photoPreviews || []).forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    });

    setPhotos(files);
    setPhotoPreviews(previews);
  };

  const toggleAccess = (label) => {
    setAccessibility((prev) => {
      const cur = prev || [];
      const has = cur.includes(label);

      if (label === "None") return has ? [] : ["None"];

      const next = has ? cur.filter((x) => x !== label) : [...cur, label];
      return next.filter((x) => x !== "None");
    });
  };

  const validate = () => {
    if (!norm(title)) return "Name is required.";
    if (!norm(description)) return "Description is required.";
    if (!norm(location)) return "Location is required.";
    return "";
  };

  const save = async () => {
    const msg = validate();
    if (msg) return setError(msg);

    setSaving(true);
    setError("");

    const fd = new FormData();
    fd.append("title", title);
    fd.append("description", description);
    fd.append("locationText", location);

    // match your backend controller parsing
    accessibility.forEach((a) => fd.append("accessibility", a));

    // only send photos if user picked new ones
    photos.forEach((p) => fd.append("photos", p));

    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        credentials: "include",
        body: fd,
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed to update event");

      onDone?.();
    } catch (e) {
      setError(e.message || "Failed to update event");
      setSaving(false);
      return;
    }

    setSaving(false);
  };

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.phone}>
          <div style={{ opacity: 0.7, padding: 12 }}>Loading…</div>
        </div>
      </div>
    );
  }

  const cover = photoPreviews[0] || toImageSrc(existing?.imageUrl);

  return (
    <div style={styles.page}>
      <div style={styles.phone}>
        {/* top bar (same vibe as AddEventModal) */}
        <div style={styles.topBar}>
          <button type="button" onClick={onDone} style={styles.backBtn} aria-label="Back">
            ←
          </button>
          <div style={styles.topTitle}>Edit event</div>
          <div style={{ width: 28 }} />
        </div>

        {/* image / upload (same as AddEventModal) */}
        <div style={styles.imageBlock}>
          <label style={styles.imageLabel}>
            <input
              type="file"
              accept="image/*"
              multiple
              onChange={onPickPhotos}
              style={{ display: "none" }}
            />

            <div style={styles.imageBox}>
              {cover ? (
                <img src={cover} alt="Preview" style={styles.previewImg} />
              ) : (
                <div style={styles.placeholder}>
                  <div style={styles.placeholderIcon}>▢</div>
                </div>
              )}
            </div>
          </label>
        </div>

        {/* inputs */}
        <div style={styles.inputs}>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              setError("");
            }}
            placeholder="Name"
            style={styles.input}
          />

          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              setError("");
            }}
            placeholder="Description"
            style={styles.textarea}
            rows={4}
          />
        </div>

        {/* accessibility */}
        <div style={styles.section}>
          <div style={styles.sectionTitleRow}>
            <div style={styles.sectionIcon} aria-hidden>
              ♿
            </div>
            <div style={styles.sectionTitle}>Accessibility</div>
          </div>

          <div style={styles.accessGrid}>
            {ACCESS_OPTIONS.map((opt) => {
              const checked = (accessibility || []).includes(opt);
              return (
                <label key={opt} style={styles.accessItem}>
                  <span
                    style={{
                      ...styles.checkbox,
                      ...(checked ? styles.checkboxOn : styles.checkboxOff),
                    }}
                    onClick={() => toggleAccess(opt)}
                    role="checkbox"
                    aria-checked={checked}
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") toggleAccess(opt);
                    }}
                  >
                    {checked ? "✓" : ""}
                  </span>
                  <span style={styles.accessLabel}>{opt}</span>
                </label>
              );
            })}
          </div>
        </div>

        {/* location */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Location</div>
          <input
            value={location}
            onChange={(e) => {
              setLocation(e.target.value);
              setError("");
            }}
            placeholder="Postcode"
            style={styles.locationInput}
          />
        </div>

        {/* error */}
        {error ? <div style={styles.error}>{error}</div> : null}

        {/* save */}
        <div style={styles.saveRow}>
          <button type="button" onClick={save} disabled={saving} style={styles.saveBtn}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "black",
    color: "white",
    display: "flex",
    justifyContent: "center",
    padding: 16,
    fontFamily: '"Antonio", system-ui, -apple-system, Segoe UI, Roboto, Arial',
  },
  phone: {
    width: "min(420px, 100%)",
    minHeight: "92vh",
    background: "black",
    borderRadius: 24,
    overflow: "hidden",
    position: "relative",
    padding: "14px 14px 78px",
    boxSizing: "border-box",
  },

  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  backBtn: {
    background: "transparent",
    border: "none",
    color: "white",
    fontSize: 22,
    cursor: "pointer",
    opacity: 0.9,
  },
  topTitle: {
    opacity: 0.7,
    fontSize: 14,
    letterSpacing: 0.4,
    fontFamily: '"Antonio", system-ui, -apple-system, Segoe UI, Roboto, Arial',
  },

  imageBlock: { marginTop: 6 },
  imageLabel: { display: "block", cursor: "pointer" },
  imageBox: {
    width: "100%",
    aspectRatio: "16 / 9",
    background: "rgba(255,255,255,0.85)",
    border: "1px solid rgba(255,255,255,0.12)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  previewImg: { width: "100%", height: "100%", objectFit: "cover" },
  placeholder: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "rgba(0,0,0,0.55)",
    fontSize: 40,
    userSelect: "none",
  },
  placeholderIcon: {
    border: "2px solid rgba(0,0,0,0.45)",
    padding: "18px 22px",
  },

  inputs: { marginTop: 12, display: "grid", gap: 10 },
  input: {
    width: "100%",
    height: 34,
    background: "rgba(255,255,255,0.20)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "white",
    padding: "0 10px",
    outline: "none",
    boxSizing: "border-box",
    fontFamily: '"Antonio", system-ui, -apple-system, Segoe UI, Roboto, Arial',
  },
  textarea: {
    width: "100%",
    background: "rgba(255,255,255,0.20)",
    border: "1px solid rgba(255,255,255,0.08)",
    color: "white",
    padding: 10,
    outline: "none",
    boxSizing: "border-box",
    resize: "none",
    fontFamily: '"Antonio", system-ui, -apple-system, Segoe UI, Roboto, Arial',
  },

  section: { marginTop: 18 },
  sectionTitleRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 10 },
  sectionIcon: { opacity: 0.9, fontSize: 18 },
  sectionTitle: {
    fontSize: 18,
    fontFamily: '"Anton", sans-serif',
    letterSpacing: 0.4,
  },

  accessGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "10px 14px",
    marginTop: 8,
  },
  accessItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    cursor: "pointer",
    userSelect: "none",
  },
  checkbox: {
    width: 18,
    height: 18,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    border: "1px solid rgba(255,255,255,0.35)",
    fontSize: 12,
    lineHeight: 1,
  },
  checkboxOn: { background: "rgba(255,255,255,0.10)" },
  checkboxOff: { background: "transparent" },
  accessLabel: { opacity: 0.9, fontSize: 12 },

  locationInput: {
    width: "62%",
    height: 34,
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(240, 240, 255, 0.9)",
    outline: "none",
    padding: "0 14px",
    fontSize: 14,
    boxSizing: "border-box",
  },

  error: { marginTop: 12, color: "#ff7ad9", opacity: 0.95, fontSize: 13 },

  saveRow: { marginTop: 18, display: "flex", justifyContent: "center", paddingBottom: 6 },
  saveBtn: {
    width: 160,
    height: 44,
    border: "1px solid rgba(242,0,255,0.55)",
    background: "rgba(60,60,60,0.65)",
    color: "white",
    fontFamily: '"Anton", sans-serif',
    fontSize: 26,
    letterSpacing: 0.6,
    cursor: "pointer",
  },
};