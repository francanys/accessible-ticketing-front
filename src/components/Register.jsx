import { useState } from "react";
import { registerRequest } from "../api/auth";

export default function Register({ onSwitchToLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isHost, setIsHost] = useState(false);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMsg("");

    try {
      await registerRequest({ email, password, isHost });
      setMsg("Registered! Now log in.");
      setPassword("");
    } catch (err) {
      setError(err.message || "Register failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Register</h1>
      <p style={styles.subtitle}>Create your account to continue.</p>

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
            autoComplete="new-password"
          />


            <label style={styles.checkboxRow}>
            <input
              type="checkbox"
              checked={isHost}
              onChange={(e) => setIsHost(e.target.checked)}
              style={styles.checkbox}
            />
            <span style={styles.checkboxText}>Sign Up As Host</span>
            </label>



          <button
            style={{
              ...styles.button,
              opacity: loading || !email || !password ? 0.6 : 1,
            }}
            type="submit"
            disabled={loading || !email || !password}
          >
            {loading ? "Creating..." : "Create account"}
          </button>

          {msg ? <div style={styles.success}>{msg}</div> : null}
          {error ? <div style={styles.error}>{error}</div> : null}
        </form>
      </div>

      <button type="button" onClick={onSwitchToLogin} style={styles.linkBtn}>
        Already have an account? Log in
      </button>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "black",
    color: "white",
    padding: "clamp(16px, 4vw, 24px)",
    fontFamily: '"Antonio", system-ui, -apple-system, Segoe UI, Roboto, Arial',
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },

  title: {
    margin: 0,
    fontSize: 34,
    letterSpacing: -0.5,
    fontFamily: '"Anton", sans-serif',
    textAlign: "center",
    marginTop: 90,
  },

  subtitle: {
    marginTop: 8,
    marginBottom: 22,
    opacity: 0.7,
    textAlign: "center",
    maxWidth: 320,
  },

  card: {
    width: "100%",
    maxWidth: 420,
    border: "1px solid rgba(242, 0, 255, 0.45)",
    background: "#111",
    borderRadius: 18,
    padding: 16,
  },

  form: {
    display: "grid",
    gap: 12,
  },

  label: {
    fontSize: 12,
    opacity: 0.75,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginTop: 6,
  },

  input: {
    width: "100%",
    padding: "14px 14px",
    borderRadius: 14,
    border: "1px solid rgba(242,0,255,0.6)",
    background: "#151515",
    color: "white",
    outline: "none",
    fontSize: 16, // important on iPhone to avoid zoom
    boxSizing: "border-box",
  },

  button: {
    width: "100%",
    padding: "14px 14px",
    borderRadius: 14,
    border: "1px solid #F200FF",
    background: "#323232",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 8,
  },

  linkBtn: {
    marginTop: 16,
    background: "transparent",
    border: "none",
    color: "#ff7ad9",
    cursor: "pointer",
    textDecoration: "underline",
  },

  error: {
    marginTop: 10,
    textAlign: "center",
    color: "#ff7ad9",
  },

  success: {
    marginTop: 10,
    textAlign: "center",
    color: "#9dffb0",
  },
  checkboxRow: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    marginTop: 6,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(242,0,255,0.35)",
    background: "#151515",
    userSelect: "none",
  },
  checkbox: {
    width: 18,
    height: 18,
    accentColor: "#F200FF",
    cursor: "pointer",
  },
  checkboxText: {
    fontSize: 14,
    opacity: 0.9,
    cursor: "pointer",
  },
};
