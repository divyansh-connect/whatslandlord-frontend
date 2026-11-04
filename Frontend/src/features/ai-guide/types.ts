export type GuideLanguage = 'en' | 'es';

export interface GuideStep {
  stepNumber: number;
  title: string;
  description: string;
}

export interface PageGuide {
  pageKey: string;
  title: {
    en: string;
    es: string;
  };
  subtitle: {
    en: string;
    es: string;
  };
  steps: {
    en: GuideStep[];
    es: GuideStep[];
  };
}

