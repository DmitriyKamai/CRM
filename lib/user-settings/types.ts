/** Ответ GET /api/user/profile для экрана настроек (клиент и психолог). */
export type UserSettingsProfile = {
  user: {
    name: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string;
    image: string | null;
    dateOfBirth: string | null;
    role: string;
    phone: string | null;
    country: string | null;
    city: string | null;
    gender: string | null;
    maritalStatus: string | null;
  };
  /** Только профессиональные данные психолога (не личные — они в user). */
  psychologistProfile: {
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
