"use client";
import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";
import Image from "next/image"; //import Next.js Image
import styles from "./LoginPage.module.css";
import { FaEye, FaEyeSlash } from "react-icons/fa"; // 👁️ import icons
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); // 👁️ state toggle
  const [error, setError] = useState("");

async function handleLogin(e) {
  e.preventDefault();
  setError("");

  // Step 1 — authenticate with Supabase
  const { data: authResult, error: authError } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    });

  if (authError) {
    setError(authError.message);
    return;
  }

  const user = authResult.user;

  // Step 2 — find the client associated with this auth user
  const { data: mapping, error: mappingError } = await supabase
    .from("client_users")
    .select("client_id, role")
    .eq("auth_id", user.id)
    .single();

  if (mappingError || !mapping) {
    setError("Your account is not linked to any client.");
    return;
  }

  // Step 3 — store client_id & role for dashboard usage
  localStorage.setItem("client_id", mapping.client_id);
  localStorage.setItem("role", mapping.role);

  // Step 4 — redirect to dashboard
  router.push("/");
}


  return (
    <div 
      style={{ 
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
        backgroundColor: "rgba(0, 0, 0, 0.5)", 
      }}
    >
      <div style={{ textAlign: "center" }}>
        {/* ✅ Logo placed here */}
        <Image
          src="/rough-logo.png"
          alt="LogiBot.id Logo"
          width={300}  // match the form width
          height={80}  // adjust as needed
          style={{ marginBottom: "15px" }}
        />

      <form
        onSubmit={handleLogin}
        style={{ 
          background: "#fff",
          padding: "30px", 
          borderRadius: "10px", 
          width: "300px",
          boxShadow: "10px 10px 12px rgba(33, 95, 154, 0.5)"
        }}
      >
        <h2 className="loginTitle">Log in</h2>
        <input
          type="email"
          placeholder="Email"
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

        {/* 👁️ Password field with toggle */}
        <div className={styles.passwordWrapper}>
          <input
            type={showPassword ? "text" : "password"}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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

        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit" className={styles.loginButton}>
          Log in
        </button>
        <p style={{ marginTop: "10px" }}>
          <Link href="/reset-password" style={{ color: "#2179ee" }}>
            Forgot password?
          </Link>
        </p>
      </form>
    </div>
    </div>
  );
}
