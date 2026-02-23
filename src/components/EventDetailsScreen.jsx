// src/components/EventDetailsScreen.jsx
import { useEffect, useMemo, useState } from "react";

const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || "";

function toImageSrc(url) {
  if (!url) return "";
  if (url.startsWith("http")) return url;

  const origin = API_ORIGIN.replace(/\/+$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;

  return origin ? `${origin}${path}` : path;
}

function formatGBPFromPence(pence) {
  if (pence == null) return "";
  const n = Number(pence);
  if (!Number.isFinite(n)) return "";
  if (n <= 0) return "Free";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n / 100);
}

function toDateText(v) {
  if (!v) return "";
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [yyyy, mm, dd] = v.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }
  return String(v);
}

function toTimeText(v) {
  if (!v) return "";
  if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v.slice(0, 5);
  return String(v);
}

export default function EventDetailsScreen({ eventId, onBack, onCheckout, initialQtyByTier }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [event, setEvent] = useState(null);

  const [qtyByTier, setQtyByTier] = useState(initialQtyByTier || {});


  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");
     

      try {
        if (!eventId) throw new Error("Missing event id");
        const res = await fetch(`/api/events/${eventId}`, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load event");
        if (!alive) return;
        setEvent(data.event);
        setQtyByTier((prev) => {
         
          if (initialQtyByTier && typeof initialQtyByTier === "object") return initialQtyByTier;
          return prev && Object.keys(prev).length ? prev : {};
        });
        
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "Failed to load event");
        setEvent(null);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [eventId, initialQtyByTier]);

  const tiers = useMemo(() => {
    const list = Array.isArray(event?.ticketTiers) ? event.ticketTiers : [];
    return list.map((t) => ({
      tierName: String(t.ticket_type || t.tier_name || "").toLowerCase(),
      pricePence: Number(t.price_pence) || 0,
      remaining: Number(t.quantity_remaining ?? 0),
    }));
  }, [event]);

  function getQty(tierName) {
    return Number(qtyByTier?.[tierName] || 0);
  }
  
  function setQty(tierName, nextQty, remaining) {
    const safe = Math.max(0, Math.min(Number(nextQty) || 0, Number(remaining) || 0));
    setQtyByTier((prev) => ({ ...(prev || {}), [tierName]: safe }));
  }
  
  const totalTickets = useMemo(() => {
    return Object.values(qtyByTier || {}).reduce((sum, n) => sum + (Number(n) || 0), 0);
  }, [qtyByTier]);
  
  const totalPence = useMemo(() => {
    const prices = new Map(tiers.map((t) => [t.tierName, t.pricePence]));
    return Object.entries(qtyByTier || {}).reduce((sum, [name, qty]) => {
      return sum + (Number(qty) || 0) * (Number(prices.get(name)) || 0);
    }, 0);
  }, [qtyByTier, tiers]);
  

  if (loading) return <div style={styles.page}>Loading…</div>;

  if (err) {
    return (
      <div style={styles.page}>
        <div style={styles.phone}>
          <button style={styles.back} onClick={onBack}>← Back</button>
          <div style={{ color: "#ff7ad9", marginTop: 12 }}>{err}</div>
        </div>
      </div>
    );
  }

  if (!event) return null;

  return (
    <div style={styles.page}>
      <div style={styles.phone}>
        <button style={styles.back} onClick={onBack}>← Back</button>

        <div style={styles.title}>{event.title}</div>

          {event.imageUrl ? (
            <div style={styles.imageWrap}>
              <img
                src={toImageSrc(event.imageUrl)}
                alt={event.title}
                style={styles.image}
              />
            </div>
          ) : null}

        {(event.eventDate || event.eventTime) ? (
          <div style={styles.meta}>
            {toDateText(event.eventDate)}
            {event.eventDate && event.eventTime ? " • " : ""}
            {toTimeText(event.eventTime)}
          </div>
        ) : null}

        {event.locationText ? <div style={styles.meta}>{event.locationText}</div> : null}

        <div style={styles.desc}>{event.description}</div>

        <div style={styles.sectionTitle}>Tickets</div>
        

        <div style={{ display: "grid", gap: 10 }}>
          {tiers.map((t) => (
            <div key={t.tierName} style={styles.tierRow}>
              <div>
                <div style={styles.tierName}>{t.tierName.toUpperCase()}</div>
                <div style={styles.meta}>
                  {formatGBPFromPence(t.pricePence)} • {t.remaining} left
                </div>
              </div>

              <div style={styles.qtyWrap}>
  <button
    type="button"
    style={{ ...styles.qtyBtn, opacity: getQty(t.tierName) <= 0 ? 0.4 : 1 }}
    disabled={getQty(t.tierName) <= 0}
    onClick={() => setQty(t.tierName, getQty(t.tierName) - 1, t.remaining)}
  >
    −
  </button>

  <div style={styles.qtyNum}>{getQty(t.tierName)}</div>

  <button
    type="button"
    style={{ ...styles.qtyBtn, opacity: getQty(t.tierName) >= t.remaining ? 0.4 : 1 }}
    disabled={t.remaining <= 0 || getQty(t.tierName) >= t.remaining}
    onClick={() => setQty(t.tierName, getQty(t.tierName) + 1, t.remaining)}
  >
    +
  </button>
</div>

            </div>
          ))}
        </div>

        <div style={styles.checkoutBar}>
  <div style={{ display: "grid", gap: 2 }}>
    <div style={styles.checkoutTotal}>
      {totalTickets} ticket{totalTickets === 1 ? "" : "s"} • {formatGBPFromPence(totalPence)}
    </div>
    <div style={styles.checkoutSub}>
      Select tickets then checkout
    </div>
  </div>

  <button
    type="button"
    style={{
      ...styles.checkoutBtn,
      opacity: totalTickets > 0 ? 1 : 0.45,
      cursor: totalTickets > 0 ? "pointer" : "not-allowed",
    }}
    disabled={totalTickets <= 0}
    onClick={() => {
      if (onCheckout) onCheckout({ eventId, qtyByTier });
    }}
  >
    Checkout
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
    padding: 14,
    boxSizing: "border-box",
    border: "1px solid rgba(242,0,255,0.25)",
  },
  back: {
    background: "transparent",
    border: "none",
    color: "white",
    cursor: "pointer",
    fontSize: 16,
    opacity: 0.9,
    padding: 0,
    marginBottom: 12,
  },
  title: { fontFamily: '"Anton", sans-serif', fontSize: 28, marginBottom: 10 },
  meta: { opacity: 0.75, fontSize: 13, lineHeight: 1.4 },
  desc: { marginTop: 12, opacity: 0.9, fontSize: 14, lineHeight: 1.55 },
  sectionTitle: { marginTop: 18, fontFamily: '"Anton", sans-serif', fontSize: 18, letterSpacing: 0.4 },
  tierRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid rgba(242,0,255,0.35)",
    padding: 12,
  },
  tierName: { fontFamily: '"Anton", sans-serif', fontSize: 16 },
  buyBtn: {
    border: "1px solid rgba(242,0,255,0.45)",
    background: "rgba(60,60,60,0.6)",
    color: "white",
    padding: "10px 14px",
    cursor: "pointer",
    fontFamily: '"Anton", sans-serif',
    letterSpacing: 0.4,
  },
  msg: { marginTop: 10, marginBottom: 6, color: "#F200FF" },
  qtyWrap: { display: "flex", alignItems: "center", gap: 10 },
