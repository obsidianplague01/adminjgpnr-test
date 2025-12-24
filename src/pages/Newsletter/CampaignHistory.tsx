import { useState } from "react";
import { useNavigate } from "react-router-dom";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import Button from "../../components/ui/button/Button";

interface Campaign {
  id: string;
  subject: string;
  sentTo: number;
  openedCount: number;
  clickedCount: number;
  status: "draft" | "sent" | "scheduled";
  sentAt: string;
}

const mockCampaigns: Campaign[] = [
  {
    id: "1",
    subject: "Special Offer - 20% Off This Weekend!",
    sentTo: 245,
    openedCount: 198,
    clickedCount: 87,
    status: "sent",
    sentAt: "2024-12-20",
  },
  {
    id: "2",
    subject: "New Session Times Available",
    sentTo: 230,
    openedCount: 185,
    clickedCount: 72,
    status: "sent",
    sentAt: "2024-12-15",
  },
  {
    id: "3",
    subject: "Holiday Special - Book Now",
    sentTo: 0,
    openedCount: 0,
    clickedCount: 0,
    status: "draft",
    sentAt: "-",
  },
];

export default function CampaignHistory() {
  const navigate = useNavigate();
  const [campaigns] = useState<Campaign[]>(mockCampaigns);

  return (
    <>
      <PageMeta title="Campaign History | JGPNR Admin Panel" description="View email campaign history" />
      <PageBreadcrumb pageTitle="Campaign History" />

      <div className="rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
        <div className="flex flex-col gap-4 border-b border-gray-200 px-6 py-5 dark:border-gray-800 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">Campaign History</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{campaigns.length} campaigns</p>
          </div>
          <Button variant="primary" size="md" onClick={() => navigate("/newsletter/send-campaign")}>
            <svg className="mr-2 h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            New Campaign
          </Button>
        </div>

        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
              <TableRow>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Subject</TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Sent To</TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Opened</TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Clicked</TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Date</TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Status</TableCell>
                <TableCell isHeader className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Actions</TableCell>
              </TableRow>
            </TableHeader>

            <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white/90">{campaign.subject}</TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{campaign.sentTo}</TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{campaign.openedCount}</TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{campaign.clickedCount}</TableCell>
                  <TableCell className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{campaign.sentAt}</TableCell>
                  <TableCell className="px-6 py-4">
                    <Badge size="sm" color={campaign.status === "sent" ? "success" : campaign.status === "scheduled" ? "warning" : "info"}>
                      {campaign.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-6 py-4">
                    <button onClick={() => navigate(`/newsletter/view-campaign/${campaign.id}`)} className="text-brand-500 hover:text-brand-600" title="View Campaign">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </>
  );
}