class I18n {
    constructor() {
        this.translations = {};
        this.currentLang = this.getInitialLanguage();
        this.loadTranslations();
    }

    getInitialLanguage() {
        // Check localStorage first
        const storedLang = localStorage.getItem('language');
        if (storedLang && ['en', 'fr'].includes(storedLang)) {
            return storedLang;
        }

        // Check browser language
        const browserLang = navigator.language.split('-')[0];
        return ['en', 'fr'].includes(browserLang) ? browserLang : 'en';
    }

    async loadTranslations() {
        try {
            const response = await fetch(`/assets/translations/${this.currentLang}.json`);
            this.translations = await response.json();
            this.updatePageLanguage();
        } catch (error) {
            console.error('Error loading translations:', error);
            // Fallback to English if translation loading fails
            if (this.currentLang !== 'en') {
                this.currentLang = 'en';
                this.loadTranslations();
            }
        }
    }

    setLanguage(lang) {
        if (this.currentLang === lang) return;
        this.currentLang = lang;
        localStorage.setItem('language', lang);
        this.loadTranslations();
        
        // Dispatch custom event for language change
        window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: lang } }));
    }

    t(key) {
        return this.getNestedTranslation(this.translations, key) || key;
    }

    getNestedTranslation(obj, path) {
        return path.split('.').reduce((p, c) => p && p[c], obj);
    }

    updatePageLanguage() {
        // Update HTML lang attribute
        document.documentElement.lang = this.currentLang;

        // Update meta tags
        document.title = this.t('meta.title');
        document.querySelector('meta[name="description"]').content = this.t('meta.description');
        document.querySelector('meta[name="keywords"]').content = this.t('meta.keywords');

        // Update all elements with data-i18n attribute
        document.querySelectorAll('[data-i18n]').forEach(element => {
            const key = element.getAttribute('data-i18n');
            if (key.endsWith('.placeholder')) {
                element.placeholder = this.t(key);
            } else {
                element.textContent = this.t(key);
            }
        });
    }
}

// Initialize translations
const i18n = new I18n();

// Add language switcher functionality
document.addEventListener('DOMContentLoaded', () => {
    const languageSwitcher = document.createElement('div');
    languageSwitcher.className = 'language-switcher';
    languageSwitcher.innerHTML = `
        <button class="lang-btn" data-lang="en">EN</button>
        <button class="lang-btn" data-lang="fr">FR</button>
    `;

    document.body.insertBefore(languageSwitcher, document.body.firstChild);

    // Add click handlers for language buttons
    languageSwitcher.querySelectorAll('.lang-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const lang = btn.getAttribute('data-lang');
            i18n.setLanguage(lang);
            
            // Update active state of buttons
            languageSwitcher.querySelectorAll('.lang-btn').forEach(b => {
                b.classList.toggle('active', b.getAttribute('data-lang') === lang);
            });
        });
    });

    // Set initial active state
    languageSwitcher.querySelector(`[data-lang="${i18n.currentLang}"]`).classList.add('active');
}); 