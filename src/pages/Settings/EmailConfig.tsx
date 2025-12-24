import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";

export default function EmailConfig() {
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Email settings saved");
  };

  const handleTestEmail = () => {
    console.log("Sending test email...");
  };

  return (
    <>
      <PageMeta
        title="Email Configuration | JGPNR Admin Panel"
        description="Configure SMTP and email settings"
      />
      <PageBreadcrumb pageTitle="Email Configuration" />

      <div className="space-y-6">
        {/* SMTP Settings */}
        <ComponentCard
          title="SMTP Configuration"
          desc="Configure your email server settings"
        >
          <form onSubmit={handleSave} className="space-y-5">
            <div className="rounded-lg bg-blue-light-50 p-4 dark:bg-blue-light-500/10">
              <div className="flex gap-3">
                <svg
                  className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-light-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-blue-light-700 dark:text-blue-light-400">
                    Important
                  </p>
                  <p className="mt-1 text-sm text-blue-light-600 dark:text-blue-light-400">
                    Make sure to use SMTP credentials from a reliable email service provider
                    like Gmail, SendGrid, or Mailgun.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="smtp-host">SMTP Host</Label>
                <Input
                  type="text"
                  id="smtp-host"
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <Label htmlFor="smtp-port">SMTP Port</Label>
                <Input
                  type="number"
                  id="smtp-port"
                  placeholder="587"
                  defaultValue="587"
                />
              </div>
              <div>
                <Label htmlFor="smtp-username">Username / Email</Label>
                <Input
                  type="email"
                  id="smtp-username"
                  placeholder="your-email@example.com"
                />
              </div>
              <div>
                <Label htmlFor="smtp-password">Password</Label>
                <Input
                  type="password"
                  id="smtp-password"
                  placeholder="••••••••"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="smtp-encryption">Encryption Method</Label>
              <select
                id="smtp-encryption"
                className="h-11 w-full appearance-none rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 pr-11 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              >
                <option value="tls">TLS</option>
                <option value="ssl">SSL</option>
                <option value="none">None</option>
              </select>
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="smtp-auth"
                defaultChecked
                className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <Label htmlFor="smtp-auth" className="mb-0">
                Require authentication
              </Label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="primary" size="md">
                Save Configuration
              </Button>
              <Button type="button" variant="outline" size="md" onClick={handleTestEmail}>
                Send Test Email
              </Button>
            </div>
          </form>
        </ComponentCard>

        {/* Sender Information */}
        <ComponentCard
          title="Sender Information"
          desc="Configure the sender details for outgoing emails"
        >
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="sender-name">Sender Name</Label>
                <Input
                  type="text"
                  id="sender-name"
                  placeholder="JGPNR Paintball"
                  defaultValue="JGPNR Paintball"
                />
              </div>
              <div>
                <Label htmlFor="sender-email">Sender Email</Label>
                <Input
                  type="email"
                  id="sender-email"
                  placeholder="noreply@jgpnr.ng"
                  defaultValue="noreply@jgpnr.ng"
                />
              </div>
              <div>
                <Label htmlFor="reply-to">Reply-To Email</Label>
                <Input
                  type="email"
                  id="reply-to"
                  placeholder="support@jgpnr.ng"
                  defaultValue="support@jgpnr.ng"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="md">
                Save Sender Info
              </Button>
            </div>
          </form>
        </ComponentCard>

        {/* Email Templates */}
        <ComponentCard
          title="Default Email Footer"
          desc="Add a footer that appears in all outgoing emails"
        >
          <form onSubmit={handleSave} className="space-y-5">
            <div>
              <Label htmlFor="email-footer">Footer Content</Label>
              <textarea
                id="email-footer"
                rows={5}
                className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                placeholder="Enter email footer content..."
                defaultValue="© 2024 JGPNR Paintball. All rights reserved.
123 Paintball Arena, Lagos, Nigeria
If you no longer wish to receive these emails, you can unsubscribe here."
              ></textarea>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="md">
                Save Footer
              </Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}