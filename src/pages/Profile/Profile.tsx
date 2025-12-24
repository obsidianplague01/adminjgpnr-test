// src/pages/Profile/Profile.tsx
import { useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";

export default function Profile() {
  const [formData, setFormData] = useState({
    firstName: "Admin",
    lastName: "User",
    email: "admin@jgpnr.ng",
    phone: "+234 800 000 0000",
    whatsapp: "+234 800 000 0000",
    location: "Lagos, Nigeria",
    bio: "JGPNR Paintball Admin",
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Profile updated:", formData);
    // Show success message
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      alert("Passwords do not match!");
      return;
    }
    console.log("Password updated");
    setPasswordData({ currentPassword: "", newPassword: "", confirmPassword: "" });
    // Show success message
  };

  return (
    <>
      <PageMeta
        title="My Profile | JGPNR Admin Panel"
        description="Manage your admin profile settings"
      />
      <PageBreadcrumb pageTitle="My Profile" />

      <div className="space-y-6">
        {/* Profile Photo */}
        <ComponentCard title="Profile Photo" desc="Update your profile picture">
          <div className="flex items-center gap-6">
            <div className="h-24 w-24 overflow-hidden rounded-full border-4 border-gray-200 dark:border-gray-800">
              <img
                src="/images/user/owner.jpg"
                alt="Profile"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex-1">
              <p className="mb-2 text-sm text-gray-600 dark:text-gray-400">
                JPG, GIF or PNG. Max size of 2MB
              </p>
              <div className="flex gap-3">
                <Button variant="primary" size="sm">
                  Upload New Photo
                </Button>
                <Button variant="outline" size="sm">
                  Remove
                </Button>
              </div>
            </div>
          </div>
        </ComponentCard>

        {/* Personal Information */}
        <ComponentCard
          title="Personal Information"
          desc="Update your personal details"
        >
          <form onSubmit={handleProfileSubmit} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="firstName">First Name</Label>
                <Input
                  type="text"
                  id="firstName"
                  name="firstName"
                  value={formData.firstName}
                  onChange={handleInputChange}
                  placeholder="Enter your first name"
                />
              </div>
              <div>
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  type="text"
                  id="lastName"
                  name="lastName"
                  value={formData.lastName}
                  onChange={handleInputChange}
                  placeholder="Enter your last name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email Address</Label>
                <Input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="Enter your email"
                />
              </div>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp Number</Label>
                <Input
                  type="tel"
                  id="whatsapp"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleInputChange}
                  placeholder="Enter your WhatsApp number"
                />
              </div>
              <div>
                <Label htmlFor="location">Location</Label>
                <Input
                  type="text"
                  id="location"
                  name="location"
                  value={formData.location}
                  onChange={handleInputChange}
                  placeholder="Enter your location"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="bio">Bio</Label>
              <textarea
                id="bio"
                name="bio"
                rows={4}
                value={formData.bio}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                placeholder="Write something about yourself..."
              />
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="md">
                Save Changes
              </Button>
            </div>
          </form>
        </ComponentCard>

        {/* Change Password */}
        <ComponentCard
          title="Change Password"
          desc="Update your password regularly for security"
        >
          <form onSubmit={handlePasswordSubmit} className="space-y-5">
            <div>
              <Label htmlFor="currentPassword">Current Password</Label>
              <Input
                type="password"
                id="currentPassword"
                name="currentPassword"
                value={passwordData.currentPassword}
                onChange={handlePasswordChange}
                placeholder="Enter current password"
              />
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="newPassword">New Password</Label>
                <Input
                  type="password"
                  id="newPassword"
                  name="newPassword"
                  value={passwordData.newPassword}
                  onChange={handlePasswordChange}
                  placeholder="Enter new password"
                />
              </div>
              <div>
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  type="password"
                  id="confirmPassword"
                  name="confirmPassword"
                  value={passwordData.confirmPassword}
                  onChange={handlePasswordChange}
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
                  <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Minimum 8 characters
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  At least one uppercase letter
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  At least one number
                </li>
                <li className="flex items-center gap-2">
                  <svg className="h-4 w-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  At least one special character
                </li>
              </ul>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="md">
                Update Password
              </Button>
            </div>
          </form>
        </ComponentCard>

        {/* Notification Preferences */}
        <ComponentCard
          title="Notification Preferences"
          desc="Manage how you receive notifications"
        >
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="mb-0">Email Notifications</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Receive email alerts for new orders and activities
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="mb-0">SMS Notifications</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Get SMS alerts for important updates
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="mb-0">WhatsApp Notifications</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Receive updates via WhatsApp
                </p>
              </div>
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="mb-0">Weekly Summary</Label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Get a weekly summary of your activities
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
            </div>
          </div>
        </ComponentCard>
      </div>
    </>
  );
}