"use client";
import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import styles from "../login/LoginPage.module.css";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // 👁️ import icons
import Link from "next/link"; 

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState(""); // retype password
  const [showPassword, setShowPassword] = useState(false); // toggle 👁️
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // toggle for confirm
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function handleUpdate(e) {
    e.preventDefault();

    // ✅ simple validation
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setError(error.message);
    } else {
      setError("");
      setMessage("Password updated! You can now log in.");
      setTimeout(() => router.push("/login"), 2000);
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <form 
        onSubmit={handleUpdate} 
        style={{ background: "#fff", padding: "30px", borderRadius: "10px", width: "300px", boxShadow: "10px 10px 12px rgba(33, 95, 154, 0.5)" }}
      >
        <h2 className="loginTitle">Set New Password</h2>

        {/* New password with toggle 👁️ */}
        <div className={styles.passwordWrapper}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={styles.input}
          />
          <button
            type="button"
            className={styles.eyeButton}
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        {/* Confirm password with toggle 👁️ */}
        <div className={styles.passwordWrapper}>
          <input
            type={showConfirmPassword ? "text" : "password"}
            placeholder="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className={styles.input}
          />
          <button
            type="button"
            className={styles.eyeButton}
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
          >
            {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
          </button>
        </div>

        {error && <p style={{ color: "red" }}>{error}</p>}
        {message && <p style={{ color: "green" }}>{message}</p>}

        <button type="submit" className={styles.loginButton}>
          Update Password
        </button>
        <Link href="/login" style={{ color: "#2179ee" }}>
            Back to home
          </Link>
      </form>
    </div>
  );
}
