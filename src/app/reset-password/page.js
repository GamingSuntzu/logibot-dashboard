"use client";
import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import styles from "../login/LoginPage.module.css";
import Link from "next/link"; 

export default function ResetPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function handleReset(e) {
    e.preventDefault();

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`, 
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Check your email for the password reset link!");
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <form onSubmit={handleReset} style={{ background: "#fff", padding: "30px", borderRadius: "10px", width: "300px" }}>
        <h2 className="loginTitle">Reset Password</h2>
        <input
          type="email"
          placeholder="Your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ 
            color: "black",
            border: "1px solid #ccc",
            width: "100%", 
            margin: "5px 0", 
            padding: "8px" 
            }}
        />
        {error && <p style={{ color: "red" }}>{error}</p>}
        {message && <p style={{ color: "green" }}>{message}</p>}
        <button type="submit" className={styles.loginButton}>
          Send Reset Link
        </button>
        <p style={{ marginTop: "10px" }}>
          <Link href="/login" style={{ color: "#2179ee" }}>
            Back to home
          </Link>
        </p>
      </form>
    </div>
  );
}
