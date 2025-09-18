import { useContext, useEffect, useState } from "react"
import { UserContext } from "../context/UserContext"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { fetchMovie } from "../lib/api/movies"
import { api } from "../lib/api"

// Suosikkinäkymä näyttää käyttäjän suosikkielokuvat listana
// Vaatii kirjautumisen toimiakseen
export default function Favorites() {
  // Käännösfunktio monikielisyyttä varten
  const { t } = useTranslation('common')
  // Käyttäjän tiedot ja suosikkilista contextista
  const { authUser, favorites, setFavorites } = useContext(UserContext)
  // Lista elokuvista joista näytetään tarkemmat tiedot (posterit, nimet jne)
  const [movies, setMovies] = useState([])

  // Haetaan suosikkielokuvat kun sivu latautuu tai käyttäjä vaihtuu
  useEffect(() => {
    // Hakee käyttäjän suosikkielokuvat ja niiden tiedot
    async function loadFavorites() {
      // Jos käyttäjä ei ole kirjautunut, tyhjennetään elokuvalista
      if (!authUser) {
        setMovies([])
        return
      }

      try {
        // 1. Haetaan ensin suosikkien ID:t backendistä
        const favoritesResponse = await api(`/api/favorites/${authUser.id}`)
        // Otetaan vastauksesta vain elokuvien ID:t
        const movieIds = favoritesResponse.map(f => f.movie_id)
        
        // 2. Päivitetään paikallinen suosikkilista ID:illä
        setFavorites(new Set(movieIds))
        
        // Jos suosikkeja ei ole, tyhjennetään elokuvalista
        if (movieIds.length === 0) {
          setMovies([])
          return
        }

        // Hae elokuvien tiedot
        const results = await Promise.all(
          movieIds.map(async (id) => {
            try {
              return await fetchMovie(id)
            } catch (error) {
              console.error(`Virhe elokuvan ${id} haussa:`, error)
              return null
            }
          })
        )
        setMovies(results.filter(Boolean))
      } catch (err) {
        console.error("Suosikkien lataus epäonnistui", err)
        setMovies([])
      }
    }
    loadFavorites()
  }, [authUser])

  if (!authUser) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 text-center">
        {t("favoritesPage.loginRequired")}
      </div>
    );
  }

  if (movies.length === 0) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-6 text-center">
        {t("favoritesPage.empty")}
      </div>
    );
  }

  // Funktio elokuvan poistamiseksi suosikeista
  // - Poistaa elokuvan backendistä
  // - Päivittää paikallisen suosikkilistan
  // - Päivittää näytettävien elokuvien listan
  const removeFavorite = async (movieId) => {
    // Tarkistetaan että käyttäjä on kirjautunut
    if (!authUser) return;

    try {
      // Poistetaan elokuva backendistä
      const response = await fetch(`/api/favorites/${authUser.id}/${movieId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Poistetaan elokuva paikallisesta suosikkilistasta
        const newFavorites = new Set(favorites);
        newFavorites.delete(movieId);
        setFavorites(newFavorites);
        
        // Poistetaan elokuva näytettävien elokuvien listasta
        setMovies(movies.filter(m => m.id !== movieId));
      }
    } catch (error) {
      console.error('Virhe suosikin poistamisessa:', error);
    }
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-6">
      <h1 className="text-2xl font-semibold mb-6">{t("favoritesPage.title")}</h1>
      <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {movies.map((m) => (
          <li key={m.id}
            className="relative group bg-neutral-800/60 rounded-2xl overflow-hidden ring-1 ring-white/10 hover:ring-[#F18800]/60 transition"
          >
            <Link to={`/movies/${m.id}`} className="block">
              <div className="relative">
                {m.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w342${m.poster_path}`}
                    alt={m.title}
                    className="w-full h-64 object-cover transition-transform duration-300 group-hover:scale-[1.02]"/>
                ) : (
                  <div className="w-full h-64 bg-neutral-700 flex items-center justify-center text-neutral-400">
                    {t("movie.noImage")}
                  </div>
                )}
                <div className="absolute left-2 top-2 rounded-full bg-black/70 px-2 py-0.5 text-xs text-white ring-1 ring-white/10">
                  ⭐ {m.vote_average ?? "–"}
                </div>
              </div>
              <button
                onClick={(e) => { e.preventDefault(); removeFavorite(m.id); }}
                className="absolute top-2 right-2 p-2 text-red-500 hover:text-red-600 transition-colors"
                aria-label="Poista suosikeista"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-6 h-6"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                  />
                </svg>
              </button>
              <div className="p-3">
                <div className="font-medium text-white line-clamp-1">{m.title}</div>
                <div className="text-sm text-neutral-400">
                  {(m.release_date || "").slice(0, 4)}
                </div>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

