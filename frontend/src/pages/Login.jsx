import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  async function submit(e) {
    e.preventDefault();
    try {
      const { data } = await api.post("/auth/login", { email, password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      navigate("/dashboard");
    } catch (err) {
      setMessage(err.response?.data?.message || "Login failed");
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <img src="/logo3.png" alt="Logo" className="logo" />
        <h1>SplitIt</h1>
        <h2>Login</h2>
        <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
        <br></br><br></br>
        <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
        <br></br><br></br>
        <button>Login</button>
        <p>{message}</p>
        <span>New here? <Link to="/register">Create account</Link></span>
      </form>
    </div>
  );
}
