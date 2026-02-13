import { useEffect, useState } from "react";
import BottomMenu from "./BottomNav";

export default function ProfilePage({ screen, setScreen, isHost }) {
  const [me, setMe] = useState(null);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/auth/me", { credentials: "include" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && data.ok) setMe(data.user);
    })();
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "black", color: "white", display: "flex", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "min(420px, 100%)", minHeight: "92vh", background: "black", borderRadius: 24, overflow: "hidden", position: "relative", padding: "14px 14px 78px", boxSizing: "border-box" }}>
        <h2 style={{ fontFamily: '"Anton", sans-serif' }}>Profile</h2>

        {me ? (
          <div style={{ border: "1px solid rgba(242,0,255,0.35)", background: "rgba(255,255,255,0.04)", padding: 12 }}>
            <div>Email: {me.email}</div>
            <div>Host: {me.isHost ? "Yes" : "No"}</div>
          </div>
        ) : (
          <div style={{ opacity: 0.7 }}>Loading…</div>
        )}

        <BottomMenu screen={screen} setScreen={setScreen} isHost={isHost} />
      </div>
    </div>
  );
}
