import { useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";

export default function AdvancedTicketSettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [settings, setSettings] = useState({
    maxScanCount: "2",
    scanWindowDays: "14",
    enableCategories: false,
    categoriesConfig: {
      vip: { enabled: false, price: "5000", label: "VIP" },
      standard: { enabled: true, price: "2500", label: "Standard" },
      student: { enabled: false, price: "1500", label: "Student" },
      group: { enabled: false, price: "2000", label: "Group (5+)" },
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log("Settings saved:", settings);
    alert("Advanced settings saved successfully!");

    setIsLoading(false);
  };

  const handleCategoryToggle = (category: string) => {
    setSettings((prev) => ({
      ...prev,
      categoriesConfig: {
        ...prev.categoriesConfig,
        [category]: {
          ...prev.categoriesConfig[category as keyof typeof prev.categoriesConfig],
          enabled: !prev.categoriesConfig[category as keyof typeof prev.categoriesConfig].enabled,
        },
      },
    }));
  };

  return (
    <>
      <PageMeta
        title="Advanced Ticket Settings | JGPNR Admin Panel"
        description="Configure ticket lifetime and categories"
      />
      <PageBreadcrumb pageTitle="Advanced Ticket Settings" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Ticket Lifetime Rules */}
        <ComponentCard
          title="Ticket Lifetime Rules"
          desc="Configure scan limits and validity windows"
        >
          <div className="space-y-5">
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
                    Ticket Scan Policy
                  </p>
                  <p className="mt-1 text-sm text-blue-light-600 dark:text-blue-light-400">
                    Control how many times a ticket can be scanned and within what time window.
                    After the first scan, subsequent scans must occur within the configured window.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="maxScanCount">Maximum Scans Per Ticket *</Label>
                <Input
                  type="number"
                  id="maxScanCount"
                  value={settings.maxScanCount}
                  onChange={(e) => setSettings({ ...settings, maxScanCount: e.target.value })}
                  min="1"
                  max="10"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Default: 2 scans (e.g., entry + exit or two separate sessions)
                </p>
              </div>

              <div>
                <Label htmlFor="scanWindowDays">Scan Window (Days) *</Label>
                <Input
                  type="number"
                  id="scanWindowDays"
                  value={settings.scanWindowDays}
                  onChange={(e) => setSettings({ ...settings, scanWindowDays: e.target.value })}
                  min="1"
                  max="90"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Time window between first and last scan (Default: 14 days)
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
              <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white/90">
                Current Policy
              </h4>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <p>
                  • Each ticket can be scanned up to <strong>{settings.maxScanCount}</strong> times
                </p>
                <p>
                  • After first scan, remaining scans must occur within{" "}
                  <strong>{settings.scanWindowDays} days</strong>
                </p>
                <p>• Tickets exceeding these limits will be marked as INVALID</p>
                <p>• Scanner will automatically block entry for invalid tickets</p>
              </div>
            </div>
          </div>
        </ComponentCard>

        {/* Ticket Categories */}
        <ComponentCard
          title="Ticket Categories"
          desc="Enable or disable ticket category system"
        >
          <div className="space-y-5">
            <div className="flex items-start gap-3">
              <input
                type="checkbox"
                id="enableCategories"
                checked={settings.enableCategories}
                onChange={(e) =>
                  setSettings({ ...settings, enableCategories: e.target.checked })
                }
                className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
              />
              <div>
                <label
                  htmlFor="enableCategories"
                  className="text-sm font-medium text-gray-900 dark:text-white/90"
                >
                  Enable Ticket Categories
                </label>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  When disabled, the system uses a single base price for all tickets. When enabled,
                  you can define different categories with different pricing.
                </p>
              </div>
            </div>

            {settings.enableCategories && (
              <div className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
                <h4 className="text-sm font-semibold text-gray-900 dark:text-white/90">
                  Configure Categories
                </h4>

                {Object.entries(settings.categoriesConfig).map(([key, category]) => (
                  <div
                    key={key}
                    className="flex items-center justify-between rounded-lg border border-gray-200 p-4 dark:border-gray-800"
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={category.enabled}
                        onChange={() => handleCategoryToggle(key)}
                        className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                      />
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white/90">
                          {category.label}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          ₦{parseInt(category.price).toLocaleString()} per ticket
                        </p>
                      </div>
                    </div>
                    {category.enabled && (
                      <Input
                        type="number"
                        value={category.price}
                        onChange={(e) =>
                          setSettings((prev) => ({
                            ...prev,
                            categoriesConfig: {
                              ...prev.categoriesConfig,
                              [key]: {
                                ...prev.categoriesConfig[key as keyof typeof prev.categoriesConfig],
                                price: e.target.value,
                              },
                            },
                          }))
                        }
                        className="w-32"
                        min="0"
                      />
                    )}
                  </div>
                ))}
              </div>
            )}

            {!settings.enableCategories && (
              <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-900">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Categories are disabled. System will use single base pricing from Ticket Settings.
                </p>
              </div>
            )}
          </div>
        </ComponentCard>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button type="submit" variant="primary" size="md" disabled={isLoading}>
            {isLoading ? "Saving..." : "Save Advanced Settings"}
          </Button>
        </div>
      </form>
    </>
  );
}