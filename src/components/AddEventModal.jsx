import React, { Component } from "react";

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

function norm(s) {
  return String(s || "").trim();
}

export default class AddEventModal extends Component {
  constructor(props) {
    super(props);

    this.state = {
      photos: [], // File[]
      photoPreviews: [], // string[]
      title: "",
      description: "",
      accessibility: [],
      location: "",
      saving: false,
      error: "",
    };
  }

  componentWillUnmount() {
    // cleanup object URLs
    (this.state.photoPreviews || []).forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch (_) {}
    });
  }

  reset = () => {
    (this.state.photoPreviews || []).forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch (_) {}
    });

    this.setState({
      photos: [],
      photoPreviews: [],
      title: "",
      description: "",
      accessibility: [],
      location: "",
      saving: false,
      error: "",
    });
  };

  close = () => {
    if (this.props.onClose) this.props.onClose();
    this.reset();
  };

  onPickPhotos = (e) => {
    const files = Array.from(e.target.files || []);
    const previews = files.map((f) => URL.createObjectURL(f));

    // cleanup previous
    (this.state.photoPreviews || []).forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch (_) {}
    });

    this.setState({
      photos: files,
      photoPreviews: previews,
    });
  };

  toggleAccess = (label) => {
    this.setState((prev) => {
      const cur = prev.accessibility || [];
      const has = cur.includes(label);

      // None is mutually exclusive
      if (label === "None") {
        return { accessibility: has ? [] : ["None"] };
      }

      const next = has ? cur.filter((x) => x !== label) : [...cur, label];
      // if any option other than None selected, remove None
      return { accessibility: next.filter((x) => x !== "None") };
    });
  };

  validate = () => {
    const title = norm(this.state.title);
    const description = norm(this.state.description);
    const location = norm(this.state.location);

    if (!title) return "Name is required.";
    if (!description) return "Description is required.";
    if (!location) return "Location is required.";
    return "";
  };

  save = async () => {
    const msg = this.validate();
    if (msg) {
      this.setState({ error: msg });
      return;
    }
  
    this.setState({ saving: true, error: "" });
  
    const { photos, title, description, accessibility, location } = this.state;
  
    const fd = new FormData();
    fd.append("title", title);
    fd.append("description", description);
    fd.append("locationText", location);
    accessibility.forEach((a) => fd.append("accessibility[]", a));
    photos.forEach((p) => fd.append("photos", p));
  
    try {
      await this.props.onSave(fd);
      this.reset();
      this.props.onClose();
    } catch (e) {
      this.setState({ error: e.message || "Failed to save", saving: false });
      return;
    }
  
    this.setState({ saving: false });
  };
  

  render() {
    const { open } = this.props;
    if (!open) return null;

    const { photoPreviews, title, description, accessibility, location, saving, error } =
      this.state;

    const cover = photoPreviews[0];

    return (
      <div style={styles.overlay}>
        <div style={styles.sheet}>
          {/* top bar */}
          <div style={styles.topBar}>
            <div style={styles.topTitle}>Add event</div>
            <button type="button" onClick={this.close} style={styles.closeBtn} aria-label="Close">
              ×
            </button>
          </div>

          {/* image / upload */}
          <div style={styles.imageBlock}>
            <label style={styles.imageLabel}>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={this.onPickPhotos}
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
              onChange={(e) => this.setState({ title: e.target.value, error: "" })}
              placeholder="Name"
              style={styles.input}
            />

            <textarea
              value={description}
              onChange={(e) => this.setState({ description: e.target.value, error: "" })}
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
                      onClick={() => this.toggleAccess(opt)}
                      role="checkbox"
                      aria-checked={checked}
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") this.toggleAccess(opt);
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
              onChange={(e) => this.setState({ location: e.target.value, error: "" })}
              placeholder="Postcode"
              style={styles.locationInput}
            />
          </div>

          {/* error */}
          {error ? <div style={styles.error}>{error}</div> : null}

          {/* save */}
          <div style={styles.saveRow}>
            <button type="button" onClick={this.save} disabled={saving} style={styles.saveBtn}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </div>
    );
  }
}

const styles = {
  overlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    justifyContent: "center",
    alignItems: "flex-start",
    padding: "10px 10px 14px",
    zIndex: 9999,
  },
  sheet: {
    width: "100%",
    maxWidth: 420,
    background: "black",
    border: "1px solid rgba(255,255,255,0.08)",
    padding: 14,
    boxSizing: "border-box",
    overflowY: "auto",
    maxHeight: "92vh",
  },
  topBar: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  topTitle: {
    opacity: 0.7,
    fontSize: 14,
    letterSpacing: 0.4,
    fontFamily: '"Antonio", system-ui, -apple-system, Segoe UI, Roboto, Arial',
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    color: "white",
    fontSize: 34,
    lineHeight: 1,
    cursor: "pointer",
    opacity: 0.9,
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
