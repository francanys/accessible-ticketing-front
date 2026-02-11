// src/components/HostEvents.jsx
import { useEffect, useMemo, useState } from "react";

import FilterDropdown from "./FilterDropdown";
import AddEventModal from "./AddEventModal";
import { FaWheelchair } from "react-icons/fa";

function norm(s) {
  return String(s || "").trim().toLowerCase();
}

function toDateText(v) {
  if (!v) return "";
  //supports "2026-02-12T00:00:00.000Z" or "2026-02-12"
  const d = new Date(v);
  if (!Number.isNaN(d.getTime())) {
    return d.toLocaleDateString("en-GB", { weekday: "short", day: "2-digit", month: "short" });
  }
  // allback: "YYYY-MM-DD" - "DD/MM/YYYY"
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
    const [yyyy, mm, dd] = v.split("-");
    return `${dd}/${mm}/${yyyy}`;
  }
  return String(v);
}

function toTimeText(v) {
  if (!v) return "";
  // "22:00:00" -> "22:00"
  if (/^\d{2}:\d{2}:\d{2}$/.test(v)) return v.slice(0, 5);
  return String(v);
}

// tries common backend field names for host user id
function getHostIdFromEvent(e) {
  return (
    e?.hostUserId ??
    e?.host_user_id ??
    e?.host_userId ??
    e?.hostId ??
    e?.host_id ??
    e?.ownerId ??
    e?.owner_id ??
    null
  );
}

