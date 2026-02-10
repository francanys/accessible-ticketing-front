// src/components/NonHostEvents.jsx
import { useEffect, useMemo, useState } from "react";
import FilterDropdown from "./FilterDropdown";

function norm(s) {
  return String(s || "").trim().toLowerCase();
}

export default function NonHostEvents() {
  const [q, setQ] = useState("");

  const [myInterests, setMyInterests] = useState([]);
  const [myAccess, setMyAccess] = useState([]);

  const [loadingPrefs, setLoadingPrefs] = useState(true);
  const [prefsError, setPrefsError] = useState("");

  const [categoryFilter, setCategoryFilter] = useState("any");
  const [dateFilter, setDateFilter] = useState("any"); 
  const [areaFilter, setAreaFilter] = useState("any");

  const [events, setEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventsError, setEventsError] = useState("");

  const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || "";

  function toImageSrc(url) {
    if (!url) return "";
    if (url.startsWith("http")) return url;
  
    const origin = API_ORIGIN.replace(/\/+$/, "");
    const path = url.startsWith("/") ? url : `/${url}`;
  
    return origin ? `${origin}${path}` : path;
  }


  //cookie session auth load preferences without localStorage/token/userId
  useEffect(() => {
    let alive = true;

    (async () => {
      setLoadingPrefs(true);
      setPrefsError("");

      try {
        // (optional but useful) confirm logged-in session
        const meRes = await fetch("/api/auth/me", { credentials: "include" });
        const meData = await meRes.json().catch(() => ({}));
        if (!meRes.ok || !meData.ok) throw new Error(meData.error || "Please log in again.");
        if (!alive) return;

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

  /**
   * ✅ cookie session auth:
   * Call /api/events/feed with credentials include (no Bearer header).
   * Backend should read req.user.userId for personalization.
   */
  useEffect(() => {
    const t = setTimeout(async () => {
      setLoadingEvents(true);
      setEventsError("");

      try {
        const params = new URLSearchParams();
        if (q?.trim()) params.set("q", q.trim());
        params.set("category", categoryFilter || "any");
        params.set("area", areaFilter || "any");
        params.set("date", dateFilter || "any");
        params.set("limit", "200");

        const res = await fetch(`/api/events/feed?${params.toString()}`, {
          credentials: "include",
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.ok) throw new Error(data.error || "Failed to load feed");

        setEvents(Array.isArray(data.events) ? data.events : []);
      } catch (e) {
        setEventsError(e.message || "Failed to load feed");
        setEvents([]);
      } finally {
        setLoadingEvents(false);
      }
    }, 250);

    return () => clearTimeout(t);
  }, [q, categoryFilter, areaFilter, dateFilter]);

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

  // backend already filters + orders by matchScore, so we just show returned list
  const shown = events;

  return (
    <div style={styles.page}>
      <div style={styles.phone}>
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
                : categoryOptions.find((o) => o.value === categoryFilter)?.label
            }
          />

          <FilterDropdown label="Dates" value={dateFilter} options={dateOptions} onChange={setDateFilter} />

          <FilterDropdown label="Area" value={areaFilter} options={areaOptions} onChange={setAreaFilter} align="right" />
        </div>

        {loadingPrefs ? <div style={styles.empty}>Loading your preferences…</div> : null}
        {prefsError ? <div style={{ ...styles.empty, color: "#ff7ad9" }}>{prefsError}</div> : null}

        {loadingEvents ? <div style={styles.empty}>Loading events…</div> : null}
        {eventsError ? <div style={{ ...styles.empty, color: "#ff7ad9" }}>{eventsError}</div> : null}

        <div style={styles.list}>
          {shown.map((e) => (
            <div key={e.id} style={styles.card}>
              <div style={styles.cardHeaderIcons}>
                <div style={styles.leftIcon} title="Accessibility">
                  ♿
                </div>
              </div>

              <div style={styles.cardBody}>
                <div style={styles.cardImageWrap}>
                  {e.imageUrl ? (
                    <img src={toImageSrc(e.imageUrl)}alt={e.title} style={styles.cardImage} />
                  ) : (
                    <div style={styles.cardImageFallback}>No photo</div>
                  )}
                </div>

                <div style={styles.cardBottom}>
                  <div>
                    {e.expired ? <div style={styles.expired}>Expired</div> : null}
                    <div style={styles.eventTitle}>{e.title}</div>
                    <div style={styles.eventMeta}>
                      {e.venue ? `${e.venue}, ` : ""}
                      {e.city}
                    </div>
                    <div style={styles.eventMeta}>{e.dateLabel}</div>
                    <div style={styles.eventMeta}>{e.timeLabel}</div>
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
};
