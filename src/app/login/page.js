"use client";
import { useState } from "react";
import { supabase } from "../../../lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  async function handleLogin(e) {
    e.preventDefault();

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    } else {
      // redirect to dashboard if successful
      router.push("/");
    }
  }

  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
      <form
        onSubmit={handleLogin}
        style={{ background: "#fff", padding: "30px", borderRadius: "8px", width: "300px" }}
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
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{
            color: "black",
            border: "1px solid #ccc",
            width: "100%", 
            margin: "5px 0", 
            padding: "8px" }}
        />
        {error && <p style={{ color: "red" }}>{error}</p>}
        <button type="submit" style={{ width: "100%", padding: "10px", background: "#2068afff", color: "white" }}>
          Log in
        </button>
      </form>
    </div>
  );
}