export default function HostEvents({ onEditEvent }) {
  const [tab, setTab] = useState("my"); // "my" | "all"
  const [q, setQ] = useState("");

  const [myInterests, setMyInterests] = useState([]);
  const [myAccess, setMyAccess] = useState([]);

  const [me, setMe] = useState(null); // { id, email, isHost } from /api/auth/me
  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [prefsError, setPrefsError] = useState("");

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState("");

  // Add Event modal state
  const [addOpen, setAddOpen] = useState(false);

  // dropdown filter state
  const [categoryFilter, setCategoryFilter] = useState("any");
  const [dateFilter, setDateFilter] = useState("any"); // any | upcoming | expired
  const [areaFilter, setAreaFilter] = useState("any");

  const [favIds, setFavIds] = useState(() => new Set());
  const [favLoading, setFavLoading] = useState(false);

  const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || "";


  function toImageSrc(url) {
    if (!url) return "";
    if (url.startsWith("http")) return url;
  
    const origin = API_ORIGIN.replace(/\/+$/, "");
    const path = url.startsWith("/") ? url : `/${url}`;
  
    return origin ? `${origin}${path}` : path;
  }

  // cookie session auth get current user + prefs (no localStorage, no Bearer header)
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoadingPrefs(true);
      setPrefsError("");

      try {
        // 1) who am I
        const meRes = await fetch("/api/auth/me", {
          credentials: "include",
        });
        const meData = await meRes.json().catch(() => ({}));
        if (!meRes.ok || !meData.ok) throw new Error(meData.error || "Please log in again.");
        if (!alive) return;

        setMe(meData.user);

        setFavLoading(true);
try {
  const fRes = await fetch("/api/favorites", { credentials: "include" });
  const fData = await fRes.json().catch(() => ({}));
  if (fRes.ok && fData.ok) {
    setFavIds(new Set((fData.eventIds || []).map(Number)));
  } else {
    setFavIds(new Set());
  }
} finally {
  setFavLoading(false);
}


        // 2) my prefs
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
        setMe(null);
      } finally {
        if (!alive) return;
        setLoadingPrefs(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  /**
   * ✅ cookie session auth
   * - fetch /api/events
   * - if tab === "my", filter by me.id (from /api/auth/me)
   */
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoadingEvents(true);
      setEventsError("");

      try {
        const res = await fetch("/api/events", {
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load events");

        const all = Array.isArray(data.events) ? data.events : [];

        if (!alive) return;

        if (tab === "my") {
          // If we don't know who we are yet, show nothing (or show all if you prefer)
          const myId = Number(me?.id);
          if (!myId) {
            setEvents([]);
            return;
          }

          const mine = all.filter((e) => Number(getHostIdFromEvent(e)) === myId);
          setEvents(mine);
        } else {
          setEvents(all);
        }
      } catch (e) {
        if (!alive) return;
        setEventsError(e.message || "Failed to load events");
        setEvents([]);
      } finally {
        if (!alive) return;
        setLoadingEvents(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [tab, me?.id]);

  const categoryOptions = useMemo(() => {
    const cats = new Set();
    events.forEach((e) => (e.categories || []).forEach((c) => cats.add(String(c))));
    return [
      { value: "any", label: "Any" },
      ...Array.from(cats)
        .sort((a, b) => a.localeCompare(b))
        .map((c) => ({ value: c, label: c })),
    ];
  }, [events]);

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
    ],
    []
  );

  const passFilters = (e) => {
    if (categoryFilter !== "any") {
      const ok = (e.categories || []).some((c) => norm(c) === norm(categoryFilter));
      if (!ok) return false;
    }
    if (areaFilter !== "any") {
      if (norm(e.area) !== norm(areaFilter)) return false;
    }
    if (dateFilter === "upcoming" && e.expired) return false;
    if (dateFilter === "expired" && !e.expired) return false;
    return true;
  };

  const matchesSearch = (e, qq) =>
    !qq ||
    norm(e.title).includes(qq) ||
    norm(e.venue).includes(qq) ||
    norm(e.city).includes(qq) ||
    (e.categories || []).some((c) => norm(c).includes(qq));

  const shown = useMemo(() => {
    const qq = norm(q);
    return (events || []).filter((e) => matchesSearch(e, qq) && passFilters(e));
  }, [events, q, categoryFilter, areaFilter, dateFilter]);

  const handleSaveNewEvent = async (formData) => {
    const res = await fetch("/api/events", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.ok) throw new Error(data.error || "Failed to create event");

    setEvents((prev) => [data.event, ...(prev || [])]);
  };

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

  // optimistic UI
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
  } catch (e) {
    // rollback if request fails
    setFavIds((prev) => {
      const next = new Set(prev);
      if (wasFav) next.add(id);
      else next.delete(id);
      return next;
    });
  }
};


  return (
    <div style={styles.page}>
      <div style={styles.phone}>
        <AddEventModal open={addOpen} onClose={() => setAddOpen(false)} onSave={handleSaveNewEvent} />

        <div style={styles.searchWrap}>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search" style={styles.search} />
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
                : "Any"
            }
          />
          <FilterDropdown label="Dates" value={dateFilter} options={dateOptions} onChange={setDateFilter} />
          <FilterDropdown label="Area" value={areaFilter} options={areaOptions} onChange={setAreaFilter} align="right" />
        </div>

        <div style={styles.tabsRow}>
          <button
            type="button"
            onClick={() => setTab("my")}
            style={{
              ...styles.tabBtn,
              ...(tab === "my" ? styles.tabBtnActive : styles.tabBtnInactive),
            }}
          >
            MY EVENTS
            <div style={{ ...styles.tabUnderline, opacity: tab === "my" ? 1 : 0 }} />
          </button>

          <button
            type="button"
            onClick={() => setTab("all")}
            style={{
              ...styles.tabBtn,
              ...(tab === "all" ? styles.tabBtnActive : styles.tabBtnInactive),
            }}
          >
            ALL EVENTS
            <div style={{ ...styles.tabUnderline, opacity: tab === "all" ? 1 : 0 }} />
          </button>
        </div>

        <div style={styles.addRow}>
          <button type="button" style={styles.addEventBtn} onClick={() => setAddOpen(true)}>
            <span style={styles.plus}>＋</span> Event
          </button>
        </div>

        {loadingPrefs ? (
          <div style={{ opacity: 0.7, padding: 12 }}>Loading preferences…</div>
        ) : prefsError ? (
          <div style={{ opacity: 0.9, padding: 12, color: "#ff7ad9" }}>{prefsError}</div>
        ) : null}

        {loadingEvents ? (
          <div style={{ opacity: 0.7, padding: 12 }}>Loading events…</div>
        ) : eventsError ? (
          <div style={{ opacity: 0.9, padding: 12, color: "#ff7ad9" }}>{eventsError}</div>
        ) : null}

<div style={styles.list}>
  {shown.map((e) => {
    const myId = Number(me?.id);
    const isOwner = Number(getHostIdFromEvent(e)) === myId;

    return (
      <div key={e.id} style={styles.card} onClick={closeAccessTip}>
        <div style={styles.cardHeaderIcons}>
        <div style={{ position: "relative" }}>
        <button
  type="button"
  title="Accessibility" // hover label
  aria-label="Accessibility"
  onClick={(ev) => {
    ev.stopPropagation(); // don’t trigger card click close
    if (accessTip.open && accessTip.eventId === e.id) closeAccessTip();
    else openAccessTip(e); //click shows backend list
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


{isOwner ? (
  <div
    style={styles.rightIcon}
    title="Edit"
    onClick={(ev) => {
      ev.stopPropagation();
      onEditEvent(e.id);
    }}
  >
    ✎
  </div>
) : (
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
)}



        </div>

        <div style={styles.cardBody}>
          <div style={styles.cardImageWrap}>
            {e.imageUrl ? (
              <img
                src={toImageSrc(e.imageUrl)}
                alt={e.title}
                style={styles.cardImage}
              />
            ) : (
              <div style={styles.cardImageFallback}>No photo</div>
            )}
          </div>

          <div style={styles.cardBottom}>
            <div>
              {e.expired ? <div style={styles.expired}>Expired</div> : null}
              <div style={styles.eventTitle}>{e.title}</div>

{/*date, time */}
{(e.eventDate || e.eventTime) ? (
  <div style={styles.eventDateTime}>
    {toDateText(e.eventDate)}
    {e.eventDate && e.eventTime ? " • " : ""}
    {toTimeText(e.eventTime)}
  </div>
) : null}

<div style={styles.eventMeta}>
  {e.venue ? `${e.venue}, ` : ""}
  {e.city}
</div>

{e.dateLabel ? <div style={styles.eventMeta}>{e.dateLabel}</div> : null}
{e.timeLabel ? <div style={styles.eventMeta}>{e.timeLabel}</div> : null}

              <div style={styles.eventMeta}>
                {e.venue ? `${e.venue}, ` : ""}
                {e.city}
              </div>
              <div style={styles.eventMeta}>{e.dateLabel}</div>
              <div style={styles.eventMeta}>{e.timeLabel}</div>
            </div>

            <div style={styles.eventDesc}>{e.description}</div>
          </div>
        </div>
      </div>
    );
  })}

  {!shown.length && !loadingEvents ? (
    <div style={styles.empty}>No events match your filters yet.</div>
  ) : null}
</div>


        <div style={styles.bottomNav}>
          <div style={{ ...styles.navIcon, color: "#F200FF" }}>⌂</div>
          <div style={styles.navIcon}>♡</div>
          <div style={styles.navIcon}>👤</div>
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
  tabsRow: { display: "flex", justifyContent: "space-between", marginTop: 18 },
  tabBtn: {
    width: "48%",
    background: "transparent",
    border: "none",
    color: "white",
    padding: "10px 0",
    cursor: "pointer",
    position: "relative",
    fontFamily: '"Anton", sans-serif',
    letterSpacing: 0.6,
    fontSize: 16,
    opacity: 0.9,
  },
  tabBtnActive: { opacity: 1 },
  tabBtnInactive: { opacity: 0.65 },
  tabUnderline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 3,
    background: "#F200FF",
  },
  addRow: { display: "flex", justifyContent: "flex-end", marginTop: 10, marginBottom: 10 },
  addEventBtn: {
    border: "1px solid rgba(242,0,255,0.45)",
    background: "rgba(60,60,60,0.6)",
    color: "white",
    padding: "10px 14px",
    borderRadius: 0,
    fontFamily: '"Anton", sans-serif',
    letterSpacing: 0.4,
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  plus: { color: "#F200FF", fontSize: 18, lineHeight: 1 },
  list: { display: "grid", gap: 14, paddingBottom: 12 },
  card: { border: "1px solid rgba(242,0,255,0.35)", background: "rgba(255,255,255,0.04)", padding: 10 },
  cardHeaderIcons: { display: "flex", justifyContent: "space-between", paddingBottom: 8 },
  leftIcon: { opacity: 0.85, fontSize: 18 },
  rightIcon: { opacity: 0.85, fontSize: 18, cursor: "pointer" },
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
  cardBottom: { display: "grid", gridTemplateColumns: "1fr 1.2fr", gap: 12, paddingTop: 10, alignItems: "end" },
  cardBody: { display: "grid", gap: 10 },
  expired: { color: "#ff2b2b", fontFamily: '"Anton", sans-serif', letterSpacing: 0.6, marginBottom: 6 },
  eventTitle: { fontFamily: '"Anton", sans-serif', fontSize: 22, marginBottom: 4 },
  eventMeta: { opacity: 0.65, fontSize: 12, lineHeight: 1.4 },
  eventDesc: { opacity: 0.75, fontSize: 12, lineHeight: 1.5, textAlign: "right" },
  empty: { marginTop: 16, opacity: 0.7, textAlign: "center" },
  bottomNav: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 58,
    borderTop: "1px solid rgba(255,255,255,0.08)",
    background: "rgba(0,0,0,0.85)",
    display: "flex",
    justifyContent: "space-around",
    alignItems: "center",
  },
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
  eventDateTime: {
    opacity: 0.85,
    fontSize: 13,
    lineHeight: 1.3,
    marginBottom: 6,
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
};
