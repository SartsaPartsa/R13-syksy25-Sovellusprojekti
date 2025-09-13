import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { XMLParser } from "fast-xml-parser";

// Finnkinon rajapinnan perusosoite
const FINNKINO_API = "https://www.finnkino.fi/xml";

export default function Theaters() {
  const { t } = useTranslation("common");

  // Käyttäjän hakusana teatterien suodattamiseen
  const [searchQuery, setSearchQuery] = useState("");

  // Mitkä kaupungit ovat auki (accordionin tila)
  const [openCities, setOpenCities] = useState([]);

  // Lista teattereista (haetaan API:sta)
  const [theaters, setTheaters] = useState([]);

  // Valittu teatteri (ID)
  const [selectedTheater, setSelectedTheater] = useState(null);

  // Valittu päivämäärä (muodossa dd.MM.yyyy)
  const [selectedDate, setSelectedDate] = useState("");

  // Valitun teatterin ja päivän näytökset
  const [shows, setShows] = useState([]);

  // Lataustilat
  const [loadingShows, setLoadingShows] = useState(false);
  const [loadingTheaters, setLoadingTheaters] = useState(true);

  // Mahdollinen virheilmoitus
  const [error, setError] = useState(null);

  // Funktio: avaa/sulkee kaupungin listasta
  const toggleCity = (city) => {
    setOpenCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  };

  // 🔹 Haetaan teatterit API:sta, kun komponentti ladataan
  useEffect(() => {
    const fetchTheaters = async () => {
      try {
        setLoadingTheaters(true); 

        // Haetaan XML-data
        const response = await fetch(`${FINNKINO_API}/TheatreAreas/`);
        const xmlData = await response.text();

        // Muutetaan XML → JSONiksi
        const parser = new XMLParser({ ignoreAttributes: false });
        const jsonData = parser.parse(xmlData);

        // Haetaan lista kaikista teattereista
        let theaterList = jsonData.TheatreAreas.TheatreArea;
        if (!Array.isArray(theaterList)) theaterList = [theaterList]; // jos tulee vain yksi teatteri, laitetaan se taulukoksi

        // Muokataan dataa:
        const parsed = theaterList
          .filter(
            (theater) =>
              theater.Name !== "Valitse alue/teatteri" && // poistetaan turha "Valitse alue"
              theater.Name !== "Pääkaupunkiseutu" && // poistetaan kokonaan
              theater.Name !== "Turku ja Raisio" // poistetaan yhdistelmä
          )
          .map((theater) => {
            // Finnkino palauttaa esim. "Espoo: Sello"
            const [city, ...rest] = theater.Name.split(":");
            return {
              id: theater.ID, // teatterin ID (tarvitaan ohjelmien hakuun)
              city: city.trim(), // kaupunki (Espoo)
              name: rest.length ? rest.join(":").trim() : "", // teatterin nimi (Sello)
            };
          })
          .filter((t) => t.name !== ""); // poistetaan kaupungin omat napit (jos ei nimeä)

        setTheaters(parsed); 
      } catch (err) {
        console.error("Error fetching theaters:", err);
        setError(t("errorFetchingData"));
      } finally {
        setLoadingTheaters(false); 
      }
    };

    fetchTheaters();
  }, [t]);

  // 🔹 Haetaan näytökset, kun valittu teatteri tai päivämäärä muuttuu
  useEffect(() => {
    if (!selectedTheater) return; // jos ei ole teatteria → ei tehdä mitään

    // Jos päivämäärää ei ole valittu → käytetään tämän päivän päivämäärää
    if (!selectedDate) {
      const today = new Date();
      const formattedToday = `${String(today.getDate()).padStart(2, "0")}.${String(
        today.getMonth() + 1
      ).padStart(2, "0")}.${today.getFullYear()}`;
      setSelectedDate(formattedToday);
      return;
    }

    const fetchShows = async () => {
      try {
        setLoadingShows(true); 
        setError(null);

        // Haetaan valitun teatterin ja päivän ohjelma
        const response = await fetch(
          `${FINNKINO_API}/Schedule/?area=${selectedTheater}&dt=${selectedDate}`
        );
        const xmlData = await response.text();

        // XML → JSON
        const parser = new XMLParser({ ignoreAttributes: false });
        const jsonData = parser.parse(xmlData);

        // Otetaan näytökset listaksi
        let showList = jsonData.Schedule.Shows?.Show || [];
        if (!Array.isArray(showList)) showList = [showList];

        // Muokataan näytöksistä käyttökelpoisia JS-objekteja
        setShows(
          showList.map((Show) => ({
            Title: Show.Title, // elokuvan nimi
            OriginalTitle: Show.OriginalTitle, // alkuperäinen nimi
            ProductionYear: Show.ProductionYear, // vuosiluku
            dttmShowStart: Show.dttmShowStart, // aloitusaika
            TheatreAuditorium: Show.TheatreAuditorium, // sali
            Theatre: Show.Theatre, // teatteri
            TheatreID: Show.TheatreID, // teatterin ID
            EventID: Show.EventID, // elokuvan ID
            Images: Show.Images ? Show.Images.EventSmallImagePortrait : null, // julistekuva
          }))
        );
      } catch (err) {
        console.error("Error fetching shows:", err);
        setError(t("errorFetchingShows"));
        setShows([]);
      } finally {
        setLoadingShows(false);
      }
    };

    fetchShows();
  }, [selectedTheater, selectedDate, t]);

  // 🔹 Ryhmitellään teatterit kaupunkien alle
  const theatersByCity = theaters.reduce((acc, theater) => {
    if (!acc[theater.city]) acc[theater.city] = [];
    acc[theater.city].push(theater);
    return acc;
  }, {});

  return (
    <div className="bg-gray-800 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Jos teatterit vielä latautuvat */}
        {loadingTheaters && <div className="text-white">{t("loading")}...</div>}
        {/* Jos tuli virhe */}
        {error && <div className="text-red-500">{error}</div>}

        {/* Näytetään teatterilista jos mitään ei ole valittu */}
        {!selectedTheater && !loadingTheaters && (
          <div>
            <h2 className="text-4xl font-bold text-center my-8 text-white tracking-wide">
              {t("chooseTheater")}
            </h2>

            {/* Hakukenttä */}
            <div className="max-w-3xl mx-auto p-5">
              <input
                type="text"
                placeholder={t("searchTheaters", {
                  en: "Search theaters",
                  fi: "Hae teattereita",
                })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-3 mb-6 rounded-lg border border-gray-300 text-lg"
              />

              {/* Käydään läpi kaupungit ja niiden teatterit */}
              {Object.entries(theatersByCity).map(([city, cityTheaters]) => {
                // Suodatetaan hakusanan mukaan
                const filtered = cityTheaters.filter(
                  (theater) =>
                    theater.name
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    city.toLowerCase().includes(searchQuery.toLowerCase())
                );
                if (filtered.length === 0) return null;

                // Onko kaupunki auki?
                const isOpen = openCities.includes(city);

                return (
                  <div key={city} className="mb-4">
                    {/* Kaupungin nappi */}
                    <button
                      onClick={() => toggleCity(city)}
                      className="w-full text-left px-4 py-3 bg-gray-900 hover:bg-gray-800 transition-colors duration-200 rounded-lg flex items-center justify-between group"
                    >
                      <span className="text-white text-xl">{city}</span>
                      <span
                        className={`text-[#FF8C00] transform transition-transform duration-200 ${
                          isOpen ? "rotate-180" : ""
                        }`}
                      >
                        ▼
                      </span>
                    </button>

                    {/* Teatterilista */}
                    {isOpen && (
                      <div className="mt-2 pl-8 pb-2 flex flex-wrap gap-3">
                        {filtered.map((theater) => (
                          <button
                            key={theater.id}
                            onClick={() => setSelectedTheater(theater.id)}
                            className="px-5 py-3 rounded-lg border border-[#FF8C00] bg-[#FF8C00] text-black hover:bg-[#E67E00] transition-colors duration-200"
                          >
                            {theater.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Jos teatteri on valittu → näytökset */}
        {selectedTheater && (
          <div className="max-w-6xl mx-auto p-5">
            <div className="flex items-center gap-4 mb-6">
              {/* Takaisin teatterilistaan */}
              <button
                onClick={() => {
                  setSelectedTheater(null);
                  setShows([]);
                  setSelectedDate("");
                }}
                className="px-5 py-2 rounded-lg bg-[#FF8C00] text-black hover:bg-[#E67E00] transition-colors duration-200"
              >
                {t("backToTheaters")}
              </button>

              {/* Päivämäärän valinta */}
              <div className="flex items-center gap-3">
                <label className="text-white font-medium">
                  {t("selectDate")}:
                </label>
                <input
                  type="date"
                  value={
                    selectedDate
                      ? selectedDate.split(".").reverse().join("-")
                      : ""
                  }
                  onChange={(e) => {
                    // input antaa päivämäärän muodossa YYYY-MM-DD
                    const [y, m, d] = e.target.value.split("-");
                    // muutetaan muotoon dd.MM.yyyy (API vaatii tätä)
                    setSelectedDate(`${d}.${m}.${y}`);
                  }}
                  className="px-3 py-2 rounded-lg border border-[#FF8C00] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#FF8C00] focus:border-[#FF8C00]"
                />
              </div>
            </div>

            {/* Näytökset */}
            {loadingShows && (
              <div className="text-white">{t("loadingShows")}...</div>
            )}

            {!loadingShows && shows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#FF8C00]">
                      <th className="p-4 text-left text-black font-bold">
                        {t("showTable.movie")}
                      </th>
                      <th className="p-4 text-left text-black font-bold">
                        {t("showTable.originalTitle")}
                      </th>
                      <th className="p-4 text-left text-black font-bold">
                        {t("showTable.theater")}
                      </th>
                      <th className="p-4 text-left text-black font-bold">
                        {t("showTable.dateAndTime")}
                      </th>
                      <th className="p-4 text-center text-black font-bold">
                        {t("showTable.auditorium")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-900">
                    {shows.map((show, idx) => (
                      <tr
                        key={idx}
                        className="border-b border-gray-800 hover:bg-gray-800 transition-colors duration-200"
                      >
                        {/* Elokuvan nimi ja kuva */}
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            {show.Images && (
                              <img
                                src={show.Images}
                                alt={show.Title}
                                className="w-12 h-18 object-cover rounded"
                              />
                            )}
                            <a
                              href={`https://www.finnkino.fi/event/${
                                show.EventID
                              }/title/${show.Title.toLowerCase()
                                .replace(/[åäö]/g, "a")
                                .replace(/[^a-z0-9]+/g, "-")}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-white hover:text-[#FF8C00] hover:underline"
                            >
                              {show.Title}
                            </a>
                          </div>
                        </td>
                        <td className="p-4 text-gray-400">
                          {show.OriginalTitle}
                        </td>
                        <td className="p-4">
                          <span className="text-[#FF8C00] hover:underline cursor-pointer">
                            {show.Theatre}
                          </span>
                        </td>
                        <td className="p-4 text-white">
                          {new Date(show.dttmShowStart).toLocaleString("fi-FI")}
                        </td>
                        <td className="p-4 text-center font-medium text-white">
                          {show.TheatreAuditorium}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Jos ei löytynyt yhtään näytöstä */}
            {!loadingShows && shows.length === 0 && (
              <div className="text-center p-8 bg-gray-900 rounded-lg border border-[#FF8C00]">
                <p className="text-white text-lg">
                  {t("noShowsAvailable")}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
