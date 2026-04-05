"use client";

import { TabsContent } from "@/components/ui/tabs";
import { BIO_MAX_LENGTH, PROFESSION_OPTIONS } from "@/lib/settings/professional-profile";
import { SettingsSection } from "@/components/settings/shared/settings-section";
import { useProfessionalTabUi } from "@/hooks/use-professional-tab-ui";
import { ProfessionalTabPanel } from "@/components/psychologist/settings/professional-tab-panel";

export type PsychologistSettingsProfessionalTabProps = {
  activeTab: string;
  profilePhotoUrl: string | null;
  professionalTab: ReturnType<typeof useProfessionalTabUi>;
  initials: string;
  alt: string;
  onRefetchProfile: () => void;
};

export function PsychologistSettingsProfessionalTab({
  activeTab,
  profilePhotoUrl,
  professionalTab,
  initials,
  alt,
  onRefetchProfile
}: PsychologistSettingsProfessionalTabProps) {
  const {
    profilePagePublished,
    catalogVisible,
    visibilitySaving,
    savingProfessional,
    hasProfessionalChanges,
    publicSlug,
    setPublicSlug,
    bio,
    setBio,
    specialization,
    setSpecialization,
    contactPhone,
    setContactPhone,
    contactTelegram,
    setContactTelegram,
    contactViber,
    setContactViber,
    contactWhatsapp,
    setContactWhatsapp,
    practiceCountry,
    setPracticeCountry,
    practiceCity,
    setPracticeCity,
    worksOnline,
    setWorksOnline,
    handleProfilePagePublishedChange,
    handleCatalogVisibleChange,
    handleSaveProfessional
  } = professionalTab;

  return (
    <TabsContent value="professional" className="mt-4">
      {activeTab === "professional" && (
        <SettingsSection title="Профессиональный профиль">
          <ProfessionalTabPanel
            profilePhotoUrl={profilePhotoUrl}
            initials={initials}
            alt={alt}
            onSuccess={() => void onRefetchProfile()}
            profilePagePublished={profilePagePublished}
            catalogVisible={catalogVisible}
            visibilitySaving={visibilitySaving}
            onProfilePagePublishedChange={handleProfilePagePublishedChange}
            onCatalogVisibleChange={handleCatalogVisibleChange}
            publicSlug={publicSlug}
            setPublicSlug={setPublicSlug}
            handleSaveProfessional={handleSaveProfessional}
            savingProfessional={savingProfessional}
            hasProfessionalChanges={hasProfessionalChanges}
            bio={bio}
            setBio={setBio}
            BIO_MAX_LENGTH={BIO_MAX_LENGTH}
            specialization={specialization}
            setSpecialization={setSpecialization}
            PROFESSION_OPTIONS={PROFESSION_OPTIONS}
            practiceCountry={practiceCountry}
            setPracticeCountry={setPracticeCountry}
            practiceCity={practiceCity}
            setPracticeCity={setPracticeCity}
            worksOnline={worksOnline}
            setWorksOnline={setWorksOnline}
            contactPhone={contactPhone}
            setContactPhone={setContactPhone}
            contactTelegram={contactTelegram}
            setContactTelegram={setContactTelegram}
            contactViber={contactViber}
            setContactViber={setContactViber}
            contactWhatsapp={contactWhatsapp}
            setContactWhatsapp={setContactWhatsapp}
          />
        </SettingsSection>
      )}
    </TabsContent>
  );
}
