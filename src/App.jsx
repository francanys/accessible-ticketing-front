//src/App.jsx
import { useEffect, useState } from "react";
import { meRequest } from "./api/auth";
import Login from "./components/Login";
import Register from "./components/Register";
import Interests from "./components/Interests";
import Accessibility from "./components/Accessibility";
import HostEvents from "./components/HostEvents";
import NonHostEvents from "./components/NonHostEvents";


function getInitialScreen() {
  return "boot";
}

export default function App() {
  const [screen, setScreen] = useState(getInitialScreen);
  const [bootError, setBootError] = useState("");

  //auth state so BOOT can use it immediately after login
  const [auth, setAuthState] = useState(() => ({
    token: null,
    userId: null,
    isHost: false,
  }));

  useEffect(() => {
    if (screen !== "boot") return;
  
    (async () => {
      try {
        // ✅ get user from cookie session
        const meData = await meRequest(); // { ok, user }
        const userId = String(meData.user.id);
        const isHost = !!meData.user.isHost;
  
        // interests
        const iRes = await fetch(`/api/interests?userId=${encodeURIComponent(userId)}`, {
          credentials: "include",
        });
        const iData = await iRes.json().catch(() => ({}));
        if (!iRes.ok || !iData.ok) throw new Error(iData.error || "Failed to load interests");
        const hasInterests = Array.isArray(iData.interests) && iData.interests.length > 0;
  
        if (isHost) {
          setScreen(hasInterests ? "hostEvents" : "interests");
          return;
        }
  
        // accessibility
        const aRes = await fetch(`/api/accessibility?userId=${encodeURIComponent(userId)}`, {
          credentials: "include",
        });
        const aData = await aRes.json().catch(() => ({}));
        if (!aRes.ok || !aData.ok) throw new Error(aData.error || "Failed to load accessibility");
        const hasAccess = Array.isArray(aData.accessibility) && aData.accessibility.length > 0;
  
        if (!hasInterests) setScreen("interests");
        else if (!hasAccess) setScreen("accessibility");
        else setScreen("nonHostEvents");
      } catch (e) {
        console.error("[BOOT] ERROR:", e);
        setBootError(e.message || "Failed to load profile");
        setScreen("login");
      }
    })();
  }, [screen]);
  

  if (screen === "register") {
    return <Register onSwitchToLogin={() => setScreen("login")} />;
  }

  if (screen === "boot") {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "black",
          color: "white",
          display: "grid",
          placeItems: "center",
        }}
      >
        <div>
          <div style={{ fontFamily: '"Anton", sans-serif', fontSize: 22 }}>Loading…</div>
          {bootError ? (
            <div style={{ marginTop: 10, color: "#ff7ad9" }}>{bootError}</div>
          ) : null}
        </div>
      </div>
    );
  }

  if (screen === "interests") {
    return (
      <>
        <div style={{ padding: 16, textAlign: "right", background: "black" }}>
          <button
            type="button"
            onClick={() => {
              setAuthState({ token: null, userId: null, isHost: false });
              setScreen("login");
              
            }}
            style={{
              border: "1px solid #F200FF",
              background: "#323232",
              color: "white",
              padding: "10px 14px",
              cursor: "pointer",
              borderRadius: 12,
            }}
          >
            Logout
          </button>
        </div>

        <Interests
          onDoneNonHost={() => setScreen("accessibility")}
          onDoneHost={() => setScreen("hostEvents")}
        />
      </>
    );
  }

  if (screen === "accessibility") return <Accessibility onDone={() => setScreen("nonHostEvents")} />;

  if (screen === "hostEvents") return <HostEvents />;

  if (screen === "nonHostEvents") return <NonHostEvents />;

  //default login
  return (
    <Login
      onSwitchToRegister={() => setScreen("register")}
      onLoggedIn={(data) => {
        // data = { ok, user:{id,email,isHost} }
        setAuthState({
          token: null, // not used
          userId: String(data.user.id),
          isHost: !!data.user.isHost,
        });
        setScreen("boot");
      }}
      
    />
  );
}
