// app/profile/utils/constants.ts

export const WIZARD_STEPS = [
    { id: 'welcome', title: 'Tervetuloa',label: 'Tervetuloa'  },
    { id: 'basic', title: 'Perustiedot',label: 'Perustiedot' },
    { id: 'about', title: 'Lisää sinusta',label: 'Lisää sinusta' },
    { id: 'education', title: 'Koulutus',label: 'Koulutus' },
    { id: 'experience', title: 'Työkokemus',label: 'Työkokemus' },
    { id: 'skills', title: 'Taidot',label: 'Taidot' },
    { id: 'languages', title: 'Kielet',label: 'Kielet' },
    { id: 'certificates', title: 'Sertifikaatit',label: 'Sertifikaatit' },
    { id: 'additional', title: 'Lisätiedot',label: 'Lisätiedot' },
    { id: 'references', title: 'Suosittelijat',label: 'Suosittelijat' },
    { id: 'review', title: 'Yhteenveto',label: 'Yhteenveto' }
  ] as const;