qtyBtn: {
  width: 36,
  height: 36,
  border: "1px solid rgba(242,0,255,0.45)",
  background: "rgba(60,60,60,0.6)",
  color: "white",
  fontFamily: '"Anton", sans-serif',
  fontSize: 18,
  lineHeight: "36px",
  textAlign: "center",
  cursor: "pointer",
},
qtyNum: {
  width: 30,
  textAlign: "center",
  fontFamily: '"Anton", sans-serif',
  fontSize: 16,
},
checkoutBar: {
  position: "sticky",
  bottom: 0,
  marginTop: 16,
  paddingTop: 12,
  paddingBottom: 12,
  borderTop: "1px solid rgba(242,0,255,0.25)",
  background: "rgba(0,0,0,0.92)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
},
checkoutTotal: { fontFamily: '"Anton", sans-serif', fontSize: 14, letterSpacing: 0.4 },
checkoutSub: { opacity: 0.65, fontSize: 12 },
checkoutBtn: {
  border: "1px solid rgba(242,0,255,0.65)",
  background: "rgba(242,0,255,0.15)",
  color: "white",
  padding: "10px 14px",
  fontFamily: '"Anton", sans-serif',
  letterSpacing: 0.4,
},
imageWrap: {
  marginTop: 8,
  marginBottom: 10,
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(255,255,255,0.04)",
  padding: 10,
  display: "flex",
  justifyContent: "center",
},
image: {
  width: "100%",
  maxHeight: 220,
  objectFit: "cover",
  borderRadius: 6,
},

};
