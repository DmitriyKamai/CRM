/** Ответ GET /api/user/profile для экрана настроек (клиент и психолог). */
export type UserSettingsProfile = {
  user: {
    name: string | null;
    email: string;
    image: string | null;
    dateOfBirth: string | null;
    role: string;
    phone?: string | null;
    country?: string | null;
    city?: string | null;
    gender?: string | null;
    maritalStatus?: string | null;
  };
  psychologistProfile: {
    firstName: string;
    lastName: string;
    phone: string | null;
    country: string | null;
    city: string | null;
    gender: string | null;
    maritalStatus: string | null;
    specialization: string | null;
    bio: string | null;
    profilePhotoUrl: string | null;
    profilePhotoPublished: boolean;
    contactPhone: string | null;
    contactTelegram: string | null;
    contactViber: string | null;
    contactWhatsapp: string | null;
  } | null;
};
