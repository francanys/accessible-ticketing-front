import { useEffect, useMemo, useState } from "react";

function formatGBPFromPence(pence) {
  if (pence == null) return "";
  const n = Number(pence);
  if (!Number.isFinite(n)) return "";
  if (n <= 0) return "Free";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n / 100);
}

export default function CheckoutScreen({ eventId, qtyByTier, onBack, onDone }) {
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [event, setEvent] = useState(null);

  const [buying, setBuying] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoading(true);
      setErr("");
      setMsg("");

      try {
        if (!eventId) throw new Error("Missing event id");
        const res = await fetch(`/api/events/${eventId}`, { credentials: "include" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load event");
        if (!alive) return;
        setEvent(data.event);
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
  }, [eventId]);

  const tiers = useMemo(() => {
    const list = Array.isArray(event?.ticketTiers) ? event.ticketTiers : [];
    return list.map((t) => ({
      tierName: String(t.ticket_type || t.tier_name || "").toLowerCase(),
      pricePence: Number(t.price_pence) || 0,
      remaining: Number(t.quantity_remaining ?? 0),
    }));
  }, [event]);

  const lines = useMemo(() => {
    const prices = new Map(tiers.map((t) => [t.tierName, t.pricePence]));
    const remaining = new Map(tiers.map((t) => [t.tierName, t.remaining]));

    return Object.entries(qtyByTier || {})
      .map(([tierName, qty]) => ({
        tierName,
        qty: Number(qty) || 0,
        pricePence: Number(prices.get(tierName)) || 0,
        remaining: Number(remaining.get(tierName)) || 0,
      }))
      .filter((x) => x.qty > 0);
  }, [qtyByTier, tiers]);

  const totalTickets = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);
  const totalPence = useMemo(() => lines.reduce((s, l) => s + l.qty * l.pricePence, 0), [lines]);

  async function buyAll() {
    setMsg("");
    setBuying(true);

    try {
      // quick validation vs current remaining
      for (const l of lines) {
        if (l.qty > l.remaining) {
          throw new Error(`${l.tierName.toUpperCase()} only has ${l.remaining} left`);
        }
      }

      // call the existing endpoint once per ticket
      for (const l of lines) {
        for (let i = 0; i < l.qty; i++) {
          const res = await fetch(`/api/events/${eventId}/tickets/buy`, {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ tierName: l.tierName }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.ok) throw new Error(data.error || "Failed to buy ticket");
        }
      }

      setMsg("Tickets bought ✅");
      if (onDone) onDone();
    } catch (e) {
      setMsg(e.message || "Could not complete checkout");
    } finally {
      setBuying(false);
    }
  }

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

  return (
    <div style={styles.page}>
      <div style={styles.phone}>
        <button style={styles.back} onClick={onBack}>← Back</button>

        <div style={styles.title}>Checkout</div>
        {event?.title ? <div style={styles.meta}>{event.title}</div> : null}

        <div style={styles.sectionTitle}>Your tickets</div>

        {!lines.length ? (
          <div style={{ opacity: 0.7, marginTop: 10 }}>No tickets selected.</div>
        ) : (
          <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
            {lines.map((l) => (
              <div key={l.tierName} style={styles.row}>
                <div>
                  <div style={styles.rowTitle}>{l.tierName.toUpperCase()}</div>
                  <div style={styles.meta}>
                    {l.qty} × {formatGBPFromPence(l.pricePence)}
                  </div>
                </div>
                <div style={styles.rowTotal}>
                  {formatGBPFromPence(l.qty * l.pricePence)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div style={styles.summary}>
          <div style={styles.summaryLine}>
            <div>Total tickets</div>
            <div>{totalTickets}</div>
          </div>
          <div style={styles.summaryLine}>
            <div>Total</div>
            <div style={{ fontFamily: '"Anton", sans-serif' }}>{formatGBPFromPence(totalPence)}</div>
          </div>
        </div>

        {msg ? <div style={styles.msg}>{msg}</div> : null}

        <button
          type="button"
          style={{
            ...styles.buyBtn,
            opacity: lines.length && !buying ? 1 : 0.45,
            cursor: lines.length && !buying ? "pointer" : "not-allowed",
          }}
          disabled={!lines.length || buying}
          onClick={buyAll}
        >
          {buying ? "Buying…" : "Buy"}
        </button>
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
    display: "grid",
    alignContent: "start",
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
    justifySelf: "start",
  },
  title: { fontFamily: '"Anton", sans-serif', fontSize: 28, marginBottom: 6 },
  meta: { opacity: 0.75, fontSize: 13, lineHeight: 1.4 },
  sectionTitle: { marginTop: 18, fontFamily: '"Anton", sans-serif', fontSize: 18, letterSpacing: 0.4 },
  row: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    border: "1px solid rgba(242,0,255,0.35)",
    padding: 12,
  },
  rowTitle: { fontFamily: '"Anton", sans-serif', fontSize: 16 },
  rowTotal: { fontFamily: '"Anton", sans-serif', letterSpacing: 0.3 },
  summary: {
    marginTop: 16,
    borderTop: "1px solid rgba(242,0,255,0.25)",
    paddingTop: 12,
    display: "grid",
    gap: 8,
  },
  summaryLine: { display: "flex", justifyContent: "space-between", opacity: 0.9 },
  buyBtn: {
    marginTop: 18,
    border: "1px solid rgba(242,0,255,0.65)",
    background: "rgba(242,0,255,0.15)",
    color: "white",
    padding: "12px 14px",
    fontFamily: '"Anton", sans-serif',
    letterSpacing: 0.4,
  },
  msg: { marginTop: 10, color: "#F200FF" },
};
