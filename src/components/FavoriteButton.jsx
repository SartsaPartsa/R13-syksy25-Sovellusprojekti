import { useContext } from 'react';
import { UserContext } from '../context/UserContext'; 
import { api } from '../lib/api'; 
import { FaHeart } from "react-icons/fa";

// Nappi, jolla lisätään tai poistetaan elokuva suosikeista
export default function FavoriteButton({ movieId }) {
  // Haetaan käyttäjä ja hänen suosikkinsa
  const { authUser, favorites, setFavorites } = useContext(UserContext);

  // Onko tämä elokuva jo suosikeissa?
  const isFavorite = favorites.has(movieId);

  // Kun nappia painetaan
  const toggleFavorite = async () => {
    if (!authUser) return; // Jos ei ole kirjautunut → ei tehdä mitään

    // Vaihdetaan sydämen tila heti näkyviin
    const newFavorites = new Set(favorites);
    if (isFavorite) {
      newFavorites.delete(movieId); // poista suosikeista
    } else {
      newFavorites.add(movieId); // lisää suosikkeihin
    }
    setFavorites(newFavorites);

    try {
      // Kerrotaan palvelimelle muutos
      if (isFavorite) {
        await api(`/api/favorites/${authUser.id}/${movieId}`, { method: 'DELETE' });
      } else {
        await api('/api/favorites', {
          method: 'POST',
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: authUser.id, movieId }),
        });
      }
    } catch (error) {
      console.error('Virhe:', error);

      // Jos palvelin ei onnistunut → palauta vanha sydäntilanne
      const rollback = new Set(favorites);
      if (isFavorite) {
        rollback.add(movieId);
      } else {
        rollback.delete(movieId);
      }
      setFavorites(rollback);
    }
  };

  // Jos ei ole kirjautunut → nappia ei näytetä ollenkaan
  if (!authUser) return null;

  return (
    <button
      onClick={(e) => {
        e.stopPropagation(); // estää klikin leviämisen
        e.preventDefault();  // estää sivun turhan uudelleenlatauksen
        toggleFavorite();    // vaihda sydämen tila
      }}
      className="absolute top-2 right-2 p-2 text-red-500 hover:text-red-600 transition-colors z-10"
      aria-label={isFavorite ? 'Poista suosikeista' : 'Lisää suosikkeihin'}
    >
      {isFavorite ? (
        // Jos on suosikeissa → punainen sydän
        <FaHeart className="w-6 h-6 text-red-600 drop-shadow-[0_0_10px_black]" />
      ) : (
        // Jos ei ole → valkoinen sydän
        <FaHeart className="w-6 h-6 text-white drop-shadow-[0_0_10px_black]" />
      )}
    </button>
  );
}
