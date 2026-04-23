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
    id: string;
    publicRouteSerial: number;
    specialization: string | null;
    bio: string | null;
    profilePhotoUrl: string | null;
    publicSlug: string | null;
    profilePagePublished: boolean;
    catalogVisible: boolean;
    practiceCountry: string | null;
    practiceCity: string | null;
    worksOnline: boolean;
    contactPhone: string | null;
    contactTelegram: string | null;
    contactViber: string | null;
    contactWhatsapp: string | null;
    /** Slugs из справочника TherapyApproach, выбранные психологом. */
    therapyApproachSlugs: string[];
  } | null;
};
