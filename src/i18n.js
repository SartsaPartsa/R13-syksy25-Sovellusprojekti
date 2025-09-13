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
      loading: 'Lataa...',
      errorFetchingData: 'Virhe haettaessa tietoja',
      selectTheater: 'Valitse teatteri',
      backToTheaters: 'Takaisin teattereihin',
      selectDate: 'Valitse päivä',
      showTable: {
        movie: 'Elokuva',
        originalTitle: 'Alkuperäinen nimi',
        theater: 'Teatteri',
        dateAndTime: 'Päivä ja aika',
        auditorium: 'Sali',
      },
      loadingShows: 'Haetaan näytöksiä...',
      noShowsAvailable: 'Ei näytöksiä saatavilla',

      signUp: 'Rekisteröidy',
      signup: 'Rekisteröidy',
      login: 'Kirjaudu sisään',
      loginlead: 'Kirjaudu sisään jatkaaksesi',
      loginSuccess: 'Kirjautuminen onnistui!',
      signupSuccess: 'Rekisteröityminen onnistui! Nyt voit kirjautua sisään.',
      authFailed: 'Kirjautuminen epäonnistui, yritä uudelleen.',
      invalidPassword: 'Salasanassa pitää olla vähintään 8 merkkiä, yksi iso kirjain ja yksi numero.',
      invalidEmail: 'Sähköpostiosoite ei ole kelvollinen.',
      missingFields: 'Syötä sähköposti ja salasana.',
      signupFailed: 'Rekisteröityminen epäonnistui. Tarkista tiedot.',
      logout: 'Kirjaudu ulos',
      favorites: 'Suosikit',
      groups: 'Ryhmät',
      myAccount: 'Omat tiedot',
      signuplead: 'Rekisteröidy jatkaaksesi',
      email: 'Sähköposti',
      submit: 'Rekisteröidy',
      password: 'Salasana',
      noAccount: 'Ei tiliä? Rekisteröidy',
      alreadySignup: 'Onko sinulla tili? Kirjaudu sisään',
      chooseTheater: 'Valitse teatteri',
      searchTheaters: 'Hae teattereita',
      langFi: 'Suomi',
      langEn: 'Englanti',
      title: 'Tervetuloa Movie Appiin!',
      subtitle:
        'Elokuvaharrastajien oma yhteisö - löydä elokuvat, tarkasta näytösajat, kirjoita arvosteluja ja jaa suosikkisi muiden kanssa.',
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
        title: '404',
        lead: 'Sivua ei löytynyt.',
        backHome: 'Takaisin etusivulle',
      },

      searchPage: {
        title: 'Hakutulokset',
        termLabel: 'Hakusana',
        resultsSuffix: 'tulosta',
        noResults: 'Ei tuloksia. Kokeile toista hakusanaa.',
        loading: 'Haetaan…',
      },

      filters: {
        genre: 'Genre',
        minRating: 'Minimiarvio',
        clear: 'Tyhjennä filtterit',
        year: 'Vuosiväli',
        from: 'Alkaen',
        to: 'Asti',
        sort: 'Järjestys',
        sortOptions: {
          relevance: 'Paras osuvuus',
          newest: 'Uusimmat',
          oldest: 'Vanhimmat',
          ratingHigh: 'Arvostelu (korkein)',
          ratingLow: 'Arvostelu (matalin)',
          titleAZ: 'Nimi A-Ö',
          popularity: 'Suosituimmat',
        },
      },

      pagination: {
        prev: 'Edellinen',
        next: 'Seuraava',
      },

      moviePage: {
        back: 'Takaisin',
        trailer: 'Katso traileri',
        overview: 'Yhteenveto',
        director: 'Ohjaaja',
        cast: 'Näyttelijät',
        recommendations: 'Suositukset',
      },

      // poistaminen
      account: {
        deleteBtn: 'Poista tili',
        deleting: 'Poistetaan…',
        confirmDelete: 'Haluatko varmasti poistaa tilin? Tätä toimintoa ei voi perua.',
        deleted: 'Tili poistettu.',
      },

      // salasanan vaihto
      changePassword: {
        title: 'Vaihda salasana',
        lead: 'Syötä nykyinen salasana ja uusi salasana.',
        current: 'Nykyinen salasana',
        new: 'Uusi salasana',
        confirm: 'Vahvista uusi salasana',
        hint: 'Vähintään 8 merkkiä, yksi iso kirjain ja yksi numero.',
        saveBtn: 'Tallenna',
        saving: 'Tallennetaan…',
        success: 'Salasana vaihdettu. Kirjaudu sisään uudelleen.',
        back: 'Takaisin omiin tietoihin',
        go: 'Vaihda salasana',
        errors: {
          missing: 'Täytä kaikki kentät.',
          mismatch: 'Salasanat eivät täsmää.',
          sameAsOld: 'Uuden salasanan tulee erota nykyisestä.',
          failed: 'Salasanan vaihto epäonnistui.',
        },
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
      loading: 'Loading...',
      errorFetchingData: 'Error fetching data',
      selectTheater: 'Select theater',
      backToTheaters: 'Back to theaters',
      selectDate: 'Select date',
      showTable: {
        movie: 'Movie',
        originalTitle: 'Original title',
        theater: 'Theater',
        dateAndTime: 'Date and time',
        auditorium: 'Auditorium',
      },
      loadingShows: 'Loading shows...',
      noShowsAvailable: 'No shows available',

      login: 'Sign in',
      logout: 'Log out',
      signUp: 'Sign Up',
      signup: 'Sign Up',
      loginSuccess: 'Login successful!',
      invalidPassword: 'The password must contain at least 8 characters, one uppercase letter and one number.',
      invalidEmail: 'Email address is not valid.',
      missingFields: 'Enter email and password.',
      signupSuccess: 'Registration successful! You can now log in.',
      authFailed: 'Login failed,try again.',
      signupFailed: 'Registration failed. Please check your details.',
      favorites: 'Favorites',
      groups: 'Groups',
      myAccount: 'My account',
      email: 'Email',
      submit: 'Confirm',
      password: 'Password',
      noAccount: 'No account? Sign up',
      alreadySignup: 'Already sign up? Sign in',
      loginlead: 'Sign in to continue',
      signuplead: 'Sign up to continue',
      chooseTheater: 'Choose theater',
      searchTheaters: 'Search theaters',
      langFi: 'Finnish',
      langEn: 'English',
      title: 'Welcome to Movie App!',
      subtitle:
        'The community for movie enthusiasts - discover movies, check showtimes, write reviews, and share your favorites with others.',
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
        title: '404',
        lead: 'Page not found.',
        backHome: 'Back to home',
      },

      searchPage: {
        title: 'Search results',
        termLabel: 'Query',
        resultsSuffix: 'results',
        noResults: 'No results. Try another query.',
        loading: 'Loading…',
      },

      filters: {
        genre: 'Genre',
        minRating: 'Min rating',
        clear: 'Clear filters',
        year: 'Year range',
        from: 'From',
        to: 'To',
        sort: 'Sort by',
        sortOptions: {
          relevance: 'Relevance',
          newest: 'Newest',
          oldest: 'Oldest',
          ratingHigh: 'Rating (high -> low)',
          ratingLow: 'Rating (low -> high)',
          titleAZ: 'Title A-Z',
          popularity: 'Popularity',
        },
      },

      pagination: {
        prev: 'Previous',
        next: 'Next',
      },

      movie: {
        noImage: 'No image',
      },

      moviePage: {
        back: 'Back',
        trailer: 'Watch trailer',
        overview: 'Overview',
        director: 'Director',
        cast: 'Cast',
        recommendations: 'Recommendations',
      },

      // account deletion
      account: {
        deleteBtn: 'Delete account',
        deleting: 'Deleting…',
        confirmDelete: 'Are you sure you want to delete your account? This cannot be undone.',
        deleted: 'Account deleted.',
      },

      // password change
      changePassword: {
        title: 'Change password',
        lead: 'Enter your current and new password.',
        current: 'Current password',
        new: 'New password',
        confirm: 'Confirm new password',
        hint: 'At least 8 chars, one uppercase letter and one number.',
        saveBtn: 'Save',
        saving: 'Saving…',
        success: 'Password changed. Please sign in again.',
        back: 'Back to My account',
        go: 'Change password',
        errors: {
          missing: 'Please fill in all fields.',
          mismatch: 'Passwords do not match.',
          sameAsOld: 'New password must differ from the current one.',
          failed: 'Failed to change password.',
        },
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
