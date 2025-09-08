import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'

const resources = {
  fi: {
    common: {
      appName: 'Movie App',
      home: 'Etusivu',
      movies: 'Elokuvat',
      theaters: 'Teatterit',
      search: 'Haku',
      login: 'Kirjaudu sisään',
      loginLead: 'Kirjaudu sisään jatkaaksesi',
      chooseTheater: 'Valitse teatteri',
      langFi: 'Suomi',
      langEn: 'Englanti',
      title: 'Tervetuloa Movie Appiin!',
      subtitle: 'Elokuvaharrastajien oma yhteisö - löydä elokuvat, tarkasta näytösajat, kirjoita arvosteluja ja jaa suosikkisi muiden kanssa.',
      introTitle: 'Päivän leffa',
      introLead: 'John Wick',
      showsTitle: 'Näytökset',
      showsLead: 'Tähän myöhemmin API-haku.',
      reviewsTitle: 'Arvostelut',
      reviewsLead: 'Käyttäjien arviot elokuvista.',
      footerApiSources: 'API-lähteet',
      footerAuthors: 'Tekijät',
      footerFinnkinoApi: 'Finnkino API',
      footerTmdbApi: 'TMDB API',
      footerTeamR13: 'Ryhmä 13',
      footerFollowUs: 'Seuraa meitä',
      notFound: {
        title: "404",
        lead: 'Sivua ei löytynyt.',
        backHome: 'Takaisin etusivulle',
      },
    },
  },
  en: {
    common: {
      appName: 'Movie App',
      home: 'Home',
      movies: 'Movies',
      theaters: 'Theaters',
      search: 'Search',
      login: 'Sign in',
      loginLead: 'Sign in to continue',
      chooseTheater: 'Choose theater',
      langFi: 'Finnish',
      langEn: 'English',
      title: 'Welcome to Movie App!',
      subtitle: 'The community for movie enthusiasts - discover movies, check showtimes, write reviews, and share your favorites with others.',
      introTitle: 'Movie Of The Day',
      introLead: 'John Wick',
      showsTitle: 'Showtimes',
      showsLead: 'API fetch coming later.',
      reviewsTitle: 'Reviews',
      reviewsLead: 'User reviews of movies.',
      footerApiSources: 'API sources',
      footerAuthors: 'Authors',
      footerFinnkinoApi: 'Finnkino API',
      footerTmdbApi: 'TMDB API',
      footerTeamR13: 'Team 13',
      footerFollowUs: 'Follow us',
      notFound: {
        title: "404",
        lead: 'Page not found.',
        backHome: 'Back to home',
      },
    },
  },
}

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: localStorage.getItem('lang') || 'fi',
    fallbackLng: 'fi',
    defaultNS: 'common',
    interpolation: { escapeValue: false },
  })

export default i18n
