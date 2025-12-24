// src/components/Customers/CustomerForm.tsx
import { useState } from "react";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Button from "../ui/button/Button";
import { isValidEmail, isValidPhone } from "../../utils/validation";

interface CustomerFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsapp: string;
  location: string;
  notes?: string;
}

interface CustomerFormProps {
  onSubmit: (data: CustomerFormData) => void;
  onCancel: () => void;
  initialData?: Partial<CustomerFormData>;
  isLoading?: boolean;
}

export default function CustomerForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: CustomerFormProps) {
  const [formData, setFormData] = useState<CustomerFormData>({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    whatsapp: initialData?.whatsapp || "",
    location: initialData?.location || "",
    notes: initialData?.notes || "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const handleChange = (field: keyof CustomerFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field
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

    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
    }

    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!isValidEmail(formData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Phone number is required";
    } else if (!isValidPhone(formData.phone)) {
      newErrors.phone = "Invalid phone number format";
    }

    if (formData.whatsapp && !isValidPhone(formData.whatsapp)) {
      newErrors.whatsapp = "Invalid WhatsApp number format";
    }

    if (!formData.location.trim()) {
      newErrors.location = "Location is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        <div>
          <Label htmlFor="firstName">First Name *</Label>
          <Input
            type="text"
            id="firstName"
            value={formData.firstName}
            onChange={(e) => handleChange("firstName", e.target.value)}
            error={errors.firstName}
            placeholder="Enter first name"
          />
        </div>

        <div>
          <Label htmlFor="lastName">Last Name *</Label>
          <Input
            type="text"
            id="lastName"
            value={formData.lastName}
            onChange={(e) => handleChange("lastName", e.target.value)}
            error={errors.lastName}
            placeholder="Enter last name"
          />
        </div>

        <div>
          <Label htmlFor="email">Email *</Label>
          <Input
            type="email"
            id="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
            error={errors.email}
            placeholder="email@example.com"
          />
        </div>

        <div>
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            type="tel"
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            error={errors.phone}
            placeholder="+234 800 000 0000"
          />
        </div>

        <div>
          <Label htmlFor="whatsapp">WhatsApp Number</Label>
          <Input
            type="tel"
            id="whatsapp"
            value={formData.whatsapp}
            onChange={(e) => handleChange("whatsapp", e.target.value)}
            error={errors.whatsapp}
            placeholder="+234 800 000 0000"
          />
        </div>

        <div>
          <Label htmlFor="location">Location *</Label>
          <Input
            type="text"
            id="location"
            value={formData.location}
            onChange={(e) => handleChange("location", e.target.value)}
            error={errors.location}
            placeholder="City, State"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="notes">Notes</Label>
        <textarea
          id="notes"
          rows={4}
          value={formData.notes}
          onChange={(e) => handleChange("notes", e.target.value)}
          className="w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
          placeholder="Add any additional notes about this customer..."
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="md" disabled={isLoading}>
          {isLoading ? "Processing..." : initialData ? "Update Customer" : "Add Customer"}
        </Button>
      </div>
    </form>
  );
}