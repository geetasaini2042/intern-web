import React, { useEffect, useState } from "react";
import { apiGet, apiPut, apiPost } from "../../lib/api";

const DEFAULT_SETTINGS = {
  admin_name: "",
  admin_email: "",
  company_name: "Singodiya Technologies",
  website: "",
  support_email: "",
  phone: "",
  address: "Bassi, Jaipur, Rajasthan",
  timezone: "Asia/Kolkata",
};

export default function AdminSettings() {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [passwordForm, setPasswordForm] = useState({
    current_password: "",
    new_password: "",
    confirm_password: "",
  });

  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const [settingsMessage, setSettingsMessage] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const [activeTab, setActiveTab] = useState("profile");

  const loadSettings = async () => {
    setLoading(true);
    setSettingsError("");

    try {
      const res = await apiGet("/admin/settings");

      const data = res?.settings || res?.data || res || {};

      setSettings({
        ...DEFAULT_SETTINGS,
        ...data,
      });
    } catch (err) {
      console.error("Settings loading error:", err);
      setSettingsError(err?.message || "Unable to load settings.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSettingsSave = async (e) => {
    e.preventDefault();

    setSavingSettings(true);
    setSettingsError("");
    setSettingsMessage("");

    try {
      await apiPut("/admin/settings", settings);
      setSettingsMessage("Settings saved successfully.");
    } catch (err) {
      console.error("Settings save error:", err);
      setSettingsError(err?.message || "Unable to save settings.");
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    setPasswordError("");
    setPasswordMessage("");

    if (passwordForm.new_password.length < 8) {
      setPasswordError("New password must be at least 8 characters.");
      return;
    }

    if (passwordForm.new_password !== passwordForm.confirm_password) {
      setPasswordError("New password and confirmation do not match.");
      return;
    }

    setSavingPassword(true);

    try {
      await apiPost("/admin/change-password", {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password,
      });

      setPasswordMessage("Password changed successfully.");

      setPasswordForm({
        current_password: "",
        new_password: "",
        confirm_password: "",
      });
    } catch (err) {
      console.error("Password change error:", err);
      setPasswordError(err?.message || "Unable to change password.");
    } finally {
      setSavingPassword(false);
    }
  };

  const updateSetting = (key, value) => {
    setSettings((prev) => ({
      ...prev,
      [key]: value,
    }));
  };

  const tabs = [
    { id: "profile", label: "Admin Profile" },
    { id: "organization", label: "Organization" },
    { id: "security", label: "Security" },
  ];

  return (
    <div className="admin-settings">
      <style>{`
        .admin-settings {
          width:100%;
          color:#e8edf5;
          font-family:inherit;
        }
        .admin-settings * { box-sizing:border-box; }

        .settings-header {
          margin-bottom:24px;
        }

        .settings-header h1 {
          font-size:26px;
          font-weight:700;
          margin:0;
        }

        .settings-header p {
          color:#929db0;
          font-size:14px;
          margin:7px 0 0;
        }

        .settings-layout {
          display:grid;
          grid-template-columns:220px minmax(0,1fr);
          gap:20px;
          align-items:start;
        }

        .settings-sidebar {
          border:1px solid rgba(255,255,255,.08);
          background:rgba(255,255,255,.025);
          border-radius:14px;
          padding:8px;
          display:grid;
          gap:4px;
        }

        .settings-tab {
          border:0;
          width:100%;
          text-align:left;
          padding:12px 13px;
          border-radius:9px;
          background:transparent;
          color:#9ca8ba;
          cursor:pointer;
          font-size:14px;
          font-weight:500;
          transition:.2s;
        }

        .settings-tab:hover {
          background:rgba(255,255,255,.05);
          color:#fff;
        }

        .settings-tab.active {
          background:rgba(99,102,241,.14);
          color:#a5b4fc;
        }

        .settings-content {
          border:1px solid rgba(255,255,255,.08);
          background:rgba(255,255,255,.025);
          border-radius:14px;
          padding:24px;
          min-width:0;
        }

        .settings-section-header {
          margin-bottom:22px;
          padding-bottom:18px;
          border-bottom:1px solid rgba(255,255,255,.07);
        }

        .settings-section-header h2 {
          margin:0;
          font-size:19px;
          font-weight:700;
        }

        .settings-section-header p {
          color:#929db0;
          font-size:13px;
          margin:7px 0 0;
          line-height:1.5;
        }

        .settings-form {
          display:grid;
          gap:18px;
        }

        .settings-grid {
          display:grid;
          grid-template-columns:repeat(2,minmax(0,1fr));
          gap:16px;
        }

        .settings-field {
          display:grid;
          gap:7px;
          min-width:0;
        }

        .settings-field.full {
          grid-column:1/-1;
        }

        .settings-field label {
          color:#cbd5e1;
          font-size:13px;
          font-weight:600;
        }

        .settings-field input,
        .settings-field select,
        .settings-field textarea {
          width:100%;
          border:1px solid rgba(255,255,255,.1);
          background:#0f131b;
          color:#f1f5f9;
          padding:12px;
          border-radius:9px;
          outline:none;
          font-family:inherit;
          font-size:14px;
        }

        .settings-field input:focus,
        .settings-field select:focus,
        .settings-field textarea:focus {
          border-color:#6366f1;
        }

        .settings-field input::placeholder {
          color:#687386;
        }

        .settings-field small {
          font-size:12px;
          color:#7f8a9d;
        }

        .settings-save-btn {
          border:0;
          background:#6366f1;
          color:white;
          border-radius:9px;
          padding:11px 17px;
          font-size:14px;
          font-weight:600;
          cursor:pointer;
          justify-self:start;
        }

        .settings-save-btn:hover {
          background:#5558e8;
        }

        .settings-save-btn:disabled {
          opacity:.6;
          cursor:not-allowed;
        }

        .settings-alert {
          border-radius:9px;
          padding:12px 14px;
          margin-bottom:17px;
          font-size:13px;
        }

        .settings-alert-error {
          background:rgba(239,68,68,.1);
          color:#fca5a5;
          border:1px solid rgba(239,68,68,.18);
        }

        .settings-alert-success {
          background:rgba(34,197,94,.1);
          color:#86efac;
          border:1px solid rgba(34,197,94,.18);
        }

        .settings-password-note {
          background:rgba(99,102,241,.08);
          border:1px solid rgba(99,102,241,.15);
          color:#a5b4fc;
          padding:13px;
          border-radius:10px;
          font-size:13px;
          line-height:1.6;
        }

        .settings-loading {
          padding:40px;
          text-align:center;
          color:#929db0;
        }

        .settings-divider {
          height:1px;
          background:rgba(255,255,255,.07);
          margin:5px 0;
        }

        @media(max-width:800px) {
          .settings-layout {
            grid-template-columns:1fr;
          }

          .settings-sidebar {
            display:flex;
            overflow-x:auto;
          }

          .settings-tab {
            white-space:nowrap;
            width:auto;
          }
        }

        @media(max-width:550px) {
          .settings-header h1 { font-size:22px; }
          .settings-content { padding:17px; }
          .settings-grid { grid-template-columns:1fr; }
          .settings-field.full { grid-column:auto; }
        }
      `}</style>

      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your administrator account and organization configuration.</p>
      </div>

      {loading ? (
        <div className="settings-loading">Loading settings...</div>
      ) : (
        <div className="settings-layout">
          <div className="settings-sidebar">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                className={`settings-tab ${
                  activeTab === tab.id ? "active" : ""
                }`}
                onClick={() => {
                  setActiveTab(tab.id);
                  setSettingsMessage("");
                  setSettingsError("");
                  setPasswordMessage("");
                  setPasswordError("");
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="settings-content">
            {activeTab === "profile" && (
              <>
                <div className="settings-section-header">
                  <h2>Administrator Profile</h2>
                  <p>Update your personal administrator information.</p>
                </div>

                {settingsError && (
                  <div className="settings-alert settings-alert-error">
                    {settingsError}
                  </div>
                )}

                {settingsMessage && (
                  <div className="settings-alert settings-alert-success">
                    {settingsMessage}
                  </div>
                )}

                <form className="settings-form" onSubmit={handleSettingsSave}>
                  <div className="settings-grid">
                    <div className="settings-field">
                      <label>Full Name</label>
                      <input
                        value={settings.admin_name}
                        onChange={(e) =>
                          updateSetting("admin_name", e.target.value)
                        }
                        placeholder="Administrator name"
                      />
                    </div>

                    <div className="settings-field">
                      <label>Admin Email</label>
                      <input
                        type="email"
                        value={settings.admin_email}
                        onChange={(e) =>
                          updateSetting("admin_email", e.target.value)
                        }
                        placeholder="admin@example.com"
                      />
                    </div>

                    <div className="settings-field full">
                      <label>Timezone</label>
                      <select
                        value={settings.timezone}
                        onChange={(e) =>
                          updateSetting("timezone", e.target.value)
                        }
                      >
                        <option value="Asia/Kolkata">
                          India Standard Time (Asia/Kolkata)
                        </option>
                        <option value="UTC">UTC</option>
                        <option value="Asia/Dubai">Dubai</option>
                        <option value="Asia/Singapore">Singapore</option>
                        <option value="Europe/London">London</option>
                        <option value="America/New_York">New York</option>
                      </select>
                    </div>
                  </div>

                  <button
                    className="settings-save-btn"
                    type="submit"
                    disabled={savingSettings}
                  >
                    {savingSettings ? "Saving..." : "Save Profile"}
                  </button>
                </form>
              </>
            )}

            {activeTab === "organization" && (
              <>
                <div className="settings-section-header">
                  <h2>Organization Settings</h2>
                  <p>Configure your organization details and contact information.</p>
                </div>

                {settingsError && (
                  <div className="settings-alert settings-alert-error">
                    {settingsError}
                  </div>
                )}

                {settingsMessage && (
                  <div className="settings-alert settings-alert-success">
                    {settingsMessage}
                  </div>
                )}

                <form className="settings-form" onSubmit={handleSettingsSave}>
                  <div className="settings-grid">
                    <div className="settings-field full">
                      <label>Organization Name</label>
                      <input
                        value={settings.company_name}
                        onChange={(e) =>
                          updateSetting("company_name", e.target.value)
                        }
                        placeholder="Organization name"
                      />
                    </div>

                    <div className="settings-field">
                      <label>Website</label>
                      <input
                        type="url"
                        value={settings.website}
                        onChange={(e) =>
                          updateSetting("website", e.target.value)
                        }
                        placeholder="https://example.com"
                      />
                    </div>

                    <div className="settings-field">
                      <label>Support Email</label>
                      <input
                        type="email"
                        value={settings.support_email}
                        onChange={(e) =>
                          updateSetting("support_email", e.target.value)
                        }
                        placeholder="support@example.com"
                      />
                    </div>

                    <div className="settings-field">
                      <label>Contact Number</label>
                      <input
                        type="tel"
                        value={settings.phone}
                        onChange={(e) =>
                          updateSetting("phone", e.target.value)
                        }
                        placeholder="+91"
                      />
                    </div>

                    <div className="settings-field">
                      <label>Timezone</label>
                      <select
                        value={settings.timezone}
                        onChange={(e) =>
                          updateSetting("timezone", e.target.value)
                        }
                      >
                        <option value="Asia/Kolkata">India (IST)</option>
                        <option value="UTC">UTC</option>
                        <option value="Asia/Dubai">Dubai</option>
                        <option value="Asia/Singapore">Singapore</option>
                        <option value="Europe/London">London</option>
                        <option value="America/New_York">New York</option>
                      </select>
                    </div>

                    <div className="settings-field full">
                      <label>Address</label>
                      <input
                        value={settings.address}
                        onChange={(e) =>
                          updateSetting("address", e.target.value)
                        }
                        placeholder="Organization address"
                      />
                    </div>
                  </div>

                  <button
                    className="settings-save-btn"
                    type="submit"
                    disabled={savingSettings}
                  >
                    {savingSettings ? "Saving..." : "Save Organization Settings"}
                  </button>
                </form>
              </>
            )}

            {activeTab === "security" && (
              <>
                <div className="settings-section-header">
                  <h2>Security & Password</h2>
                  <p>Change your administrator account password.</p>
                </div>

                {passwordError && (
                  <div className="settings-alert settings-alert-error">
                    {passwordError}
                  </div>
                )}

                {passwordMessage && (
                  <div className="settings-alert settings-alert-success">
                    {passwordMessage}
                  </div>
                )}

                <div className="settings-password-note">
                  Use a strong password with at least 8 characters. Avoid using
                  passwords that you use on other websites.
                </div>

                <form className="settings-form" onSubmit={handlePasswordChange}>
                  <div className="settings-field">
                    <label>Current Password</label>
                    <input
                      required
                      type="password"
                      autoComplete="current-password"
                      value={passwordForm.current_password}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          current_password: e.target.value,
                        })
                      }
                      placeholder="Enter current password"
                    />
                  </div>

                  <div className="settings-divider" />

                  <div className="settings-field">
                    <label>New Password</label>
                    <input
                      required
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={passwordForm.new_password}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          new_password: e.target.value,
                        })
                      }
                      placeholder="Enter new password"
                    />
                    <small>Minimum 8 characters</small>
                  </div>

                  <div className="settings-field">
                    <label>Confirm New Password</label>
                    <input
                      required
                      type="password"
                      autoComplete="new-password"
                      minLength={8}
                      value={passwordForm.confirm_password}
                      onChange={(e) =>
                        setPasswordForm({
                          ...passwordForm,
                          confirm_password: e.target.value,
                        })
                      }
                      placeholder="Confirm new password"
                    />
                  </div>

                  <button
                    className="settings-save-btn"
                    type="submit"
                    disabled={savingPassword}
                  >
                    {savingPassword ? "Changing Password..." : "Change Password"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}