import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import Button from "../../components/ui/button/Button";

export default function SendCampaign() {
  const templateOptions = [
    { value: "welcome", label: "Welcome Email" },
    { value: "promo", label: "Promotional Offer" },
    { value: "event", label: "Event Announcement" },
    { value: "newsletter", label: "Monthly Newsletter" },
  ];

  const audienceOptions = [
    { value: "all", label: "All Subscribers" },
    { value: "active", label: "Active Customers" },
    { value: "inactive", label: "Inactive Customers" },
    { value: "new", label: "New Subscribers" },
  ];

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Campaign sent");
  };

  return (
    <>
      <PageMeta
        title="Send Campaign | JGPNR Admin Panel"
        description="Create and send email campaigns"
      />
      <PageBreadcrumb pageTitle="Send Campaign" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ComponentCard
            title="Campaign Details"
            desc="Configure your email campaign"
          >
            <form onSubmit={handleSend} className="space-y-5">
              <div>
                <Label htmlFor="campaign-name">Campaign Name</Label>
                <Input
                  type="text"
                  id="campaign-name"
                  placeholder="Enter campaign name"
                />
              </div>

              <div>
                <Label htmlFor="subject">Email Subject</Label>
                <Input
                  type="text"
                  id="subject"
                  placeholder="Enter email subject"
                />
              </div>

              <div>
                <Label htmlFor="template">Email Template</Label>
                <Select
                  options={templateOptions}
                  placeholder="Select template"
                  onChange={(value) => console.log(value)}
                />
              </div>

              <div>
                <Label htmlFor="audience">Target Audience</Label>
                <Select
                  options={audienceOptions}
                  placeholder="Select audience"
                  onChange={(value) => console.log(value)}
                />
              </div>

              <div>
                <Label htmlFor="preview-text">Preview Text</Label>
                <Input
                  type="text"
                  id="preview-text"
                  placeholder="Short preview text"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  This text appears in email previews (50-100 characters)
                </p>
              </div>

              <div>
                <Label htmlFor="message">Message Body</Label>
                <textarea
                  id="message"
                  rows={8}
                  className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
                  placeholder="Enter your email message..."
                ></textarea>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="send-test"
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <Label htmlFor="send-test" className="mb-0">
                  Send test email before launching campaign
                </Label>
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" size="md">
                  Save as Draft
                </Button>
                <Button type="button" variant="outline" size="md">
                  Send Test
                </Button>
                <Button type="submit" variant="primary" size="md">
                  Send Campaign
                </Button>
              </div>
            </form>
          </ComponentCard>
        </div>

        <div>
          <ComponentCard title="Campaign Stats" desc="Preview audience reach">
            <div className="space-y-4">
              <div className="rounded-lg bg-brand-50 p-4 dark:bg-brand-500/10">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Recipients
                </p>
                <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-white/90">
                  234
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Active Subscribers
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white/90">
                    210
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    New Subscribers
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white/90">
                    24
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Estimated Cost
                  </span>
                  <span className="text-sm font-medium text-gray-900 dark:text-white/90">
                    ₦500
                  </span>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4 dark:border-gray-800">
                <h4 className="mb-2 text-sm font-semibold text-gray-900 dark:text-white/90">
                  Best Time to Send
                </h4>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  Based on past engagement, the best time to send is{" "}
                  <span className="font-medium text-gray-900 dark:text-white/90">
                    Tuesday at 10:00 AM
                  </span>
                </p>
              </div>
            </div>
          </ComponentCard>
        </div>
      </div>
    </>
  );
}