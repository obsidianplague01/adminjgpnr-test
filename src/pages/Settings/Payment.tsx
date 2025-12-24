import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Input from "../../components/form/input/InputField";
import Label from "../../components/form/Label";
import Button from "../../components/ui/button/Button";
import Badge from "../../components/ui/badge/Badge";

export default function Payment() {
  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    console.log("Payment settings saved");
  };

  return (
    <>
      <PageMeta
        title="Payment Settings | JGPNR Admin Panel"
        description="Configure payment gateway settings"
      />
      <PageBreadcrumb pageTitle="Payment Settings" />

      <div className="space-y-6">
        {/* Payment Methods */}
        <ComponentCard
          title="Payment Methods"
          desc="Enable and configure payment options"
        >
          <div className="space-y-4">
            {/* Paystack */}
            <div className="rounded-lg border border-gray-200 p-5 dark:border-gray-800">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-500/20">
                    <svg
                      className="h-6 w-6 text-brand-500"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white/90">
                      Paystack
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Accept payments via cards and bank transfers
                    </p>
                  </div>
                </div>
                <Badge color="success" size="sm">
                  Active
                </Badge>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="paystack-public">Public Key</Label>
                    <Input
                      type="text"
                      id="paystack-public"
                      placeholder="pk_test_..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="paystack-secret">Secret Key</Label>
                    <Input
                      type="password"
                      id="paystack-secret"
                      placeholder="sk_test_..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="paystack-live"
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <Label htmlFor="paystack-live" className="mb-0">
                    Use live mode (production keys)
                  </Label>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" variant="primary" size="sm">
                    Save Paystack Settings
                  </Button>
                </div>
              </form>
            </div>

            {/* Flutterwave */}
            <div className="rounded-lg border border-gray-200 p-5 dark:border-gray-800">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning-100 dark:bg-warning-500/20">
                    <svg
                      className="h-6 w-6 text-warning-500"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-white/90">
                      Flutterwave
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Alternative payment gateway
                    </p>
                  </div>
                </div>
                <Badge color="light" size="sm">
                  Disabled
                </Badge>
              </div>

              <form onSubmit={handleSave} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <Label htmlFor="flutterwave-public">Public Key</Label>
                    <Input
                      type="text"
                      id="flutterwave-public"
                      placeholder="FLWPUBK_TEST-..."
                    />
                  </div>
                  <div>
                    <Label htmlFor="flutterwave-secret">Secret Key</Label>
                    <Input
                      type="password"
                      id="flutterwave-secret"
                      placeholder="FLWSECK_TEST-..."
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="flutterwave-enable"
                    className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                  />
                  <Label htmlFor="flutterwave-enable" className="mb-0">
                    Enable Flutterwave
                  </Label>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" variant="primary" size="sm">
                    Save Flutterwave Settings
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </ComponentCard>

        {/* Transaction Settings */}
        <ComponentCard
          title="Transaction Settings"
          desc="Configure transaction and payment preferences"
        >
          <form onSubmit={handleSave} className="space-y-5">
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <div>
                <Label htmlFor="transaction-fee">Transaction Fee (%)</Label>
                <Input
                  type="number"
                  id="transaction-fee"
                  placeholder="0"
                  defaultValue="0"
                  step="0.01"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Additional fee to charge customers
                </p>
              </div>
              <div>
                <Label htmlFor="min-amount">Minimum Order Amount (₦)</Label>
                <Input
                  type="number"
                  id="min-amount"
                  placeholder="1000"
                  defaultValue="1000"
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="auto-refund"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <Label htmlFor="auto-refund" className="mb-0">
                  Enable automatic refunds for cancelled orders
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="payment-notifications"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <Label htmlFor="payment-notifications" className="mb-0">
                  Send payment confirmation emails
                </Label>
              </div>

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="failed-notifications"
                  defaultChecked
                  className="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                />
                <Label htmlFor="failed-notifications" className="mb-0">
                  Notify admins of failed transactions
                </Label>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button type="submit" variant="primary" size="md">
                Save Transaction Settings
              </Button>
            </div>
          </form>
        </ComponentCard>
      </div>
    </>
  );
}