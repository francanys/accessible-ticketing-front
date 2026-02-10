//src/App.jsx
import { useEffect, useState } from "react";
import { meRequest } from "./api/auth";

import Login from "./components/Login";
import Register from "./components/Register";
import Interests from "./components/Interests";
import Accessibility from "./components/Accessibility";
import HostEvents from "./components/HostEvents";
import NonHostEvents from "./components/NonHostEvents";
import EditEventPage from "./components/EditEventPage";

function getInitialScreen() {
  return "boot";
}

export default function App() {
  const [screen, setScreen] = useState(getInitialScreen);
  const [bootError, setBootError] = useState("");

  const [editEventId, setEditEventId] = useState(null);

  useEffect(() => {
    if (screen !== "boot") return;

    (async () => {
      try {
        const meData = await meRequest();
        const userId = String(meData.user.id);
        const isHost = !!meData.user.isHost;

        const iRes = await fetch(`/api/interests?userId=${userId}`, {
          credentials: "include",
        });

        const iData = await iRes.json();
        const hasInterests =
          Array.isArray(iData.interests) &&
          iData.interests.length > 0;

        if (isHost) {
          setScreen(hasInterests ? "hostEvents" : "interests");
          return;
        }

        const aRes = await fetch(`/api/accessibility?userId=${userId}`, {
          credentials: "include",
        });

        const aData = await aRes.json();
        const hasAccess =
          Array.isArray(aData.accessibility) &&
          aData.accessibility.length > 0;

        if (!hasInterests) setScreen("interests");
        else if (!hasAccess) setScreen("accessibility");
        else setScreen("nonHostEvents");
      } catch (e) {
        setBootError(e.message || "Failed to load profile");
        setScreen("login");
      }
    })();
  }, [screen]);

  if (screen === "register")
    return <Register onSwitchToLogin={() => setScreen("login")} />;

  if (screen === "editEvent") {
    return (
      <EditEventPage
        eventId={editEventId}
        onDone={() => setScreen("hostEvents")}
      />
    );
  }

  if (screen === "hostEvents") {
    return (
      <HostEvents
        onEditEvent={(id) => {
          setEditEventId(id);
          setScreen("editEvent");
        }}
      />
    );
  }

  if (screen === "interests")
    return <Interests onDoneHost={() => setScreen("hostEvents")} />;

  if (screen === "accessibility")
    return <Accessibility onDone={() => setScreen("nonHostEvents")} />;

  if (screen === "nonHostEvents")
    return <NonHostEvents />;

  return (
    <Login
      onSwitchToRegister={() => setScreen("register")}
      onLoggedIn={() => setScreen("boot")}
    />
  );
}

