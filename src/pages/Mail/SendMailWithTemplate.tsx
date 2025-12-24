import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import PageBreadcrumb from '../../components/common/PageBreadCrumb';
import PageMeta from '../../components/common/PageMeta';
import ComponentCard from '../../components/common/ComponentCard';
import Input from '../../components/form/input/InputField';
import Label from '../../components/form/Label';
import Select from '../../components/form/Select';
import Button from '../../components/ui/button/Button';
import { isValidEmail } from '../../utils/validation';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  body: string;
}

const mockTemplates: EmailTemplate[] = [
  {
    id: "1",
    name: "Welcome Email",
    subject: "Welcome to JGPNR Paintball!",
    body: `Dear {firstName} {lastName},\n\nWelcome to JGPNR Paintball!\n\nBest regards,\nJGPNR Team`,
  },
  {
    id: "2",
    name: "Ticket Confirmation",
    subject: "Your JGPNR Ticket - {ticketCode}",
    body: `Dear {firstName} {lastName},\n\nYour ticket {ticketCode} has been confirmed!\n\nBest regards,\nJGPNR Team`,
  },
];

export default function SendMailWithTemplate() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [templates, setTemplates] = useState<EmailTemplate[]>(mockTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [formData, setFormData] = useState({
    to: searchParams.get('to') || '',
    cc: '',
    bcc: '',
    subject: searchParams.get('subject') || '',
    body: searchParams.get('body') || '',
  });
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (selectedTemplate) {
      const template = templates.find((t) => t.id === selectedTemplate);
      if (template) {
        setFormData((prev) => ({
          ...prev,
          subject: template.subject,
          body: template.body,
        }));
      }
    }
  }, [selectedTemplate, templates]);

  const templateOptions = templates.map((t) => ({
    value: t.id,
    label: t.name,
  }));

  const handleChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: { [key: string]: string } = {};

    if (!formData.to.trim()) {
      newErrors.to = 'Recipient email is required';
    } else if (!isValidEmail(formData.to)) {
      newErrors.to = 'Invalid email format';
    }

    if (formData.cc && !isValidEmail(formData.cc)) {
      newErrors.cc = 'Invalid CC email format';
    }

    if (formData.bcc && !isValidEmail(formData.bcc)) {
      newErrors.bcc = 'Invalid BCC email format';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.body.trim()) {
      newErrors.body = 'Message body is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) return;

    setIsLoading(true);

    await new Promise((resolve) => setTimeout(resolve, 1500));

    console.log('Sending email via SMTP:', formData);

    setIsLoading(false);

    alert('Email sent successfully via SMTP!');
    
    setTimeout(() => {
      navigate(-1);
    }, 1000);
  };

  const handleCancel = () => {
    navigate(-1);
  };

  return (
    <>
      <PageMeta
        title="Send Email | JGPNR Admin Panel"
        description="Send email to customers"
      />
      <PageBreadcrumb pageTitle="Send Email" />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ComponentCard title="Compose Email" desc="Send email via SMTP">
            <form onSubmit={handleSubmit} className="space-y-5">
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
                      SMTP Email Sending
                    </p>
                    <p className="mt-1 text-sm text-blue-light-600 dark:text-blue-light-400">
                      This email will be sent directly via SMTP server. Make sure your SMTP settings are configured correctly.
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <Label htmlFor="template">Use Template (Optional)</Label>
                <Select
                  options={[{ value: "", label: "No Template" }, ...templateOptions]}
                  placeholder="Select a template"
                  defaultValue={selectedTemplate}
                  onChange={(value) => setSelectedTemplate(value)}
                />
              </div>

              <div>
                <Label htmlFor="to">To (Recipient) *</Label>
                <Input
                  type="email"
                  id="to"
                  value={formData.to}
                  onChange={(e) => handleChange('to', e.target.value)}
                  error={errors.to}
                  placeholder="customer@example.com"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
                <div>
                  <Label htmlFor="cc">CC (Optional)</Label>
                  <Input
                    type="email"
                    id="cc"
                    value={formData.cc}
                    onChange={(e) => handleChange('cc', e.target.value)}
                    error={errors.cc}
                    placeholder="cc@example.com"
                  />
                </div>

                <div>
                  <Label htmlFor="bcc">BCC (Optional)</Label>
                  <Input
                    type="email"
                    id="bcc"
                    value={formData.bcc}
                    onChange={(e) => handleChange('bcc', e.target.value)}
                    error={errors.bcc}
                    placeholder="bcc@example.com"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Subject *</Label>
                <Input
                  type="text"
                  id="subject"
                  value={formData.subject}
                  onChange={(e) => handleChange('subject', e.target.value)}
                  error={errors.subject}
                  placeholder="Enter email subject"
                />
              </div>

              <div>
                <Label htmlFor="body">Message *</Label>
                <textarea
                  id="body"
                  rows={12}
                  value={formData.body}
                  onChange={(e) => handleChange('body', e.target.value)}
                  className={`w-full rounded-lg border bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:outline-hidden focus:ring-3 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${
                    errors.body
                      ? 'border-error-300 focus:border-error-300 focus:ring-error-500/10 dark:border-error-800'
                      : 'border-gray-300 focus:border-brand-300 focus:ring-brand-500/10 dark:border-gray-700 dark:focus:border-brand-800'
                  }`}
                  placeholder="Type your message here..."
                />
                {errors.body && (
                  <p className="mt-1 text-xs text-error-600 dark:text-error-500">{errors.body}</p>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handleCancel}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="md" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
                      Sending...
                    </>
                  ) : (
                    <>
                      <svg
                        className="mr-2 h-5 w-5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      Send Email via SMTP
                    </>
                  )}
                </Button>
              </div>
            </form>
          </ComponentCard>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-white/[0.03]">
            <h4 className="mb-4 text-sm font-semibold text-gray-900 dark:text-white/90">
              Quick Tips
            </h4>
            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li className="flex items-start gap-2">
                <span className="text-brand-500">•</span>
                <span>Select a template to auto-fill content</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-500">•</span>
                <span>Variables like {'{firstName}'} will be replaced</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-brand-500">•</span>
                <span>Email sends via configured SMTP server</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
}