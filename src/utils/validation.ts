
export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: any) => boolean;
  message?: string;
}

export interface ValidationRules {
  [key: string]: ValidationRule;
}

export interface ValidationErrors {
  [key: string]: string;
}

export const validateField = (
  value: any,
  rules: ValidationRule
): string | null => {
  if (rules.required && (!value || value.toString().trim() === "")) {
    return rules.message || "This field is required";
  }

  if (rules.minLength && value.length < rules.minLength) {
    return rules.message || `Minimum length is ${rules.minLength} characters`;
  }

  if (rules.maxLength && value.length > rules.maxLength) {
    return rules.message || `Maximum length is ${rules.maxLength} characters`;
  }

  if (rules.pattern && !rules.pattern.test(value)) {
    return rules.message || "Invalid format";
  }

  if (rules.custom && !rules.custom(value)) {
    return rules.message || "Invalid value";
  }

  return null;
};

export const validateForm = (
  data: { [key: string]: any },
  rules: ValidationRules
): ValidationErrors => {
  const errors: ValidationErrors = {};

  Object.keys(rules).forEach((field) => {
    const error = validateField(data[field], rules[field]);
    if (error) {
      errors[field] = error;
    }
  });

  return errors;
};

export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^(\+234|0)[789][01]\d{8}$/;
  return phoneRegex.test(phone.replace(/\s/g, ""));
};

export const isValidPassword = (password: string): boolean => {
  // At least 8 characters, one uppercase, one number, one special char
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export const sanitizeInput = (input: string): string => {
  return input.trim().replace(/[<>]/g, "");
};