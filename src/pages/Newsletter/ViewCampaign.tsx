import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import ComponentCard from "../../components/common/ComponentCard";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";

interface Campaign {
  id: string;
  subject: string;
  body: string;
  sentTo: number;
  openedCount: number;
  clickedCount: number;
  status: "draft" | "sent" | "scheduled";
  sentAt: string | null;
  createdAt: string;
}

export default function ViewCampaign() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);

  useEffect(() => {
    const fetchCampaign = async () => {
      await new Promise((resolve) => setTimeout(resolve, 500));

      setCampaign({
        id: id || "1",
        subject: "Special Offer - 20% Off This Weekend!",
        body: `Dear Subscriber,

We're excited to offer you an exclusive 20% discount on all paintball sessions this weekend!

Use code: WEEKEND20

Book your session today!

Best regards,
JGPNR Paintball Team`,
        sentTo: 245,
        openedCount: 198,
        clickedCount: 87,
        status: "sent",
        sentAt: "2024-12-20 10:30 AM",
        createdAt: "2024-12-19",
      });
    };

    fetchCampaign();
  }, [id]);

  if (!campaign) {
    return (
      <>
        <PageMeta title="View Campaign | JGPNR Admin Panel" description="View campaign details" />
        <PageBreadcrumb pageTitle="View Campaign" />
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"></div>
        </div>
      </>
    );
  }

  const openRate = ((campaign.openedCount / campaign.sentTo) * 100).toFixed(1);
  const clickRate = ((campaign.clickedCount / campaign.sentTo) * 100).toFixed(1);
  const clickToOpenRate = ((campaign.clickedCount / campaign.openedCount) * 100).toFixed(1);

  return (
    <>
      <PageMeta title="View Campaign | JGPNR Admin Panel" description="View campaign details" />
      <PageBreadcrumb pageTitle="Campaign Details" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <ComponentCard title="Campaign Information" desc="Full campaign details and content">
            <div className="space-y-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white/90">
                    {campaign.subject}
                  </h2>
                  <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Created on {campaign.createdAt}
                  </p>
                </div>
                <Badge
                  size="md"
                  color={
                    campaign.status === "sent"
                      ? "success"
                      : campaign.status === "scheduled"
                      ? "warning"
                      : "info"
                  }
                >
                  {campaign.status}
                </Badge>
              </div>

              {campaign.sentAt && (
                <div className="rounded-lg bg-success-50 p-4 dark:bg-success-500/10">
                  <div className="flex gap-3">
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-success-500"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    <div>
                      <p className="text-sm font-medium text-success-700 dark:text-success-400">
                        Campaign Sent Successfully
                      </p>
                      <p className="mt-1 text-sm text-success-600 dark:text-success-400">
                        Sent to {campaign.sentTo} subscribers on {campaign.sentAt}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-gray-200 pt-6 dark:border-gray-800">
                <h3 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white/90">
                  Email Content
                </h3>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-6 dark:border-gray-800 dark:bg-gray-900">
                  <pre className="whitespace-pre-wrap text-sm text-gray-900 dark:text-white/90">
                    {campaign.body}
                  </pre>
                </div>
              </div>
            </div>
          </ComponentCard>
        </div>

        <div className="space-y-6">
          <ComponentCard title="Campaign Metrics" desc="Performance statistics">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Sent To</span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white/90">
                    {campaign.sentTo}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800">
                  <div className="h-2 w-full rounded-full bg-brand-500"></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Opened</span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white/90">
                    {campaign.openedCount} ({openRate}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800">
                  <div
                    className="h-2 rounded-full bg-success-500"
                    style={{ width: `${openRate}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Clicked</span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white/90">
                    {campaign.clickedCount} ({clickRate}%)
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-800">
                  <div
                    className="h-2 rounded-full bg-orange-500"
                    style={{ width: `${clickRate}%` }}
                  ></div>
                </div>
              </div>

              <div className="border-t border-gray-200 pt-4 dark:border-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    Click-to-Open Rate
                  </span>
                  <span className="text-lg font-semibold text-gray-900 dark:text-white/90">
                    {clickToOpenRate}%
                  </span>
                </div>
              </div>
            </div>
          </ComponentCard>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white/90">Actions</h4>
            <div className="space-y-3">
              <Button
                variant="outline"
                size="md"
                className="w-full"
                onClick={() => navigate("/newsletter/history")}
              >
                Back to Campaign History
              </Button>
              <Button
                variant="outline"
                size="md"
                className="w-full"
                onClick={() => navigate("/newsletter/send-campaign")}
              >
                Create Similar Campaign
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}