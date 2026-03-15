# Multilingual Implementation Guide

## Overview

This JWT Frontend application now supports multiple languages using `react-i18next`. The application includes:

- **English (en)** - Default language
- **Spanish (es)** - Español
- **French (fr)** - Français

## Features Implemented

### 1. Language Detection and Persistence

- Automatic browser language detection
- Language preference stored in localStorage
- Falls back to English if browser language is not supported

### 2. Language Switcher

- Dropdown selector in the header
- Real-time language switching
- Current language indicator

### 3. Translated Components

All user-facing text has been internationalized:

- **Header**: Application title
- **Navigation**: Login/Logout buttons and language selector
- **Welcome Page**: Welcome message and instructions
- **Login/Register Form**: All labels and buttons
- **Authentication Content**: Backend response labels

## File Structure

```
src/
├── locales/
│   ├── en/
│   │   └── translation.json    # English translations
│   ├── es/
│   │   └── translation.json    # Spanish translations
│   └── fr/
│       └── translation.json    # French translations
├── components/
│   ├── LanguageSwitcher.jsx    # Language selection component
│   └── [other components...]   # All updated with translations
└── i18n.js                     # i18next configuration
```

## Translation Keys Structure

```json
{
  "header": {
    "title": "Application title"
  },
  "navigation": {
    "login": "Login button text",
    "logout": "Logout button text",
    "language": "Language selector label"
  },
  "welcome": {
    "title": "Welcome page title",
    "subtitle": "Welcome page subtitle"
  },
  "auth": {
    "login": "Login tab",
    "register": "Register tab",
    "username": "Username field",
    "password": "Password field",
    "firstName": "First name field",
    "lastName": "Last name field",
    "signIn": "Sign in button",
    "signUp": "Sign up button"
  },
  "content": {
    "backendResponse": "Backend response title",
    "content": "Content label"
  },
  "languages": {
    "en": "English",
    "es": "Español",
    "fr": "Français"
  }
}
```

## How to Use

### Viewing Different Languages

1. Start the development server: `npm run dev`
2. Open http://localhost:5173/
3. Use the language dropdown in the header to switch between:
   - English
   - Español (Spanish)
   - Français (French)

### Adding New Languages

1. **Create translation file**:

   ```bash
   mkdir src/locales/[language-code]
   # Copy src/locales/en/translation.json to new folder
   # Translate all values to target language
   ```

2. **Update i18n configuration** (`src/i18n.js`):

   ```javascript
   import newLanguageTranslation from "./locales/[language-code]/translation.json";

   const resources = {
     // ... existing languages
     [language - code]: {
       translation: newLanguageTranslation,
     },
   };
   ```

3. **Add to language selector** (`src/components/LanguageSwitcher.jsx`):

   ```javascript
   const languages = [
     // ... existing languages
     { code: "[language-code]", name: t("languages.[language-code]") },
   ];
   ```

4. **Add language name to all translation files**:
   ```json
   {
     "languages": {
       // ... existing language names
       "[language-code]": "Native Language Name"
     }
   }
   ```

## Technical Implementation

### Dependencies Added

- `react-i18next`: React integration for i18next
- `i18next`: Core internationalization library
- `i18next-browser-languagedetector`: Browser language detection

### Key Components

1. **i18n Configuration** (`src/i18n.js`):

   - Configures supported languages
   - Sets up language detection
   - Loads translation resources

2. **Language Switcher** (`src/components/LanguageSwitcher.jsx`):

   - Provides UI for language selection
   - Uses `useTranslation` hook for translations
   - Calls `i18n.changeLanguage()` to switch languages

3. **Updated Components**:
   - All components now use `useTranslation()` hook
   - Hardcoded text replaced with `t('translation.key')` calls
   - Maintains original functionality while supporting multiple languages

### Language Persistence

- Current language stored in `localStorage`
- Automatically restored on page reload
- Falls back to browser language or English default

## Testing

To test the multilingual functionality:

1. **Language Switching**: Change language using the dropdown and verify all text updates
2. **Persistence**: Refresh the page and verify the selected language is maintained
3. **Browser Language**: Clear localStorage and verify browser language detection works
4. **Fallback**: Set an unsupported language and verify fallback to English

## Future Enhancements

Potential improvements for the multilingual system:

1. **Date and Number Formatting**: Use i18next for locale-specific formatting
2. **Dynamic Loading**: Load translation files on-demand to reduce bundle size
3. **Translation Management**: Integrate with translation management services
4. **RTL Support**: Add right-to-left language support
5. **Pluralization**: Add support for language-specific pluralization rules
6. **Backend Integration**: Store user language preference on the server
