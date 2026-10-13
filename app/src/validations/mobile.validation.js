import * as z from 'zod';

export const propertySchema = z.object({
  name: z.string().min(1, 'Property Name is required'),
  nycBin: z.string().optional(),
  managementCompany: z.string().optional(),
  ownershipPercentage: z.number({ invalid_type_error: 'Ownership percentage must be a number' })
    .min(0, 'Percentage cannot be negative')
    .max(100, 'Percentage cannot exceed 100'),
  yearBuilt: z.number({ invalid_type_error: 'Year built must be a number' })
    .min(1700, 'Year built must be after 1700')
    .max(new Date().getFullYear(), 'Year built cannot be in the future'),
  squareFootage: z.number({ invalid_type_error: 'Square footage must be a number' })
    .min(1, 'Square footage must be greater than 0'),
  purchasePrice: z.number({ invalid_type_error: 'Purchase price must be a number' })
    .min(0, 'Purchase price cannot be negative'),
  currentValue: z.number({ invalid_type_error: 'Current value must be a number' })
    .min(0, 'Current value cannot be negative'),
});

export const buildingSchema = z.object({
  name: z.string().min(1, 'Building Name is required'),
  floors: z.number({ invalid_type_error: 'Floors must be a number' })
    .min(1, 'Must have at least 1 floor'),
  unitsCount: z.number({ invalid_type_error: 'Units count must be a number' })
    .min(0, 'Units count cannot be negative')
    .optional()
    .default(0),
});

export const unitSchema = z.object({
  unitNumber: z.string().min(1, 'Unit Number is required'),
  floor: z.number({ invalid_type_error: 'Floor must be a number' }),
  squareFootage: z.number({ invalid_type_error: 'Square footage must be a number' })
    .min(1, 'Square footage must be greater than 0'),
  bedrooms: z.number({ invalid_type_error: 'Bedrooms must be a number' })
    .min(0, 'Bedrooms cannot be negative'),
  bathrooms: z.number({ invalid_type_error: 'Bathrooms must be a number' })
    .min(0, 'Bathrooms cannot be negative'),
  rentAmount: z.number({ invalid_type_error: 'Rent amount must be a number' })
    .min(1, 'Rent must be positive'),
  securityDeposit: z.number({ invalid_type_error: 'Security deposit must be a number' })
    .min(0, 'Security deposit cannot be negative'),
  availabilityDate: z.string().min(1, 'Availability Date is required'),
});

export const tenantSchema = z.object({
  firstName: z.string().min(1, 'First Name is required'),
  lastName: z.string().min(1, 'Last Name is required'),
  preferredName: z.string().optional(),
  dob: z.string().optional(),
  gender: z.string().optional(),
  nationality: z.string().optional(),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Mobile Phone is required'),
  altPhone: z.string().optional(),
  idType: z.string().optional(),
  idNumber: z.string().optional(),
  emergencyName: z.string().optional(),
  emergencyRelationship: z.string().optional(),
  emergencyPhone: z.string().optional(),
  employer: z.string().optional(),
  position: z.string().optional(),
  monthlyIncome: z.number({ invalid_type_error: 'Monthly income must be a number' }).min(0, 'Income cannot be negative').optional(),
  employmentStatus: z.string().optional(),
  currentAddress: z.string().optional(),
  previousAddress: z.string().optional(),
  password: z.string().optional(),
});

export const leadSchema = z.object({
  name: z.string().min(1, 'Lead Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone number is required'),
});

export const screeningSchema = z.object({
  applicantName: z.string().min(1, 'Applicant Name is required'),
  email: z.string().email('Invalid email address'),
});

export const leaseSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  unitId: z.string().min(1, 'Unit is required'),
  startDate: z.string().min(1, 'Start Date is required'),
  endDate: z.string().min(1, 'End Date is required'),
  monthlyRent: z.number({ invalid_type_error: 'Rent must be a number' })
    .min(1, 'Rent must be positive'),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return new Date(data.startDate) < new Date(data.endDate);
  }
  return true;
}, {
  message: 'Lease Start Date must be before End Date',
  path: ['endDate'],
});

export const moveInSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  date: z.string().min(1, 'Move In Date is required'),
});

export const moveOutSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  date: z.string().min(1, 'Move Out Date is required'),
});

export const paymentSchema = z.object({
  amount: z.number({ invalid_type_error: 'Amount must be a number' })
    .min(1, 'Amount must be positive'),
  date: z.string().min(1, 'Payment Date is required'),
  dueDate: z.string().min(1, 'Due Date is required'),
  allocRent: z.number().min(0).optional(),
  allocUtilities: z.number().min(0).optional(),
  allocParking: z.number().min(0).optional(),
  allocPet: z.number().min(0).optional(),
});

export const invoiceSchema = z.object({
  tenantId: z.string().min(1, 'Tenant is required'),
  dueDate: z.string().min(1, 'Due Date is required'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(6, 'Password must be at least 6 characters'),
  newPassword: z.string().min(6, 'New Password must be at least 6 characters'),
  confirmPassword: z.string().min(1, 'Please confirm your password'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
});

export const provisionUserSchema = z.object({
  fullName: z.string().min(1, 'Full Name is required'),
  email: z.string().email('Invalid email address'),
  phone: z.string().min(1, 'Phone is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});
