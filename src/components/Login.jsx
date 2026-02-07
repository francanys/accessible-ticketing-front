// src/components/Login.jsx
import { useState } from "react";
import { loginRequest } from "../api/auth";

export default function Login({ onLoggedIn, onSwitchToRegister }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
  
    try {
      const data = await loginRequest({ email, password });
      console.log("[LOGIN] loginRequest returned:", data);
  
      if (!data?.user?.id) {
        throw new Error("Login succeeded but user was missing");
      }
  
      onLoggedIn?.(data);
    } catch (err) {
      console.error("[LOGIN] error:", err);
      setError(err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div style={styles.page}>
      <div style={styles.scale}>
        <h1 style={styles.title}>Login</h1>
        <p style={styles.subtitle}>Welcome back. Log in to continue.</p>

        <div style={styles.card}>
          <form onSubmit={onSubmit} style={styles.form}>
            <label style={styles.label}>Email</label>
            <input
              style={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="test@example.com"
              autoComplete="email"
            />

            <label style={styles.label}>Password</label>
            <input
              style={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password123!"
              type="password"
              autoComplete="current-password"
            />

            <button
              style={{
                ...styles.button,
                opacity: loading || !email || !password ? 0.6 : 1,
              }}
              type="submit"
              disabled={loading || !email || !password}
            >
              {loading ? "Logging in..." : "Log in"}
            </button>

            {error ? <div style={styles.error}>{error}</div> : null}
          </form>
        </div>

        <button type="button" onClick={onSwitchToRegister} style={styles.linkBtn}>
          New here? Register
        </button>
      </div>
    </div>
  );
}

const styles = {
  page: {
    height: "100svh",
    width: "100%",
    background: "black",
    color: "white",
    padding: "clamp(12px, 4vw, 20px)",
    fontFamily: '"Antonio", system-ui, -apple-system, Segoe UI, Roboto, Arial',
    display: "grid",
    placeItems: "center",
    overflow: "hidden",
  },

  scale: {
    width: "100%",
    maxWidth: 360,
    transform: "scale(0.92)",
    transformOrigin: "center",
    paddingTop: 16,
  },

  title: {
    margin: 0,
    fontSize: 30,
    letterSpacing: -0.5,
    fontFamily: '"Anton", sans-serif',
    textAlign: "center",
    marginTop: 0,
  },

  subtitle: {
    marginTop: 6,
    marginBottom: 18,
    opacity: 0.7,
    textAlign: "center",
    maxWidth: 320,
    fontSize: 14,
  },

  card: {
    width: "100%",
    border: "1px solid rgba(242, 0, 255, 0.45)",
    background: "#111",
    borderRadius: 16,
    padding: 14,
    boxSizing: "border-box",
  },

  form: {
    display: "grid",
    gap: 10,
  },

  label: {
    fontSize: 11,
    opacity: 0.75,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 4,
  },

  input: {
    width: "100%",
    padding: "12px 12px",
    borderRadius: 12,
    border: "1px solid rgba(242,0,255,0.6)",
    background: "#151515",
    color: "white",
    outline: "none",
    fontSize: 16,
    boxSizing: "border-box",
  },

  button: {
    width: "100%",
    padding: "12px",
    borderRadius: 12,
    border: "1px solid #F200FF",
    background: "#323232",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 6,
  },

  linkBtn: {
    marginTop: 14,
    background: "transparent",
    border: "none",
    color: "#ff7ad9",
    cursor: "pointer",
    textDecoration: "underline",
    fontSize: 14,
    width: "100%",
    textAlign: "center",
  },

  error: {
    marginTop: 8,
    textAlign: "center",
    color: "#ff7ad9",
    fontSize: 14,
  },
};
