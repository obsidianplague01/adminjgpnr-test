// src/pages/Analytics/Analytics.tsx
import { useState } from "react";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import Badge from "../../components/ui/badge/Badge";

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d" | "1y">("30d");

  // Revenue Chart
  const revenueChartOptions: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "area",
      height: 350,
      toolbar: { show: false },
    },
    colors: ["#465FFF", "#12B76A"],
    dataLabels: { enabled: false },
    stroke: {
      curve: "smooth",
      width: 2,
    },
    fill: {
      type: "gradient",
      gradient: {
        opacityFrom: 0.4,
        opacityTo: 0,
      },
    },
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      title: { text: "Revenue (₦)" },
      labels: {
        formatter: (val) => `₦${(val / 1000).toFixed(0)}k`,
      },
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
    },
    grid: {
      yaxis: { lines: { show: true } },
      xaxis: { lines: { show: false } },
    },
    tooltip: {
      y: {
        formatter: (val) => `₦${val.toLocaleString()}`,
      },
    },
  };

  const revenueChartSeries = [
    {
      name: "Revenue",
      data: [45000, 52000, 48000, 65000, 70000, 62000, 75000, 82000, 78000, 90000, 95000, 88000],
    },
    {
      name: "Target",
      data: [50000, 50000, 55000, 60000, 65000, 70000, 75000, 80000, 85000, 90000, 95000, 100000],
    },
  ];

  // Ticket Sales Chart
  const ticketSalesOptions: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 350,
      toolbar: { show: false },
    },
    colors: ["#465FFF", "#F79009"],
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: "55%",
        borderRadius: 5,
        borderRadiusApplication: "end",
      },
    },
    dataLabels: { enabled: false },
    stroke: {
      show: true,
      width: 2,
      colors: ["transparent"],
    },
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      title: { text: "Tickets Sold" },
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
    },
    grid: {
      yaxis: { lines: { show: true } },
    },
    tooltip: {
      y: {
        formatter: (val) => `${val} tickets`,
      },
    },
  };

  const ticketSalesSeries = [
    {
      name: "Active Tickets",
      data: [18, 21, 19, 26, 28, 25, 30, 33, 31, 36, 38, 35],
    },
    {
      name: "Scanned Tickets",
      data: [15, 18, 17, 23, 25, 22, 27, 30, 28, 33, 35, 32],
    },
  ];

  // Session Distribution Pie Chart
  const sessionDistributionOptions: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "donut",
      height: 300,
    },
    colors: ["#465FFF", "#12B76A", "#F79009", "#EE46BC"],
    labels: ["Morning Session", "Afternoon Session", "Evening Session", "Weekend Session"],
    dataLabels: {
      enabled: true,
      formatter: (val: number) => `${val.toFixed(0)}%`,
    },
    legend: {
      position: "bottom",
      horizontalAlign: "center",
    },
    plotOptions: {
      pie: {
        donut: {
          size: "70%",
          labels: {
            show: true,
            total: {
              show: true,
              label: "Total Tickets",
              formatter: () => "428",
            },
          },
        },
      },
    },
    tooltip: {
      y: {
        formatter: (val) => `${val} tickets`,
      },
    },
  };

  const sessionDistributionSeries = [120, 95, 135, 78];

  // Customer Growth Chart
  const customerGrowthOptions: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "line",
      height: 300,
      toolbar: { show: false },
    },
    colors: ["#7A5AF8"],
    stroke: {
      curve: "smooth",
      width: 3,
    },
    xaxis: {
      categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
      axisBorder: { show: false },
      axisTicks: { show: false },
    },
    yaxis: {
      title: { text: "Total Customers" },
    },
    grid: {
      yaxis: { lines: { show: true } },
    },
    markers: {
      size: 5,
      colors: ["#7A5AF8"],
      strokeColors: "#fff",
      strokeWidth: 2,
      hover: { size: 7 },
    },
    tooltip: {
      y: {
        formatter: (val) => `${val} customers`,
      },
    },
  };

  const customerGrowthSeries = [
    {
      name: "Customers",
      data: [45, 52, 58, 65, 72, 85, 95, 108, 125, 142, 156, 168],
    },
  ];

  // Email Campaign Performance
  const emailCampaignOptions: ApexOptions = {
    chart: {
      fontFamily: "Outfit, sans-serif",
      type: "bar",
      height: 300,
      toolbar: { show: false },
    },
    colors: ["#12B76A", "#F79009", "#D92D20"],
    plotOptions: {
      bar: {
        horizontal: true,
        borderRadius: 4,
        dataLabels: { position: "top" },
      },
    },
    dataLabels: {
      enabled: true,
      formatter: (val) => `${val}%`,
      offsetX: 30,
      style: {
        fontSize: "12px",
        colors: ["#1D2939"],
      },
    },
    xaxis: {
      categories: ["Welcome Email", "Ticket Confirmation", "Session Reminder", "Follow-up"],
      max: 100,
    },
    yaxis: {
      title: { text: "" },
    },
    legend: {
      position: "top",
      horizontalAlign: "left",
    },
    grid: {
      xaxis: { lines: { show: true } },
    },
  };

  const emailCampaignSeries = [
    {
      name: "Open Rate",
      data: [78, 92, 85, 72],
    },
    {
      name: "Click Rate",
      data: [45, 68, 52, 38],
    },
    {
      name: "Conversion Rate",
      data: [28, 42, 35, 22],
    },
  ];

  return (
    <>
      <PageMeta
        title="Analytics | JGPNR Admin Panel"
        description="View detailed analytics and insights"
      />
      <PageBreadcrumb pageTitle="Analytics" />

      {/* Header with Time Range Selector */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white/90">Analytics Dashboard</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track performance metrics and business insights
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-gray-100 p-1 dark:bg-gray-900">
          {(["7d", "30d", "90d", "1y"] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`rounded-md px-4 py-2 text-sm font-medium transition ${
                timeRange === range
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-800 dark:text-white"
                  : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {range === "7d" && "7 Days"}
              {range === "30d" && "30 Days"}
              {range === "90d" && "90 Days"}
              {range === "1y" && "1 Year"}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 md:gap-6">
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Revenue</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white/90">₦850,000</p>
              <div className="mt-2 flex items-center gap-1">
                <Badge color="success" size="sm">
                  +12.5%
                </Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400">vs last period</span>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success-100 dark:bg-success-500/20">
              <svg
                className="h-6 w-6 text-success-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Tickets Sold</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white/90">428</p>
              <div className="mt-2 flex items-center gap-1">
                <Badge color="success" size="sm">
                  +8.2%
                </Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400">vs last period</span>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-brand-100 dark:bg-brand-500/20">
              <svg
                className="h-6 w-6 text-brand-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Customers</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white/90">168</p>
              <div className="mt-2 flex items-center gap-1">
                <Badge color="success" size="sm">
                  +15.3%
                </Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400">vs last period</span>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-theme-purple-500/10 dark:bg-theme-purple-500/20">
              <svg
                className="h-6 w-6 text-theme-purple-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400">Scan Rate</p>
              <p className="mt-2 text-2xl font-bold text-gray-900 dark:text-white/90">89.2%</p>
              <div className="mt-2 flex items-center gap-1">
                <Badge color="error" size="sm">
                  -2.1%
                </Badge>
                <span className="text-xs text-gray-500 dark:text-gray-400">vs last period</span>
              </div>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 dark:bg-orange-500/20">
              <svg
                className="h-6 w-6 text-orange-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="space-y-6">
        {/* Revenue Chart */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                Revenue Overview
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Monthly revenue vs target
              </p>
            </div>
          </div>
          <Chart options={revenueChartOptions} series={revenueChartSeries} type="area" height={350} />
        </div>

        {/* Ticket Sales & Session Distribution */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                Ticket Sales Performance
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Active vs scanned tickets by month
              </p>
            </div>
            <Chart options={ticketSalesOptions} series={ticketSalesSeries} type="bar" height={350} />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                Session Distribution
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Tickets by game session
              </p>
            </div>
            <Chart
              options={sessionDistributionOptions}
              series={sessionDistributionSeries}
              type="donut"
              height={300}
            />
          </div>
        </div>

        {/* Customer Growth & Email Performance */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                Customer Growth
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Total customers over time
              </p>
            </div>
            <Chart
              options={customerGrowthOptions}
              series={customerGrowthSeries}
              type="line"
              height={300}
            />
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
                Email Campaign Performance
              </h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Open, click, and conversion rates
              </p>
            </div>
            <Chart
              options={emailCampaignOptions}
              series={emailCampaignSeries}
              type="bar"
              height={300}
            />
          </div>
        </div>

        {/* Marketing Metrics Table */}
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
          <div className="mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white/90">
              Marketing Metrics
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Detailed campaign and conversion metrics
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-800">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Metric
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Value
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Change
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white/90">
                    Email Open Rate
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">82.5%</td>
                  <td className="px-4 py-3">
                    <Badge color="success" size="sm">
                      +5.2%
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                    Above average
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white/90">
                    Email Click Rate
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">48.3%</td>
                  <td className="px-4 py-3">
                    <Badge color="success" size="sm">
                      +3.8%
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">Excellent</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white/90">
                    Conversion Rate
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">32.1%</td>
                  <td className="px-4 py-3">
                    <Badge color="success" size="sm">
                      +7.5%
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">Strong</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white/90">
                    Customer Retention
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">68.7%</td>
                  <td className="px-4 py-3">
                    <Badge color="warning" size="sm">
                      -1.2%
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">Monitor</td>
                </tr>
                <tr>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900 dark:text-white/90">
                    Average Order Value
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">₦5,062</td>
                  <td className="px-4 py-3">
                    <Badge color="success" size="sm">
                      +12.3%
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">Growing</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}