export default function BottomMenu({ screen, setScreen, isHost }) {
    const active = (s) => screen === s;
  
    // Decide what "home" means
    const goHome = () => setScreen(isHost ? "hostEvents" : "nonHostEvents");
  
    return (
      <div style={styles.bottomNav}>
        <button
          type="button"
          onClick={goHome}
          style={{ ...styles.navBtn, ...(active(isHost ? "hostEvents" : "nonHostEvents") ? styles.active : {}) }}
          aria-label="Home"
          title="Home"
        >
          ⌂
        </button>
  
        <button
          type="button"
          onClick={() => setScreen("favourites")}
          style={{ ...styles.navBtn, ...(active("favourites") ? styles.active : {}) }}
          aria-label="Favourites"
          title="Favourites"
        >
          ♡
        </button>
  
        <button
          type="button"
          onClick={() => setScreen("profile")}
          style={{ ...styles.navBtn, ...(active("profile") ? styles.active : {}) }}
          aria-label="Profile"
          title="Profile"
        >
          👤
        </button>
      </div>
    );
  }
  
  const styles = {
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
    navBtn: {
      background: "transparent",
      border: "none",
      cursor: "pointer",
      fontSize: 22,
      opacity: 0.85,
      color: "rgba(255,255,255,0.8)",
    },
    active: {
      color: "#F200FF",
      opacity: 1,
    },
  };
  