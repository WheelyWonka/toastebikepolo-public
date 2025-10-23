// Toasté Bike Polo Configuration
// Simplified for .ca domain only
window.TOASTE_CONFIG = {
    apiBaseUrl: window.location.hostname.includes('localhost') 
        ? 'http://localhost:8889/.netlify/functions'  // Local development
        : 'https://rest.toastebikepolo.ca/.netlify/functions',  // Production
    domain: 'ca',
    isProduction: !window.location.hostname.includes('localhost')
};
