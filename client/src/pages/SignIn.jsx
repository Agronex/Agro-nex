// src/pages/SignIn.jsx
import React, { useState } from "react";
import { useAuth } from "../contexts/AuthContext.j/tsx";
import { useNavigate, Link } from "react-router-dom";

export default function SignIn() {
  const { signin, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState("");
  const nav = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setErr("");
    try {
      await signin(email, password);
      nav("/dashboard");
    } catch (error) {
      setErr(error.message);
    }
  }

  async function handleGoogle() {
    try {
      await signInWithGoogle();
      nav("/dashboard");
    } catch (e) {
      setErr(e.message);
    }
  }

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <div className="p-8 flex flex-col justify-center items-start bg-gradient-to-b from-aggro-50 to-white">
        <h2 className="text-4xl font-bold text-aggro-700 mb-2">Welcome back</h2>
        <p className="text-gray-600 mb-6">Please enter your details</p>

        <form onSubmit={handleSubmit} className="w-full max-w-md space-y-4">
          {err && <div className="text-red-600 bg-red-100 p-2 rounded">{err}</div>}
          <label className="block text-sm font-medium text-gray-700">Email address</label>
          <input
            required
            type="email"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-aggro-200"
            placeholder="you@example.com"
          />

          <label className="block text-sm font-medium text-gray-700">Password</label>
          <input
            required
            type="password"
            value={password}
            onChange={(e)=>setPassword(e.target.value)}
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-aggro-200"
            placeholder="••••••••"
          />

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4" /> Remember for 30 days
            </label>
            <Link to="/forgot" className="text-sm text-aggro-600">Forgot password</Link>
          </div>

          <button className="w-full py-3 rounded-lg bg-aggro-500 text-white font-semibold">Sign in</button>

          <button type="button" onClick={handleGoogle} className="w-full py-3 rounded-lg border flex items-center justify-center gap-2">
            <img src="https://www.gstatic.com/devrel-devsite/prod/vf8b6a3f3b2bb3dd4b2e0d6f7df3b1ae4a9f3de0d9f0a6d6a8f2bb6b875a8e3e7/firebase-logo.png" alt="g" className="w-5" />
            Sign in with Google
          </button>

          <div className="text-center text-sm text-gray-600">
            Don’t have an account? <Link className="text-aggro-600" to="/signup">Sign up</Link>
          </div>
        </form>
      </div>

      <div className="hidden lg:flex items-center justify-center bg-gradient-to-br from-aggro-100 to-aggro-50">
        <div className="max-w-lg p-8">
          <img src="/auth-illustration.png" alt="auth illustration" className="rounded-lg shadow-lg" />
        </div>
      </div>
    </div>
  );
}
