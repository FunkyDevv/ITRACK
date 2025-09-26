// Phone number utility functions
export const formatPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Check if it's a US/international format
  if (cleaned.length === 10) {
    // US format: (123) 456-7890
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  } else if (cleaned.length === 11 && cleaned.startsWith('1')) {
    // US format with country code: +1 (123) 456-7890
    return `+1 (${cleaned.slice(1, 4)}) ${cleaned.slice(4, 7)}-${cleaned.slice(7)}`;
  } else if (cleaned.length > 10) {
    // International format: +XX XXX-XXX-XXXX
    const countryCode = cleaned.slice(0, cleaned.length - 10);
    const number = cleaned.slice(-10);
    return `+${countryCode} ${number.slice(0, 3)}-${number.slice(3, 6)}-${number.slice(6)}`;
  }
  
  // Return as-is if it doesn't match expected patterns
  return phoneNumber;
};

export const validatePhoneNumber = (phoneNumber: string): boolean => {
  const cleaned = phoneNumber.replace(/\D/g, '');
  
  // Must be at least 10 digits, at most 15 (international standard)
  return cleaned.length >= 10 && cleaned.length <= 15;
};

export const cleanPhoneNumber = (phoneNumber: string): string => {
  // Remove all non-digit characters except + at the beginning
  return phoneNumber.replace(/(?!^\+)\D/g, '');
};

export const isValidInternationalPhone = (phoneNumber: string): boolean => {
  // Basic international phone number regex
  const internationalPhoneRegex = /^\+?[1-9]\d{9,14}$/;
  const cleaned = phoneNumber.replace(/\D/g, '');
  return internationalPhoneRegex.test('+' + cleaned);
};