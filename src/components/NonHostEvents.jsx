import { useEffect, useMemo, useState } from "react";
import FilterDropdown from "./FilterDropdown";
import { FaWheelchair } from "react-icons/fa";
import BottomMenu from "./BottomNav";

function norm(s) {
  return String(s || "").trim().toLowerCase();
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

function isExpiredEvent(e) {
  if (typeof e?.expired === "boolean") return e.expired;

  const d = e?.eventDate ? new Date(e.eventDate) : null;
  if (!d || Number.isNaN(d.getTime())) return false;

  if (e?.eventTime && /^\d{2}:\d{2}(:\d{2})?$/.test(e.eventTime)) {
    const [hh, mm] = String(e.eventTime).split(":");
    d.setHours(Number(hh || 0), Number(mm || 0), 0, 0);
  } else {
    d.setHours(23, 59, 59, 999);
  }

  return d.getTime() < Date.now();
}


export default function NonHostEvents({ screen, setScreen, isHost, mode = "feed", onOpenEvent }) {
  const [q, setQ] = useState("");

  const [myInterests, setMyInterests] = useState([]);
  const [myAccess, setMyAccess] = useState([]);

  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [prefsError, setPrefsError] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("any");

  const [dateMode, setDateMode] = useState("any"); 
  const [selectedDate, setSelectedDate] = useState(""); 
  
  const [areaQuery, setAreaQuery] = useState("");
  

  const [allEvents, setAllEvents] = useState([]);
  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState("");

  const [favIds, setFavIds] = useState(() => new Set());

  const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || "";

  function toImageSrc(url) {
    if (!url) return "";
    if (url.startsWith("http")) return url;
  
    const origin = API_ORIGIN.replace(/\/+$/, "");
    const path = url.startsWith("/") ? url : `/${url}`;
  
    return origin ? `${origin}${path}` : path;
  }

  useEffect(() => {
    let alive = true;

    (async () => {
      setLoadingPrefs(true);
      setPrefsError("");

      try {
        const meRes = await fetch("/api/auth/me", { credentials: "include" });
        const meData = await meRes.json().catch(() => ({}));
        if (!meRes.ok || !meData.ok) throw new Error(meData.error || "Please log in again.");
        if (!alive) return;

        try {
          const fRes = await fetch("/api/favorites", { credentials: "include" });
          const fData = await fRes.json().catch(() => ({}));
          if (fRes.ok && fData.ok) setFavIds(new Set((fData.eventIds || []).map(Number)));
        } catch {
          setFavIds(new Set());
        }
        
        const [iRes, aRes] = await Promise.all([
          fetch("/api/interests", { credentials: "include" }),
          fetch("/api/accessibility", { credentials: "include" }),
        ]);

        const iData = await iRes.json().catch(() => ({}));
        const aData = await aRes.json().catch(() => ({}));

        if (!iRes.ok || !iData.ok) throw new Error(iData.error || "Failed to load interests");
        if (!aRes.ok || !aData.ok) throw new Error(aData.error || "Failed to load accessibility");
        if (!alive) return;

        setMyInterests(Array.isArray(iData.interests) ? iData.interests : []);
        setMyAccess(Array.isArray(aData.accessibility) ? aData.accessibility : []);
      } catch (e) {
        console.error(e);
        if (!alive) return;
        setPrefsError(e.message || "Failed to load preferences");
        setMyInterests([]);
        setMyAccess([]);
      } finally {
        if (!alive) return;
        setLoadingPrefs(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    const t = setTimeout(async () => {
      setLoadingEvents(true);
      setEventsError("");

      try {
        const params = new URLSearchParams();
        if (q?.trim()) params.set("q", q.trim());
        params.set("category", categoryFilter || "any");
        params.set("area", areaQuery?.trim() || "any");
        
        params.set("date", dateMode || "any");
        if (dateMode === "on" && selectedDate) params.set("onDate", selectedDate);
        
        params.set("limit", "200");

        const res = await fetch(`/api/events/feed?${params.toString()}`, {
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load feed");

        const list = Array.isArray(data.events) ? data.events : [];
        setEvents(list);
        setAllEvents((prev) => (prev.length ? prev : list)); 

      } catch (e) {
        setEventsError(e.message || "Failed to load feed");
        setEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [q, categoryFilter, areaQuery, dateMode, selectedDate]);

  const categoryOptions = useMemo(() => {
    const cats = new Set();
  
    (allEvents || []).forEach((e) => {
      const list = Array.isArray(e.categories)
        ? e.categories
        : typeof e.categories === "string"
        ? [e.categories]
        : [];
  
      list.forEach((c) => {
        if (c) cats.add(String(c));
      });
    });
  
    return [
      { value: "any", label: "Any" },
      ...Array.from(cats)
        .sort((a, b) => a.localeCompare(b))
        .map((c) => ({ value: c, label: c })),
    ];
  }, [allEvents]);
  
  

  const areaOptions = useMemo(() => {
    const areas = new Set();
    events.forEach((e) => {
      if (e.area) areas.add(String(e.area));
    });
    return [
      { value: "any", label: "Any" },
      ...Array.from(areas)
        .sort((a, b) => a.localeCompare(b))
        .map((a) => ({ value: a, label: a })),
    ];
  }, [events]);

  const dateOptions = useMemo(
    () => [
      { value: "any", label: "Any" },
      { value: "upcoming", label: "Upcoming" },
      { value: "expired", label: "Expired" },
      { value: "on", label: "On date…" },
    ],
    []
  );
  

  //backend already filters + orders by matchScore
  const shown = useMemo(() => {
    if (mode !== "favourites") return events;
    return (events || []).filter((e) => favIds.has(Number(e.id)));
  }, [events, favIds, mode]);
  

  //state for accessibility
  const [accessTip, setAccessTip] = useState({
    open: false,
    eventId: null,
    text: "",
  });
  
  const openAccessTip = (event) => {
    const list = Array.isArray(event?.accessibility) ? event.accessibility : [];
    const clean = list.filter(Boolean).filter((x) => x !== "None");
  
    const text = clean.length ? clean.join(", ") : "No accessibility info";
  
    setAccessTip({
      open: true,
      eventId: event.id,
      text,
    });
  };
  
  const closeAccessTip = () => {
    setAccessTip({ open: false, eventId: null, text: "" });
  };
  
  const toggleFav = async (eventId) => {
    const id = Number(eventId);
    if (!id) return;
  
    const wasFav = favIds.has(id);
  
    setFavIds((prev) => {
      const next = new Set(prev);
      if (wasFav) next.delete(id);
      else next.add(id);
      return next;
    });
  
    try {
      const res = await fetch(`/api/favorites/${id}`, {
        method: wasFav ? "DELETE" : "POST",
        credentials: "include",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || "Failed");
    } catch {
      setFavIds((prev) => {
        const next = new Set(prev);
        if (wasFav) next.add(id);
        else next.delete(id);
        return next;
      });
    }
  };

  function formatGBPFromPence(pence) {
    if (pence == null) return "";
    const n = Number(pence);
    if (!Number.isFinite(n)) return "";
    if (n <= 0) return "Free";
    return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(n / 100);
  }
  
  function fromPriceLabel(e) {
    const p = e?.minPricePence;
    if (p == null) return "";
    return `From ${formatGBPFromPence(p)}`;
  }
  
  return (
    <div style={styles.page}>
      <div style={styles.phone}>
        <div style={styles.content}>
          <div style={styles.searchWrap}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search"
              style={styles.search}
            />
            <div style={styles.searchIcon}>⌕</div>
          </div>
  
          <div style={styles.filtersRow}>
            <FilterDropdown
              label="Categories"
              value={categoryFilter}
              options={categoryOptions}
              onChange={setCategoryFilter}
              subtitle={
                myInterests.length
                  ? myInterests.slice(0, 3).join(", ") + (myInterests.length > 3 ? "…" : "")
                  : categoryOptions.find((o) => o.value === categoryFilter)?.label
              }
            />
  
            <div style={{ display: "grid", gap: 6 }}>
              <FilterDropdown
                label="Dates"
                value={dateMode}
                options={dateOptions}
                onChange={(v) => {
                  setDateMode(v);
                  if (v !== "on") setSelectedDate("");
                }}
              />
              {dateMode === "on" ? (
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  style={styles.dateInput}
                />
              ) : null}
            </div>
  
            <div style={{ display: "grid", gap: 6 }}>
              <div style={styles.areaLabel}>Area</div>
              <input
                value={areaQuery}
                onChange={(e) => setAreaQuery(e.target.value)}
                placeholder='e.g. "E1", "SW1A 1AA", "Shoreditch"'
                style={styles.areaInput}
              />
            </div>
          </div>
  
          {loadingPrefs ? <div style={styles.empty}>Loading your preferences…</div> : null}
          {prefsError ? <div style={{ ...styles.empty, color: "#ff7ad9" }}>{prefsError}</div> : null}
  
          {loadingEvents ? <div style={styles.empty}>Loading events…</div> : null}
          {eventsError ? <div style={{ ...styles.empty, color: "#ff7ad9" }}>{eventsError}</div> : null}
  
          <div style={styles.list}>
            {shown.map((e) => (
              <div
                key={e.id}
                style={{ ...styles.card, cursor: "pointer" }}
                onClick={() => {
                  closeAccessTip();
                  if (onOpenEvent) onOpenEvent(e.id);
                }}
              >
                <div style={styles.cardHeaderIcons}>
                  <div style={{ position: "relative" }}>
                    <button
                      type="button"
                      title="Accessibility"
                      aria-label="Accessibility"
                      onClick={(ev) => {
                        ev.stopPropagation();
                        if (accessTip.open && accessTip.eventId === e.id) closeAccessTip();
                        else openAccessTip(e);
                      }}
                      style={styles.accessBtn}
                    >
                      <FaWheelchair />
                    </button>
  
                    {accessTip.open && accessTip.eventId === e.id ? (
                      <div style={styles.accessTip} role="tooltip">
                        {accessTip.text}
                      </div>
                    ) : null}
                  </div>
  
                  <button
                    type="button"
                    title="Favourite"
                    aria-label="Favourite"
                    onClick={(ev) => {
                      ev.stopPropagation();
                      toggleFav(e.id);
                    }}
                    style={{
                      ...styles.heartBtn,
                      color: favIds.has(Number(e.id)) ? "#F200FF" : "rgba(255,255,255,0.55)",
                    }}
                  >
                    ♥
                  </button>
                </div>
  
                <div style={styles.cardBody}>
                  <div style={styles.cardImageWrap}>
                    {e.imageUrl ? (
                      <img src={toImageSrc(e.imageUrl)} alt={e.title} style={styles.cardImage} />
                    ) : (
                      <div style={styles.cardImageFallback}>No photo</div>
                    )}
                  </div>
  
                  <div style={styles.cardBottom}>
                    <div>
                      {isExpiredEvent(e) ? <div style={styles.expired}>Expired</div> : null}
  
                      {fromPriceLabel(e) ? (
                        <div style={{ ...styles.eventMeta, opacity: 0.85 }}>{fromPriceLabel(e)}</div>
                      ) : null}
  
                      {(e.eventDate || e.eventTime) ? (
                        <div style={styles.eventDateTime}>
                          {toDateText(e.eventDate)}
                          {e.eventDate && e.eventTime ? " • " : ""}
                          {toTimeText(e.eventTime)}
                        </div>
                      ) : null}
  
                      {e.locationText ? <div style={styles.eventMeta}>{e.locationText}</div> : null}
  
                      {(e.venue || e.city) ? (
                        <div style={styles.eventMeta}>
                          {e.venue ? `${e.venue}${e.city ? ", " : ""}` : ""}
                          {e.city || ""}
                        </div>
                      ) : null}
  
                      {e.dateLabel ? <div style={styles.eventMeta}>{e.dateLabel}</div> : null}
                      {e.timeLabel ? <div style={styles.eventMeta}>{e.timeLabel}</div> : null}
                    </div>
  
                    <div style={styles.eventDesc}>
                      {e.description}
                      {typeof e.matchScore === "number" ? (
                        <div style={{ marginTop: 10, opacity: 0.8 }}>
                          Matched: {e.matchScore}{" "}
                          <span style={{ opacity: 0.75, fontSize: 11 }}>
                            ({e.interestMatches} interests, {e.accessMatches} access)
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            ))}
  
            {!shown.length && !loadingEvents && !loadingPrefs ? (
              <div style={styles.empty}>No events match your filters yet.</div>
            ) : null}
          </div>
        </div>
  
        <BottomMenu screen={screen} setScreen={setScreen} isHost={isHost} />
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
    height: "92vh",   
    background: "black",
    borderRadius: 24,
    overflow: "hidden",  
    position: "relative",
    boxSizing: "border-box",
    display: "flex",    
    flexDirection: "column", 
  },
  searchWrap: { position: "relative", marginTop: 8 },
  search: {
    width: "100%",
    height: 44,
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(240, 240, 255, 0.9)",
    outline: "none",
    padding: "0 44px 0 16px",
    fontSize: 16,
    boxSizing: "border-box",
  },
  searchIcon: {
    position: "absolute",
    right: 14,
    top: 10,
    opacity: 0.7,
    color: "black",
    fontSize: 18,
    userSelect: "none",
  },
  filtersRow: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: 10,
    marginTop: 14,
  },
  list: { display: "grid", gap: 14, paddingBottom: 12, marginTop: 18 },
  card: {
    border: "1px solid rgba(242,0,255,0.35)",
    background: "rgba(255,255,255,0.04)",
    padding: 10,
  },
  cardHeaderIcons: {
    display: "flex",
    justifyContent: "space-between",
    paddingBottom: 8,
  },
  leftIcon: { opacity: 0.85, fontSize: 18 },
  cardImageWrap: {
    background: "rgba(0,0,0,0.25)",
    display: "flex",
    justifyContent: "center",
    padding: 10,
    minHeight: 140,
    alignItems: "center",
  },
  cardImage: {
    width: "68%",
    aspectRatio: "1.6 / 1",
    objectFit: "cover",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  cardImageFallback: {
    width: "68%",
    aspectRatio: "1.6 / 1",
    border: "1px solid rgba(255,255,255,0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.6,
    fontSize: 12,
  },
  cardBottom: {
    display: "grid",
    gridTemplateColumns: "1fr 1.2fr",
    gap: 12,
    paddingTop: 10,
    alignItems: "end",
  },
  expired: {
    color: "#ff2b2b",
    fontFamily: '"Anton", sans-serif',
    letterSpacing: 0.6,
    marginBottom: 6,
  },
  eventTitle: {
    fontFamily: '"Anton", sans-serif',
    fontSize: 22,
    marginBottom: 4,
  },
  eventMeta: { opacity: 0.65, fontSize: 12, lineHeight: 1.4 },
  eventDesc: { opacity: 0.75, fontSize: 12, lineHeight: 1.5, textAlign: "right" },
  empty: { marginTop: 16, opacity: 0.7, textAlign: "center" },
  navIcon: { fontSize: 22, opacity: 0.9 },
  accessBtn: {
    background: "transparent",
    border: "none",
    padding: 0,
    margin: 0,
    cursor: "pointer",
    color: "white",
    fontSize: 18,
    opacity: 0.85,
    lineHeight: 1,
  },
  
  accessTip: {
    position: "absolute",
    top: 24,
    left: 0,
    zIndex: 50,
    minWidth: 160,
    maxWidth: 260,
    padding: "8px 10px",
    background: "rgba(0,0,0,0.92)",
    border: "1px solid rgba(242,0,255,0.35)",
    color: "white",
    fontSize: 12,
    lineHeight: 1.4,
    boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
    whiteSpace: "normal",
  },
  heartBtn: {
    background: "transparent",
    border: "none",
    padding: 0,
    margin: 0,
    cursor: "pointer",
    fontSize: 18,
    lineHeight: 1,
    opacity: 0.95,
  },
  dateInput: {
    height: 36,
    borderRadius: 10,
    border: "1px solid rgba(255,255,255,0.15)",
    background: "rgba(255,255,255,0.08)",
    color: "white",
    padding: "0 10px",
    outline: "none",
    boxSizing: "border-box",
  },
  areaLabel: { fontSize: 12, opacity: 0.75 },
  areaInput: {
    width: "100%",
    height: 44,
    borderRadius: 22,
    border: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(255,255,255,0.08)",
    outline: "none",
    padding: "0 16px",
    fontSize: 14,
    color: "white",
    boxSizing: "border-box",
  },
  eventDateTime: {
    opacity: 0.85,
    fontSize: 13,
    lineHeight: 1.3,
    marginBottom: 6,
  },
  
};
