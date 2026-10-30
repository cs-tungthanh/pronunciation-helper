import { TRANSLATION_OFF } from './app-constants';
import { UI_LABELS } from './messages';

/**
 * Target languages offered for translation (codes accepted by Google and MyMemory)
 */

export const TARGET_LANGUAGES: ReadonlyArray<{ code: string; name: string }> = [
  { code: 'ar', name: 'Arabic' },
  { code: 'bn', name: 'Bengali' },
  { code: 'zh-CN', name: 'Chinese (Simplified)' },
  { code: 'zh-TW', name: 'Chinese (Traditional)' },
  { code: 'cs', name: 'Czech' },
  { code: 'nl', name: 'Dutch' },
  { code: 'en', name: 'English' },
  { code: 'fil', name: 'Filipino' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'id', name: 'Indonesian' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'km', name: 'Khmer' },
  { code: 'ko', name: 'Korean' },
  { code: 'lo', name: 'Lao' },
  { code: 'ms', name: 'Malay' },
  { code: 'fa', name: 'Persian' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' },
  { code: 'es', name: 'Spanish' },
  { code: 'sv', name: 'Swedish' },
  { code: 'th', name: 'Thai' },
  { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu' },
  { code: 'vi', name: 'Vietnamese' },
];

// Picked often enough to sit above the full list
const SUGGESTED_LANGUAGE_CODES = ['vi', 'en', 'zh-CN', 'ja'];

/** Target languages grouped for the translation picker: suggested first, then the rest */
export const TARGET_LANGUAGE_GROUPS: ReadonlyArray<{
  label: string;
  languages: ReadonlyArray<{ code: string; name: string }>;
}> = [
  {
    label: UI_LABELS.SUGGESTED_LANGUAGES,
    languages: SUGGESTED_LANGUAGE_CODES.flatMap(code => TARGET_LANGUAGES.filter(language => language.code === code))
  },
  {
    label: UI_LABELS.OTHER_LANGUAGES,
    languages: TARGET_LANGUAGES.filter(({ code }) => !SUGGESTED_LANGUAGE_CODES.includes(code))
  }
];

/** The choice that turns translation off, listed above the language groups */
export const TRANSLATION_OFF_CHOICE = { code: TRANSLATION_OFF, name: UI_LABELS.TRANSLATION_OFF };
