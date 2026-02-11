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
function toDateInput(v) {
    if (!v) return "";
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return "";
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }
  
  function toTimeInput(v) {
    if (!v) return "";
    // "22:00:00" -> "22:00"
    if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v.slice(0, 5);
    return v; // already "HH:MM"
  }
  
export default function EditEventPage({ eventId, onDone }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [existing, setExisting] = useState(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [accessibility, setAccessibility] = useState([]);

  const [eventDate, setEventDate] = useState("");
  const [eventTime, setEventTime] = useState("");

  const [location, setLocation] = useState("");
  const [locationQuery, setLocationQuery] = useState("");
  const [locationResults, setLocationResults] = useState([]);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationOpen, setLocationOpen] = useState(false);

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
        setAccessibility(Array.isArray(e.accessibility) ? e.accessibility : []);

        //date/time from backend
        setEventDate(toDateInput(e.eventDate));
        setEventTime(toTimeInput(e.eventTime));        

        //location + query prefill
        const loc = e.locationText || "";
        setLocation(loc);
        setLocationQuery(loc);
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

  // ✅ location search (same logic as AddEventModal)
  const fetchLocations = async (q) => {
    const query = norm(q);
    if (query.length < 3) {
      setLocationResults([]);
      setLocationOpen(false);
      return;
    }

    setLocationLoading(true);

    try {
      const url =
        `https://nominatim.openstreetmap.org/search?` +
        new URLSearchParams({
          q: query,
          format: "json",
          addressdetails: "1",
          limit: "6",
          countrycodes: "gb",
        }).toString();

      const res = await fetch(url, { headers: { Accept: "application/json" } });
      const data = await res.json().catch(() => []);
      const results = Array.isArray(data)
        ? data.map((r) => ({ id: r.place_id, label: r.display_name }))
        : [];

      setLocationResults(results);
      setLocationOpen(true);
    } catch {
      setLocationResults([]);
      setLocationOpen(false);
    } finally {
      setLocationLoading(false);
    }
  };

  const onLocationChange = (e) => {
    const v = e.target.value;
    setLocationQuery(v);
    setError("");
    setLocationOpen(true);

    clearTimeout(window.__editLocTimer);
    window.__editLocTimer = setTimeout(() => fetchLocations(v), 250);
  };

  const selectLocation = (item) => {
    setLocation(item.label);      //what you POST
    setLocationQuery(item.label); //what user sees
    setLocationOpen(false);
    setLocationResults([]);
    setError("");
  };

  const closeLocationDropdown = () => setLocationOpen(false);

  const validate = () => {
    if (!norm(title)) return "Name is required.";
    if (!norm(description)) return "Description is required.";
    if (!norm(location)) return "Location is required.";
    if (!norm(eventDate)) return "Date is required.";
    if (!norm(eventTime)) return "Time is required.";
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

    //backend fields
    fd.append("locationText", location);
    fd.append("eventDate", eventDate);
    fd.append("eventTime", eventTime);

    //match your backend controller parsing (it supports both)
    accessibility.forEach((a) => fd.append("accessibility[]", a));

    //only send photos if user picked new ones
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
        <div style={styles.topBar}>
          <button type="button" onClick={onDone} style={styles.backBtn} aria-label="Back">
            ←
          </button>
          <div style={styles.topTitle}>Edit event</div>
          <div style={{ width: 28 }} />
        </div>

        <div style={styles.imageBlock}>
          <label style={styles.imageLabel}>
            <input type="file" accept="image/*" multiple onChange={onPickPhotos} style={{ display: "none" }} />
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

          {/*date + time */}
          <input
            type="date"
            value={eventDate}
            onChange={(e) => {
              setEventDate(e.target.value);
              setError("");
            }}
            style={styles.input}
          />

          <input
            type="time"
            value={eventTime}
            onChange={(e) => {
              setEventTime(e.target.value);
              setError("");
            }}
            style={styles.input}
          />
        </div>

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
                    style={{ ...styles.checkbox, ...(checked ? styles.checkboxOn : styles.checkboxOff) }}
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

        {/*new location UI */}
        <div style={styles.section}>
          <div style={styles.sectionTitle}>Location</div>

          <div style={styles.locationWrap}>
            <input
              value={locationQuery}
              onChange={onLocationChange}
              onFocus={() => setLocationOpen(true)}
              onBlur={() => setTimeout(closeLocationDropdown, 120)}
              placeholder="Start typing address / postcode"
              style={styles.locationInputWide}
              autoComplete="off"
            />

            {locationLoading ? <div style={styles.locationHint}>Searching…</div> : null}

            {locationOpen && locationResults.length ? (
              <div style={styles.locationDropdown}>
                {locationResults.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => selectLocation(r)}
                    style={styles.locationItem}
                  >
                    {r.label}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        {error ? <div style={styles.error}>{error}</div> : null}

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

  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  backBtn: { background: "transparent", border: "none", color: "white", fontSize: 22, cursor: "pointer", opacity: 0.9 },
  topTitle: { opacity: 0.7, fontSize: 14, letterSpacing: 0.4, fontFamily: '"Antonio", system-ui, -apple-system, Segoe UI, Roboto, Arial' },

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
  placeholder: { width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(0,0,0,0.55)", fontSize: 40, userSelect: "none" },
  placeholderIcon: { border: "2px solid rgba(0,0,0,0.45)", padding: "18px 22px" },

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
  sectionTitle: { fontSize: 18, fontFamily: '"Anton", sans-serif', letterSpacing: 0.4 },

  accessGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px 14px", marginTop: 8 },
  accessItem: { display: "flex", alignItems: "center", gap: 10, cursor: "pointer", userSelect: "none" },
  checkbox: { width: 18, height: 18, display: "inline-flex", alignItems: "center", justifyContent: "center", border: "1px solid rgba(255,255,255,0.35)", fontSize: 12, lineHeight: 1 },
  checkboxOn: { background: "rgba(255,255,255,0.10)" },
  checkboxOff: { background: "transparent" },
  accessLabel: { opacity: 0.9, fontSize: 12 },

  locationWrap: { position: "relative", width: "100%" },
  locationInputWide: {
    width: "100%",
    height: 44,
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(240, 240, 255, 0.9)",
    outline: "none",
    padding: "0 14px",
    fontSize: 14,
    boxSizing: "border-box",
  },
  locationHint: { marginTop: 6, fontSize: 12, opacity: 0.7 },
  locationDropdown: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 50,
    zIndex: 60,
    background: "rgba(0,0,0,0.95)",
    border: "1px solid rgba(242,0,255,0.35)",
    maxHeight: 220,
    overflowY: "auto",
  },
  locationItem: {
    width: "100%",
    textAlign: "left",
    padding: "10px 12px",
    background: "transparent",
    border: "none",
    color: "white",
    fontSize: 12,
    cursor: "pointer",
    opacity: 0.92,
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },

  error: { marginTop: 12, color: "#ff7ad9", opacity: 0.95, fontSize: 13 },

  saveRow: { marginTop: 18, display: "flex", justifyContent: "center", paddingBottom: 6 },
  saveBtn: {
    width: 160,
    height: 56,
    border: "1px solid rgba(242,0,255,0.55)",
    background: "rgba(60,60,60,0.65)",
    color: "white",
    fontFamily: '"Anton", sans-serif',
    fontSize: 24,
    letterSpacing: 0.6,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    lineHeight: 1,
    padding: 0,
  },
};
