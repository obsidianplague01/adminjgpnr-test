// src/components/Tickets/TicketForm.tsx
import { useState } from "react";
import Input from "../form/input/InputField";
import Label from "../form/Label";
import Select from "../form/Select";
import Button from "../ui/button/Button";
import { isValidEmail, isValidPhone } from "../../utils/validation";

interface TicketFormData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  whatsapp: string;
  location: string;
  quantity: number;
  gameSession: string;
}

interface TicketFormProps {
  onSubmit: (data: TicketFormData) => void;
  onCancel: () => void;
  initialData?: Partial<TicketFormData>;
  isLoading?: boolean;
}

export default function TicketForm({
  onSubmit,
  onCancel,
  initialData,
  isLoading = false,
}: TicketFormProps) {
  const [formData, setFormData] = useState<TicketFormData>({
    firstName: initialData?.firstName || "",
    lastName: initialData?.lastName || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    whatsapp: initialData?.whatsapp || "",
    location: initialData?.location || "",
    quantity: initialData?.quantity || 1,
    gameSession: initialData?.gameSession || "",
  });

  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const sessionOptions = [
    { value: "morning", label: "Morning Session (9:00 AM - 12:00 PM)" },
    { value: "afternoon", label: "Afternoon Session (1:00 PM - 4:00 PM)" },
    { value: "evening", label: "Evening Session (5:00 PM - 8:00 PM)" },
    { value: "weekend", label: "Weekend Special (10:00 AM - 6:00 PM)" },
  ];

  const handleChange = (field: keyof TicketFormData, value: string | number) => {
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

    if (formData.quantity < 1) {
      newErrors.quantity = "Quantity must be at least 1";
    }

    if (!formData.gameSession) {
      newErrors.gameSession = "Game session is required";
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

        <div>
          <Label htmlFor="quantity">Number of Tickets *</Label>
          <Input
            type="number"
            id="quantity"
            min="1"
            value={formData.quantity}
            onChange={(e) => handleChange("quantity", parseInt(e.target.value))}
            error={errors.quantity}
            placeholder="1"
          />
        </div>

        <div>
          <Label htmlFor="gameSession">Game Session *</Label>
          <Select
            options={sessionOptions}
            placeholder="Select session"
            defaultValue={formData.gameSession}
            onChange={(value) => handleChange("gameSession", value)}
          />
          {errors.gameSession && (
            <p className="mt-1 text-xs text-error-600 dark:text-error-500">
              {errors.gameSession}
            </p>
          )}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" size="md" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="md" disabled={isLoading}>
          {isLoading ? "Processing..." : initialData ? "Update Ticket" : "Create Ticket"}
        </Button>
      </div>
    </form>
  );
}