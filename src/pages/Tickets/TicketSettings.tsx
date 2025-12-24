import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Select from "../../components/form/Select";
import Button from "../../components/ui/button/Button";

export default function TicketSettings() {
  const sessionOptions = [
    { value: "morning", label: "Morning Session (9:00 AM - 12:00 PM)" },
    { value: "afternoon", label: "Afternoon Session (1:00 PM - 4:00 PM)" },
    { value: "evening", label: "Evening Session (5:00 PM - 8:00 PM)" },
    { value: "weekend", label: "Weekend Special (10:00 AM - 6:00 PM)" },
  ];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    // Handle save logic
    console.log("Settings saved");
  };

  return (
    <>
      <PageMeta
        title="Ticket Settings | JGPNR Admin Panel"
        description="Configure ticket pricing and availability"
      />
      <PageBreadcrumb pageTitle="Ticket Settings" />

      <div className="space-y-6">
        {/* Pricing Settings */}
        <ComponentCard
          title="Ticket Pricing"
          desc="Configure pricing for different ticket types"
        >
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="regular-price">Regular Ticket Price (₦)</Label>
                <Input
                  type="number"
                  id="regular-price"
                  placeholder="2,500"
                  defaultValue="2500"
                />
              </div>
              <div>
                <Label htmlFor="group-price">Group Ticket Price (₦)</Label>
                <Input
                  type="number"
                  id="group-price"
                  placeholder="2,000"
                  defaultValue="2000"
                />
              </div>
              <div>
                <Label htmlFor="weekend-price">Weekend Ticket Price (₦)</Label>
                <Input
                  type="number"
                  id="weekend-price"
                  placeholder="3,000"
                  defaultValue="3000"
                />
              </div>
              <div>
                <Label htmlFor="vip-price">VIP Ticket Price (₦)</Label>
                <Input
                  type="number"
                  id="vip-price"
                  placeholder="5,000"
                  defaultValue="5000"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="md">
                Save Pricing
              </Button>
            </div>
          </form>
        </ComponentCard>

        {/* Session Settings */}
        <ComponentCard
          title="Game Sessions"
          desc="Manage available game sessions and capacity"
        >
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="session-type">Session Type</Label>
                <Select
                  options={sessionOptions}
                  placeholder="Select session"
                  onChange={(value) => console.log(value)}
                />
              </div>
              <div>
                <Label htmlFor="max-capacity">Maximum Capacity</Label>
                <Input
                  type="number"
                  id="max-capacity"
                  placeholder="50"
                  defaultValue="50"
                />
              </div>
              <div>
                <Label htmlFor="session-duration">Duration (minutes)</Label>
                <Input
                  type="number"
                  id="session-duration"
                  placeholder="120"
                  defaultValue="120"
                />
              </div>
              <div>
                <Label htmlFor="buffer-time">Buffer Time (minutes)</Label>
                <Input
                  type="number"
                  id="buffer-time"
                  placeholder="30"
                  defaultValue="30"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="md">
                Save Session Settings
              </Button>
            </div>
          </form>
        </ComponentCard>

        {/* Ticket Validity */}
        <ComponentCard
          title="Ticket Validity"
          desc="Configure ticket expiration and usage rules"
        >
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="validity-days">Valid for (days)</Label>
                <Input
                  type="number"
                  id="validity-days"
                  placeholder="30"
                  defaultValue="30"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Number of days from purchase date
                </p>
              </div>
              <div>
                <Label htmlFor="booking-advance">Advance Booking (days)</Label>
                <Input
                  type="number"
                  id="booking-advance"
                  placeholder="7"
                  defaultValue="7"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  How many days in advance can tickets be booked
                </p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allow-refunds"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <Label htmlFor="allow-refunds" className="mb-0">
                  Allow ticket refunds (up to 24 hours before session)
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="allow-transfer"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <Label htmlFor="allow-transfer" className="mb-0">
                  Allow ticket transfers to other customers
                </Label>
              </div>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="email-notifications"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <Label htmlFor="email-notifications" className="mb-0">
                  Send email notifications for ticket expiry
                </Label>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" variant="primary" size="md">
                Save Validity Settings
              </Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}