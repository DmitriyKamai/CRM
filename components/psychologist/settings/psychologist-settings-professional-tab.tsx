"use client";

import { TabsContent } from "@/components/ui/tabs";
import { BIO_MAX_LENGTH, PROFESSION_OPTIONS } from "@/lib/settings/professional-profile";
import { SettingsSection } from "@/components/settings/shared/settings-section";
import { useProfessionalTabUi } from "@/hooks/use-professional-tab-ui";
import { ProfessionalTabPanel } from "@/components/psychologist/settings/professional-tab-panel";

export type PsychologistSettingsProfessionalTabProps = {
  activeTab: string;
  schedulingEnabled: boolean;
  profilePhotoUrl: string | null;
  professionalTab: ReturnType<typeof useProfessionalTabUi>;
  initials: string;
  alt: string;
  onRefetchProfile: () => void;
};

export function PsychologistSettingsProfessionalTab({
  activeTab,
  schedulingEnabled,
  profilePhotoUrl,
  professionalTab,
  initials,
  alt,
  onRefetchProfile
}: PsychologistSettingsProfessionalTabProps) {
  const {
    profilePhotoPublished,
    publishSaving,
    savingProfessional,
    hasProfessionalChanges,
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
    handlePublishProfileChange,
    handleSaveProfessional
  } = professionalTab;

  return (
    <TabsContent value="professional" className="mt-4">
      {activeTab === "professional" && (
        <SettingsSection title="Профессиональный профиль">
          <ProfessionalTabPanel
            schedulingEnabled={schedulingEnabled}
            profilePhotoUrl={profilePhotoUrl}
            profilePhotoPublished={profilePhotoPublished}
            initials={initials}
            alt={alt}
            publishSaving={publishSaving}
            onPublishChange={handlePublishProfileChange}
            onSuccess={() => void onRefetchProfile()}
            handleSaveProfessional={handleSaveProfessional}
            savingProfessional={savingProfessional}
            hasProfessionalChanges={hasProfessionalChanges}
            bio={bio}
            setBio={setBio}
            BIO_MAX_LENGTH={BIO_MAX_LENGTH}
            specialization={specialization}
            setSpecialization={setSpecialization}
            PROFESSION_OPTIONS={PROFESSION_OPTIONS}
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
