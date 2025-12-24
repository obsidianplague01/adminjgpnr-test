// src/layout/AppSidebar.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";

// Icons
const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
  </svg>
);

const TicketIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
  </svg>
);

const ScannerIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
  </svg>
);

const CustomersIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
  </svg>
);

const NewsletterIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

const AnalyticsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const SettingsIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);

const ChevronDownIcon = ({ className }: { className?: string }) => (
  <svg className={`w-4 h-4 ${className}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

type NavItem = {
  name: string;
  icon: React.ReactNode;
  path?: string;
  badge?: string;
  subItems?: { name: string; path: string; badge?: string }[];
};

const navItems: NavItem[] = [
  {
    icon: <DashboardIcon />,
    name: "Dashboard",
    path: "/",
  },
  {
    icon: <TicketIcon />,
    name: "Ticket Management",
    subItems: [
      { name: "All Orders", path: "/tickets/all-orders" },
      { name: "Active Tickets", path: "/tickets/active" },
      { name: "Scanned Tickets", path: "/tickets/scanned" },
      { name: "Ticket Settings", path: "/tickets/settings" },
    ],
  },
  {
    icon: <ScannerIcon />,
    name: "Ticket Scanner",
    path: "/scanner",
  },
  {
    icon: <CustomersIcon />,
    name: "Customers",
    path: "/customers",
  },
  {
    icon: <NewsletterIcon />,
    name: "Newsletter",
    subItems: [
      { name: "Subscribers", path: "/newsletter/subscribers" },
      { name: "Send Campaign", path: "/newsletter/send-campaign" },
      { name: "Email Templates", path: "/newsletter/templates" },
      { name: "Campaign History", path: "/newsletter/history" },
    ],
  },
  {
    icon: <AnalyticsIcon />,
    name: "Analytics",
    path: "/analytics",
  },
  {
    icon: <SettingsIcon />,
    name: "Settings",
    subItems: [
      { name: "General", path: "/settings/general" },
      { name: "Email Config", path: "/settings/email-config" },
      { name: "Payment", path: "/settings/payment" },
      { name: "Security", path: "/settings/security" },
    ],
  },
];

const AppSidebar = () => {
  const location = useLocation();
  const { isExpanded, isHovered, isMobileOpen, setIsHovered, toggleMobileSidebar } = useSidebar();
  const [openSubmenu, setOpenSubmenu] = useState<string | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>({});
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const isActive = useCallback(
    (path: string) => location.pathname === path,
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    navItems.forEach((nav) => {
      if (nav.subItems) {
        nav.subItems.forEach((subItem) => {
          if (isActive(subItem.path)) {
            setOpenSubmenu(nav.name);
            submenuMatched = true;
          }
        });
      }
    });

    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = openSubmenu;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prevHeights) => ({
          ...prevHeights,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const handleSubmenuToggle = (name: string) => {
    setOpenSubmenu((prevOpenSubmenu) => {
      if (prevOpenSubmenu === name) {
        return null;
      }
      return name;
    });
  };

  const shouldShowExpanded = isExpanded || isHovered || isMobileOpen;

  return (
    <>
      <aside
        onMouseEnter={() => !isMobileOpen && setIsHovered(true)}
        onMouseLeave={() => !isMobileOpen && setIsHovered(false)}
        className={`fixed left-0 top-0 z-50 flex h-screen flex-col border-r border-gray-200 bg-white transition-all duration-300 dark:border-gray-800 dark:bg-gray-900 ${
          shouldShowExpanded ? "w-[290px]" : "w-[90px]"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
      >
        {/* Logo */}
        <div className="flex h-20 items-center border-b border-gray-200 px-6 dark:border-gray-800">
          <Link to="/" className="flex items-center" onClick={() => isMobileOpen && toggleMobileSidebar()}>
            {shouldShowExpanded ? (
              <div className="flex items-center gap-3">
                <img
                  src="/images/logo/logo.svg"
                  alt="JGPNR Logo"
                  className="h-10 w-auto dark:hidden"
                />
                <img
                  src="/images/logo/logo-dark.svg"
                  alt="JGPNR Logo"
                  className="hidden h-10 w-auto dark:block"
                />
              </div>
            ) : (
              <div className="flex h-10 w-10 items-center justify-center ">
                <img
                  src="/images/logo/logo-small.svg"
                  alt="JGPNR Logo"
                  className="hidden h-10 w-auto dark:block"
                />
              </div>
            )}
          </Link>
        </div>

        {/* Navigation */}
        <nav className="custom-scrollbar flex-1 overflow-y-auto px-4 py-6">
          <ul className="flex flex-col gap-2">
            {navItems.map((nav) => {
              const hasSubmenu = nav.subItems && nav.subItems.length > 0;
              const isSubmenuOpen = openSubmenu === nav.name;
              const isNavActive = nav.path ? isActive(nav.path) : false;

              return (
                <li key={nav.name}>
                  {nav.subItems ? (
                    <button
                      onClick={() => handleSubmenuToggle(nav.name)}
                      className={`menu-item group w-full ${
                        isSubmenuOpen ? "menu-item-active" : "menu-item-inactive"
                      } ${!shouldShowExpanded ? "justify-center" : ""}`}
                    >
                      <span
                        className={`menu-item-icon menu-item-icon-size ${
                          isSubmenuOpen ? "menu-item-icon-active" : "menu-item-icon-inactive"
                        }`}
                      >
                        {nav.icon}
                      </span>
                      {shouldShowExpanded && (
                        <>
                          <span className="flex-1 text-left">{nav.name}</span>
                          <ChevronDownIcon
                            className={`transition-transform duration-200 ${
                              isSubmenuOpen ? "rotate-180" : ""
                            }`}
                          />
                        </>
                      )}
                    </button>
                  ) : (
                    nav.path && (
                      <Link
                        to={nav.path}
                        onClick={() => isMobileOpen && toggleMobileSidebar()}
                        className={`menu-item group ${
                          isNavActive ? "menu-item-active" : "menu-item-inactive"
                        } ${!shouldShowExpanded ? "justify-center" : ""}`}
                      >
                        <span
                          className={`menu-item-icon menu-item-icon-size ${
                            isNavActive ? "menu-item-icon-active" : "menu-item-icon-inactive"
                          }`}
                        >
                          {nav.icon}
                        </span>
                        {shouldShowExpanded && <span className="whitespace-nowrap">{nav.name}</span>}
                      </Link>
                    )
                  )}

                  {/* Submenu */}
                  {hasSubmenu && shouldShowExpanded && (
                    <div
                      ref={(el) => {
                        subMenuRefs.current[nav.name] = el;
                      }}
                      className="overflow-hidden transition-all duration-300"
                      style={{
                        height: isSubmenuOpen ? `${subMenuHeight[nav.name]}px` : "0px",
                      }}
                    >
                      <ul className="ml-3 mt-2 space-y-1 border-l-2 border-gray-200 pl-9 dark:border-gray-800">
                        {nav.subItems!.map((subItem) => (
                          <li key={subItem.name}>
                            <Link
                              to={subItem.path}
                              onClick={() => isMobileOpen && toggleMobileSidebar()}
                              className={`menu-dropdown-item ${
                                isActive(subItem.path)
                                  ? "menu-dropdown-item-active"
                                  : "menu-dropdown-item-inactive"
                              }`}
                            >
                              <span className="whitespace-nowrap">{subItem.name}</span>
                              {subItem.badge && (
                                <span
                                  className={`menu-dropdown-badge ${
                                    isActive(subItem.path)
                                      ? "menu-dropdown-badge-active"
                                      : "menu-dropdown-badge-inactive"
                                  }`}
                                >
                                  {subItem.badge}
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default AppSidebar;