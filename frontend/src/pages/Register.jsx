import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../api";

export default function Register() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [message, setMessage] = useState("");

  function change(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function submit(e) {
    e.preventDefault();
    try {
      await api.post("/auth/register", form);
      setMessage("Registration successful. Redirecting...");
      setTimeout(() => navigate("/login"), 700);
    } catch (err) {
      setMessage(err.response?.data?.message || "Registration failed");
    }
  }

  return (
    <div className="auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <img src="/logo3.png" alt="Logo" className="logo" />
        <h1>SplitIt</h1>
        <h2>Create account</h2>
        <input name="name" placeholder="Name" value={form.name} onChange={change} required />
        <br></br><br></br>
        <input name="email" type="email" placeholder="Email" value={form.email} onChange={change} required />
        <br></br><br></br>
        <input name="password" type="password" placeholder="Password" value={form.password} onChange={change} required />
        <br></br><br></br>
        <button>Create account</button>
        <p>{message}</p>
        <span>Already registered? <Link to="/login">Login</Link></span>
      </form>
    </div>
  );
}
