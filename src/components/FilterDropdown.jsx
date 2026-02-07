import { useEffect, useRef, useState } from "react";

export default function FilterDropdown({
  label,
  value,
  options,
  onChange,
  align = "left",
  subtitle,
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!ref.current) return;
      if (!ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const selectedLabel =
    options.find((o) => String(o.value) === String(value))?.label ?? String(value ?? "");

  return (
    <div ref={ref} style={{ ...styles.wrap, textAlign: align === "right" ? "right" : "left" }}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        style={{
          ...styles.titleBtn,
          justifyContent: align === "right" ? "flex-end" : "flex-start",
        }}
      >
        <span style={styles.titleText}>
          {label} <span style={styles.caret}>▾</span>
        </span>
      </button>

      <div style={styles.sub}>
        {subtitle ? subtitle : selectedLabel}
      </div>

      {open ? (
        <div
          style={{
            ...styles.menu,
            left: align === "right" ? "auto" : 0,
            right: align === "right" ? 0 : "auto",
          }}
        >
          {options.map((opt) => {
            const active = String(opt.value) === String(value);
            return (
              <button
                key={String(opt.value)}
                type="button"
                onClick={() => {
                  onChange?.(opt.value);
                  setOpen(false);
                }}
                style={{
                  ...styles.item,
                  ...(active ? styles.itemActive : null),
                }}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

const styles = {
  wrap: {
    position: "relative",
  },
  titleBtn: {
    width: "100%",
    background: "transparent",
    border: "none",
    padding: 0,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
  },
  titleText: {
    fontFamily: '"Anton", sans-serif',
    letterSpacing: 0.4,
    fontSize: 16,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    color: "white",
  },
  caret: { opacity: 0.8, fontSize: 14 },
  sub: {
    marginTop: 4,
    opacity: 0.65,
    fontSize: 12,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  menu: {
    position: "absolute",
    top: 44,
    minWidth: 180,
    background: "rgba(10,10,10,0.98)",
    border: "1px solid rgba(242,0,255,0.35)",
    boxShadow: "0 18px 40px rgba(0,0,0,0.55)",
    padding: 8,
    zIndex: 50,
  },
  item: {
    width: "100%",
    textAlign: "left",
    background: "transparent",
    color: "white",
    border: "1px solid transparent",
    padding: "10px 10px",
    cursor: "pointer",
    fontSize: 13,
    opacity: 0.9,
  },
  itemActive: {
    borderColor: "rgba(242,0,255,0.45)",
    background: "rgba(242,0,255,0.12)",
    opacity: 1,
  },
};
