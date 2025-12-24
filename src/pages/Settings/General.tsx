import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";

export default function General() {
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Settings saved");
  };

  return (
    <>
      <PageMeta
        title="General Settings | JGPNR Admin Panel"
        description="Configure general application settings"
      />
      <PageBreadcrumb pageTitle="General Settings" />

      <div className="space-y-6">
        {/* Business Information */}
        <ComponentCard
          title="Business Information"
          desc="Update your business details"
        >
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="business-name">Business Name</Label>
                <Input
                  type="text"
                  id="business-name"
                  placeholder="JGPNR Paintball"
                  defaultValue="JGPNR Paintball"
                />
              </div>
              <div>
                <Label htmlFor="business-email">Business Email</Label>
                <Input
                  type="email"
                  id="business-email"
                  placeholder="info@jgpnr.ng"
                  defaultValue="info@jgpnr.ng"
                />
              </div>
              <div>
                <Label htmlFor="business-phone">Phone Number</Label>
                <Input
                  type="tel"
                  id="business-phone"
                  placeholder="+234 800 000 0000"
                  defaultValue="+234 800 000 0000"
                />
              </div>
              <div>
                <Label htmlFor="business-website">Website</Label>
                <Input
                  type="url"
                  id="business-website"
                  placeholder="https://jgpnr.ng"
                  defaultValue="https://jgpnr.ng"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="business-address">Business Address</Label>
              <textarea
                id="business-address"
                rows={3}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                placeholder="Enter business address"
                defaultValue="123 Paintball Arena, Lagos, Nigeria"
              ></textarea>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="md">
                Save Changes
              </Button>
            </div>
          </form>
        </ComponentCard>

        {/* Operating Hours */}
        <ComponentCard
          title="Operating Hours"
          desc="Set your business operating hours"
        >
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="weekday-open">Weekday Opening Time</Label>
                <Input
                  type="time"
                  id="weekday-open"
                  defaultValue="09:00"
                />
              </div>
              <div>
                <Label htmlFor="weekday-close">Weekday Closing Time</Label>
                <Input
                  type="time"
                  id="weekday-close"
                  defaultValue="20:00"
                />
              </div>
              <div>
                <Label htmlFor="weekend-open">Weekend Opening Time</Label>
                <Input
                  type="time"
                  id="weekend-open"
                  defaultValue="08:00"
                />
              </div>
              <div>
                <Label htmlFor="weekend-close">Weekend Closing Time</Label>
                <Input
                  type="time"
                  id="weekend-close"
                  defaultValue="22:00"
                />
              </div>
            </div>

            <div className="space-y-3">
              <Label>Days Open</Label>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
                  <div key={day} className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id={day}
                      defaultChecked
                      className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    />
                    <Label htmlFor={day} className="mb-0">
                      {day}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="md">
                Save Hours
              </Button>
            </div>
          </form>
        </ComponentCard>

        {/* Currency & Timezone */}
        <ComponentCard
          title="Regional Settings"
          desc="Configure currency and timezone"
        >
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                >
                  <option value="NGN">Nigerian Naira (₦)</option>
                  <option value="USD">US Dollar ($)</option>
                  <option value="GBP">British Pound (£)</option>
                  <option value="EUR">Euro (€)</option>
                </select>
              </div>
              <div>
                <Label htmlFor="timezone">Timezone</Label>
                <select
                  id="timezone"
                  className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                >
                  <option value="Africa/Lagos">West Africa Time (WAT)</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time (ET)</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="md">
                Save Settings
              </Button>
            </div>
          </form>
        </ComponentCard>

        {/* Notifications */}
        <ComponentCard
          title="Notification Preferences"
          desc="Manage notification settings"
        >
          <form onSubmit={handleSave} className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="mb-0">Email Notifications</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Receive email alerts for new orders
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
                  <Label className="mb-0">Low Stock Alerts</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Get notified when ticket inventory is low
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
                  <Label className="mb-0">Customer Updates</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Notifications for new customer registrations
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
                  <Label className="mb-0">Marketing Updates</Label>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Updates about new features and promotions
                  </p>
                </div>
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" variant="primary" size="md">
                Save Preferences
              </Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}