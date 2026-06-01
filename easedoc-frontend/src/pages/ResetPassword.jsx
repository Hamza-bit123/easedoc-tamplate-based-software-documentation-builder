import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import api from "../api/axios";
import toast from "react-hot-toast";
import "./Auth.css";

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  const email = searchParams.get("email");
  const navigate = useNavigate();

  const [form, setForm] = useState({
    password: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!token || !email) {
      toast.error("Invalid or missing reset token.");
      navigate("/login");
    }
  }, [token, email, navigate]);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const res = await api.post("/users/reset-password", {
        email,
        token,
        newPassword: form.password,
      });

      toast.success(res.data.message || "Password has been reset successfully!");
      navigate("/login");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to reset password";
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <Link to="/" className="auth-logo" style={{ textDecoration: 'none', color: 'inherit' }}>
            <span className="logo-sparkle">✦</span>
            <span>EasDoc</span>
          </Link>
          <h2>Set New Password</h2>
          <p>Please enter your new password below.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <input
            className="auth-input"
            type="password"
            name="password"
            placeholder="New Password"
            value={form.password}
            onChange={handleChange}
            required
            minLength={6}
            disabled={loading}
          />

          <input
            className="auth-input"
            type="password"
            name="confirmPassword"
            placeholder="Confirm New Password"
            value={form.confirmPassword}
            onChange={handleChange}
            required
            minLength={6}
            disabled={loading}
          />

          <button className="auth-btn" type="submit" disabled={loading}>
            {loading ? "Resetting..." : "Reset Password"}
          </button>
        </form>

        <p className="auth-footer" style={{ marginTop: "1rem" }}>
          <Link to="/login">Cancel and go to Login</Link>
        </p>
      </div>
    </div>
  );
};

export default ResetPassword;
