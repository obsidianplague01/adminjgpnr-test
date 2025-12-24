// src/pages/Settings/Security.tsx
import { useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";
import { isValidPassword } from "../../utils/validation";

export default function Security() {
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validatePassword = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!passwordData.currentPassword) {
      newErrors.currentPassword = "Current password is required";
    }

    if (!passwordData.newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (!isValidPassword(passwordData.newPassword)) {
      newErrors.newPassword =
        "Password must be at least 8 characters with uppercase, number, and special character";
    }

    if (!passwordData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validatePassword()) return;

    setIsLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log("Password updated");

    // Reset form
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

    setIsLoading(false);
  };

  return (
    <>
      <PageMeta
        title="Security Settings | JGPNR Admin Panel"
        description="Configure security and authentication settings"
      />
      <PageBreadcrumb pageTitle="Security Settings" />

      <div className="space-y-6">
        {/* Change Password */}
        <ComponentCard title="Change Password" desc="Update your admin account password">
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                type="password"
                id="currentPassword"
                value={passwordData.currentPassword}
                onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
                error={errors.currentPassword}
                placeholder="Enter current password"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  type="password"
                  id="newPassword"
                  value={passwordData.newPassword}
                  onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
                  error={errors.newPassword}
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  type="password"
                  id="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
                  error={errors.confirmPassword}
                  placeholder="Confirm new password"
                />
              </div>
            </div>

            <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
              <h5 className="mb-2 text-sm font-medium text-gray-900 dark:text-white/90">
                Password Requirements:
              </h5>
              <ul className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Minimum 8 characters
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  At least one uppercase letter
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  At least one number
                </li>
                <li className="flex items-center gap-2">
                  <svg
                    className="h-4 w-4 text-gray-400"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  At least one special character
                </li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="md" disabled={isLoading}>
                {isLoading ? "Updating..." : "Update Password"}
              </Button>
            </div>
          </form>
        </ComponentCard>

        {/* Two-Factor Authentication */}
        <ComponentCard
          title="Two-Factor Authentication"
          desc="Add an extra layer of security to your account"
        >
          <div className="space-y-5">
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-warning-100 dark:bg-warning-500/20">
                  <svg
                    className="h-6 w-6 text-warning-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h5 className="font-medium text-gray-900 dark:text-white/90">
                    2FA is currently disabled
                  </h5>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Enable two-factor authentication to protect your account with an extra layer of
                    security.
                  </p>
                </div>
              </div>
            </div>

            <Button variant="primary" size="md">
              Enable Two-Factor Authentication
            </Button>
          </div>
        </ComponentCard>

        {/* Login Activity */}
        <ComponentCard title="Login Activity" desc="Recent login attempts and sessions">
          <div className="space-y-4">
            {[
              {
                device: "Chrome on Windows",
                location: "Lagos, Nigeria",
                time: "2 hours ago",
                status: "success",
              },
              {
                device: "Safari on iPhone",
                location: "Lagos, Nigeria",
                time: "1 day ago",
                status: "success",
              },
              {
                device: "Firefox on Mac",
                location: "Abuja, Nigeria",
                time: "3 days ago",
                status: "failed",
              },
            ].map((activity, index) => (
              <div
                key={index}
                className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-800"
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                      activity.status === "success"
                        ? "bg-success-100 dark:bg-success-500/20"
                        : "bg-error-100 dark:bg-error-500/20"
                    }`}
                  >
                    <svg
                      className={`h-5 w-5 ${
                        activity.status === "success" ? "text-success-500" : "text-error-500"
                      }`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      {activity.status === "success" ? (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      ) : (
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      )}
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white/90">
                      {activity.device}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.location} • {activity.time}
                    </p>
                  </div>
                </div>
                <Badge size="sm" color={activity.status === "success" ? "success" : "error"}>
                  {activity.status}
                </Badge>
              </div>
            ))}
          </div>
        </ComponentCard>

        {/* Session Management */}
        <ComponentCard title="Session Management" desc="Manage active sessions and devices">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="auto-logout"
                defaultChecked
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <Label htmlFor="auto-logout" className="mb-0">
                Automatically log out after 30 minutes of inactivity
              </Label>
            </div>

            <Button variant="outline" size="md">
              Log Out All Other Devices
            </Button>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}