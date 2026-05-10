import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../api/axios";
import "./Auth.css"; // Import the CSS file
import toast from "react-hot-toast";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const Register = () => {
  const [form, setForm] = useState({
    fullName: "",
    email: "",
    password: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [pendingEmail, setPendingEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  const [codeDigits, setCodeDigits] = useState(["", "", "", "", "", ""]);
  const inputRefs = useRef([]);

  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); // Clear previous errors

    const email = form.email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(email)) {
      const msg = "Please enter a valid email address";
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post("/users/register", {
        ...form,
        email,
      });
      setPendingEmail(res.data?.email || email);
      toast.success(res.data?.message || "Verification code sent to your email.");
    } catch (err) {
      const msg = err.response?.data?.message || "Registration failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async (e) => {
    e.preventDefault();
    setError("");

    const cleanCode = codeDigits.join("").trim();

    if (!/^\d{6}$/.test(cleanCode)) {
      const msg = "Enter the 6-digit verification code";
      setError(msg);
      toast.error(msg);
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post("/users/verify-email", {
        email: pendingEmail,
        code: cleanCode,
      });
      toast.success(res.data?.message || "Email verified! Please login.");
      navigate("/login");
    } catch (err) {
      const msg = err.response?.data?.message || "Email verification failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDigitChange = (index, value) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const newDigits = [...codeDigits];
    newDigits[index] = digit;
    setCodeDigits(newDigits);

    if (digit && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === "Backspace" && !codeDigits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!pastedData) return;

    const newDigits = [...codeDigits];
    for (let i = 0; i < pastedData.length; i++) {
      newDigits[i] = pastedData[i];
    }
    setCodeDigits(newDigits);

    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleResendCode = async () => {
    setError("");

    try {
      setIsResending(true);
      const res = await api.post("/users/resend-verification-code", {
        email: pendingEmail,
      });
      toast.success(res.data?.message || "A new verification code has been sent.");
    } catch (err) {
      const msg = err.response?.data?.message || "Failed to resend verification code";
      setError(msg);
      toast.error(msg);
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-header">
          <div className="auth-logo">
            <span className="logo-sparkle">✦</span>
            <span>EasDoc</span>
          </div>
          <h2>{pendingEmail ? "Verify Email" : "Create Account"}</h2>
          <p>
            {pendingEmail
              ? `Enter the code sent to ${pendingEmail}`
              : "Join EaseDoc to start documenting"}
          </p>
        </div>

        {error && <div className="auth-error">{error}</div>}

        {pendingEmail ? (
          <form className="auth-form" onSubmit={handleVerify}>
            <div className="verification-code-container" onPaste={handlePaste}>
              {codeDigits.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  className="auth-input digit-box"
                  type="text"
                  inputMode="numeric"
                  maxLength="1"
                  value={digit}
                  onChange={(e) => handleDigitChange(index, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(index, e)}
                  required
                />
              ))}
            </div>

            <button className="auth-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Verifying..." : "Verify Email"}
            </button>

            <button
              className="auth-link-btn"
              type="button"
              onClick={handleResendCode}
              disabled={isResending}
            >
              {isResending ? "Sending..." : "Resend Code"}
            </button>
          </form>
        ) : (
          <form className="auth-form" onSubmit={handleSubmit}>
            <input
              className="auth-input"
              type="text"
              name="fullName"
              placeholder="Full Name"
              value={form.fullName}
              onChange={handleChange}
              required
            />

            <input
              className="auth-input"
              type="email"
              name="email"
              placeholder="Email Address"
              value={form.email}
              onChange={handleChange}
              required
            />

            <input
              className="auth-input"
              type="password"
              name="password"
              placeholder="Create Password"
              value={form.password}
              onChange={handleChange}
              required
            />

            <button className="auth-btn" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending Code..." : "Register"}
            </button>
          </form>
        )}

        <p className="auth-footer">
          Already have an account? <Link to="/login">Login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
