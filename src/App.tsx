import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import AppLayout from "./layout/AppLayout";
import { ScrollToTop } from "./components/common/ScrollToTop";

// Auth
import SignIn from "./pages/Auth/SignIn";
import SignUp from "./pages/Auth/SignUp";

// Dashboard
import Home from "./pages/Dashboard/Home";

// Tickets
import AllOrders from "./pages/Tickets/AllOrders";
import ActiveTickets from "./pages/Tickets/ActiveTickets";
import ScannedTickets from "./pages/Tickets/ScannedTickets";
import TicketSettings from "./pages/Tickets/TicketSettings";
import AdvancedTicketSettings from "./pages/Tickets/AdvancedTicketSettings";
import CreateTicket from "./pages/Tickets/CreateTicket";
import EditTicket from "./pages/Tickets/EditTicket";
import ViewTicket from "./pages/Tickets/ViewTicket";

// Scanner
import TicketScanner from "./pages/Scanner/TicketScanner";

// Customers
import CustomerManagement from "./pages/Customers/CustomerManagement";
import EditCustomer from "./pages/Customers/EditCustomer";
import ViewCustomer from "./pages/Customers/ViewCustomer";

// Newsletter
import Subscribers from "./pages/Newsletter/Subscribers";
import CreateSubscriber from "./pages/Newsletter/CreateSubscriber";
import EditSubscriber from "./pages/Newsletter/EditSubscriber";
import SendCampaign from "./pages/Newsletter/SendCampaign";
import EmailTemplates from "./pages/Newsletter/EmailTemplates";
import CampaignHistory from "./pages/Newsletter/CampaignHistory";
import ViewCampaign from "./pages/Newsletter/ViewCampaign";

// Email Templates
import TemplateList from "./pages/EmailTemplates/TemplateList";
import CreateTemplate from "./pages/EmailTemplates/CreateTemplate";
import EditTemplate from "./pages/EmailTemplates/EditTemplate";

// Mail
import SendMail from "./pages/Mail/SendMail";
import SendMailWithTemplate from "./pages/Mail/SendMailWithTemplate";

// Analytics
import Analytics from "./pages/Analytics/Analytics";

// Settings
import General from "./pages/Settings/General";
import EmailConfig from "./pages/Settings/EmailConfig";
import Payment from "./pages/Settings/Payment";
import Security from "./pages/Settings/Security";

// Profile
import Profile from "./pages/Profile/Profile";

// Other
import NotFound from "./pages/OtherPage/NotFound";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <ScrollToTop />
        <Routes>
          {/* Public Routes */}
          <Route path="/signin" element={<SignIn />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Protected Routes */}
          <Route element={<ProtectedRoute />}>
            <Route element={<AppLayout />}>
              <Route index path="/" element={<Home />} />

              {/* Ticket Management */}
              <Route path="/tickets/all-orders" element={<AllOrders />} />
              <Route path="/tickets/active" element={<ActiveTickets />} />
              <Route path="/tickets/scanned" element={<ScannedTickets />} />
              <Route path="/tickets/settings" element={<TicketSettings />} />
              <Route path="/tickets/advanced-settings" element={<AdvancedTicketSettings />} />
              <Route path="/tickets/create" element={<CreateTicket />} />
              <Route path="/tickets/edit/:id" element={<EditTicket />} />
              <Route path="/tickets/view/:id" element={<ViewTicket />} />

              {/* Scanner */}
              <Route path="/scanner" element={<TicketScanner />} />

              {/* Customers */}
              <Route path="/customers" element={<CustomerManagement />} />
              <Route path="/customers/edit/:id" element={<EditCustomer />} />
              <Route path="/customers/view/:id" element={<ViewCustomer />} />

              {/* Newsletter */}
              <Route path="/newsletter/subscribers" element={<Subscribers />} />
              <Route path="/newsletter/subscribers/create" element={<CreateSubscriber />} />
              <Route path="/newsletter/subscribers/edit/:id" element={<EditSubscriber />} />
              <Route path="/newsletter/send-campaign" element={<SendCampaign />} />
              <Route path="/newsletter/templates" element={<EmailTemplates />} />
              <Route path="/newsletter/history" element={<CampaignHistory />} />
              <Route path="/newsletter/view-campaign/:id" element={<ViewCampaign />} />

              {/* Email Templates */}
              <Route path="/email-templates" element={<TemplateList />} />
              <Route path="/email-templates/create" element={<CreateTemplate />} />
              <Route path="/email-templates/edit/:id" element={<EditTemplate />} />

              {/* Mail */}
              <Route path="/mail/send" element={<SendMailWithTemplate />} />

              {/* Analytics */}
              <Route path="/analytics" element={<Analytics />} />

              {/* Profile */}
              <Route path="/profile" element={<Profile />} />

              {/* Settings */}
              <Route path="/settings/general" element={<General />} />
              <Route path="/settings/email-config" element={<EmailConfig />} />
              <Route path="/settings/payment" element={<Payment />} />
              <Route path="/settings/security" element={<Security />} />
            </Route>
          </Route>

          {/* Fallback Route */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}