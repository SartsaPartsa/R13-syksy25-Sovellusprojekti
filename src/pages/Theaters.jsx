import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { XMLParser } from "fast-xml-parser";

// Tämä on se osoite, mistä Finnkinon tiedot haetaan
const FINNKINO_API = "https://www.finnkino.fi/xml";

// Tähän on listattu kaupungit ja niissä olevat elokuvateatterit.
// Jokaisella teatterilla on oma tunnusnumero (ID), jota käytetään hakemiseen.
const THEATER_ID_MAP = {
  "Helsinki": {
    "TENNISPALATSI": "1033",
    "KINOPALATSI": "1031",
    "ITIS": "1045",
    "MAXIM": "1032"
  },
  "Espoo": {
    "OMENA": "1039",
    "SELLO": "1038"
  },
  "Vantaa": {
    "FLAMINGO": "1013"
  },
  "Jyväskylä": {
    "FANTASIA": "1015"
  },
  "Kuopio": {
    "SCALA": "1016"
  },
  "Lahti": {
    "KUVAPALATSI": "1017"
  },
  "Lappeenranta": {
    "STRAND": "1041"
  },
  "Oulu": {
    "PLAZA": "1018"
  },
  "Pori": {
    "PROMENADI": "1019"
  },
  "Tampere": {
    "CINE ATLAS": "1034",
    "PLEVNA": "1035"
  },
  "Turku": {
    "KINOPALATSI": "1022"
  },
  "Raisio": {
    "LUXE MYLLY": "1037"
  }
};

export default function Theaters() {
  // Tällä saadaan käännökset (tekstit voi olla suomeksi/englanniksi)
  const { t } = useTranslation("common");

  // Tämä tallentaa sen mitä hakukenttään on kirjoitettu
  const [searchQuery, setSearchQuery] = useState("");
  // Tämä muistaa mitkä kaupungit on klikattu auki (eli näkyykö sen teatterit)
  const [openCities, setOpenCities] = useState([]);
  // Tänne haetaan kaikki Finnkinon teatterit API:sta
  const [theaters, setTheaters] = useState([]);
  // Tänne talletetaan mikä teatteri on valittu
  const [selectedTheater, setSelectedTheater] = useState(null);
  // Tänne talletetaan käyttäjän valitsema päivämäärä (jos ei valita, käytetään tämän päivän päivää)
  const [selectedDate, setSelectedDate] = useState("");
  // Tänne haetaan näytökset valitusta teatterista ja päivämäärästä
  const [shows, setShows] = useState([]);
  // Tämä kertoo ollaanko juuri nyt hakemassa näytöksiä (true/false)
  const [loadingShows, setLoadingShows] = useState(false);
  // Tänne tallennetaan mahdollinen virheilmoitus
  const [error, setError] = useState(null);
  // Tämä kertoo ollaanko juuri nyt hakemassa teattereita (true/false)
  const [loadingTheaters, setLoadingTheaters] = useState(true);

  // Funktio, jolla avataan tai suljetaan kaupunki listasta
  const toggleCity = (city) => {
    setOpenCities(prev => 
      prev.includes(city) 
        ? prev.filter(c => c !== city) // Jos kaupunki oli jo auki → suljetaan
        : [...prev, city]              // Jos kaupunki oli kiinni → avataan
    );
  };

  // Tämä hakee Finnkinon API:sta kaikki teatterit, kun sivu ladataan
  useEffect(() => {
    const fetchTheaters = async () => {
      try {
        setLoadingTheaters(true); // Nyt ollaan lataustilassa
        const response = await fetch(`${FINNKINO_API}/TheatreAreas/`);
        const xmlData = await response.text(); // Vastauksena tulee XML-dataa
        const parser = new XMLParser({ ignoreAttributes: false });
        const jsonData = parser.parse(xmlData); // Muutetaan XML → JSON

        // Otetaan listasta kaikki teatterit
        let theaterList = jsonData.TheatreAreas.TheatreArea;
        if (!Array.isArray(theaterList)) theaterList = [theaterList];

        // Tallennetaan teatterit tilaan (pois lukien turha "Valitse alue/teatteri")
        setTheaters(
          theaterList
            .filter(theater => theater.Name !== "Valitse alue/teatteri")
            .map((theater) => ({
              id: theater.ID,
              name: theater.Name,
            }))
        );
      } catch (err) {
        console.error("Error fetching theaters:", err);
        setError(t("errorFetchingData")); // Näytetään virheilmoitus
      } finally {
        setLoadingTheaters(false); // Lataus valmis
      }
    };
    fetchTheaters();
  }, [t]);

  // Tämä hakee näytökset kun käyttäjä valitsee teatterin tai päivämäärän
  useEffect(() => {
    if (!selectedTheater) return;

    // Jos päivämäärää ei ole valittu, käytetään tämän päivän päivää
    if (!selectedDate) {
      const today = new Date();
      const formattedToday = `${String(today.getDate()).padStart(2, "0")}.${String(
        today.getMonth() + 1
      ).padStart(2, "0")}.${today.getFullYear()}`;
      setSelectedDate(formattedToday);
      return; 
    }

    // Haetaan näytökset API:sta
    const fetchShows = async () => {
      try {
        setLoadingShows(true);
        setError(null);

        const response = await fetch(
          `${FINNKINO_API}/Schedule/?area=${selectedTheater}&dt=${selectedDate}`
        );
        const xmlData = await response.text();
        const parser = new XMLParser({ ignoreAttributes: false });
        const jsonData = parser.parse(xmlData);

        // Otetaan kaikki näytökset listaan
        let showList = jsonData.Schedule.Shows.Show;
        if (!Array.isArray(showList)) showList = [showList];

        // Tallennetaan tarvittavat tiedot (elokuvan nimi, teatteri, kellonaika jne.)
        setShows(
          showList.map((Show) => ({
            Title: Show.Title,
            OriginalTitle: Show.OriginalTitle,
            ProductionYear: Show.ProductionYear,
            dttmShowStart: Show.dttmShowStart,
            TheatreAuditorium: Show.TheatreAuditorium,
            Theatre: Show.Theatre,
            TheatreID: Show.TheatreID,
            Images: Show.Images ? Show.Images.EventSmallImagePortrait : null,
          }))
        );
      } catch (err) {
        console.error("Error fetching shows:", err);
        setError(t("errorFetchingShows")); // Näytetään virheilmoitus
        setShows([]); // Tyhjennetään lista
      } finally {
        setLoadingShows(false); // Lataus valmis
      }
    };

    fetchShows();
  }, [selectedTheater, selectedDate, t]);

  return (
    <div className="bg-gray-800 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Jos teattereita ladataan → näytetään latausteksti */}
        {loadingTheaters && <div className="text-white">{t("loading")}...</div>}
        {/* Jos tuli virhe → näytetään virheilmoitus */}
        {error && <div className="text-red-500">{error}</div>}

        {/* Jos teatteria ei ole vielä valittu → näytetään lista kaupungeista */}
        {!selectedTheater && !loadingTheaters && (
          <div>
            <h2 className="text-4xl font-bold text-center my-8 text-white tracking-wide">
              {t('chooseTheater')}
            </h2>
            
            {/* Hakukenttä */}
            <div className="max-w-3xl mx-auto p-5">
              <input
                type="text"
                placeholder={t('searchTheaters', { en: 'Search theaters', fi: 'Hae teattereita' })}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full p-3 mb-6 rounded-lg border border-gray-300 text-lg"
              />
              
              {/* Käydään läpi kaikki kaupungit ja niiden teatterit */}
              {Object.entries(THEATER_ID_MAP).map(([city, theaters]) => {
                // Suodatetaan hakukentän perusteella
                const theatersArray = Object.entries(theaters)
                  .filter(([name]) => 
                    name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    city.toLowerCase().includes(searchQuery.toLowerCase())
                  );
                
                if (theatersArray.length === 0) return null;
                
                // Onko kaupunki klikattu auki
                const isOpen = openCities.includes(city);
                
                return (
                  <div key={city} className="mb-4">
                    {/* Kaupungin nimi (klikkaamalla avaa/sulkee) */}
                    <button
                      onClick={() => toggleCity(city)}
                      className="w-full text-left px-4 py-3 bg-gray-900 hover:bg-gray-800 transition-colors duration-200 rounded-lg flex items-center justify-between group"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-white text-xl">{city}</span>
                      </div>
                      {/* Nuoli joka pyörähtää kun kaupunki auki */}
                      <span className={`text-[#FF8C00] transform transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                        ▼
                      </span>
                    </button>
                    
                    {/* Näytetään teatterit vain jos kaupunki on auki */}
                    {isOpen && (
                      <div className="mt-2 pl-8 pb-2 flex flex-wrap gap-3">
                        {theatersArray.map(([name, id]) => (
                          <button
                            key={id}
                            onClick={() => setSelectedTheater(id)}
                            className="px-5 py-3 rounded-lg border border-[#FF8C00] bg-[#FF8C00] text-black hover:bg-[#E67E00] transition-colors duration-200"
                          >
                            {name}
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

        {/* Jos teatteri on valittu → näytetään näytökset */}
        {selectedTheater && (
          <div className="max-w-6xl mx-auto p-5">
            <div className="flex items-center gap-4 mb-6">
              {/* Takaisin teatterilistaan */}
              <button 
                onClick={() => { setSelectedTheater(null); setShows([]); setSelectedDate(""); }}
                className="px-5 py-2 rounded-lg bg-[#FF8C00] text-black hover:bg-[#E67E00] transition-colors duration-200"
              >
                {t('backToTheaters')}
              </button>

              {/* Päivämäärän valinta */}
              <div className="flex items-center gap-3">
                <label className="text-white font-medium">{t('selectDate')}: </label>
                <input
                  type="date"
                  value={selectedDate ? selectedDate.split(".").reverse().join("-") : ""}
                  onChange={(e) => {
                    const [y, m, d] = e.target.value.split("-");
                    setSelectedDate(`${d}.${m}.${y}`);
                  }}
                  className="px-3 py-2 rounded-lg border border-[#FF8C00] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#FF8C00] focus:border-[#FF8C00]"
                />
              </div>
            </div>

            {/* Jos ladataan näytöksiä → näytetään latausteksti */}
            {loadingShows && <div className="text-white">{t("loadingShows")}...</div>}

            {/* Jos näytöksiä löytyi → näytetään taulukossa */}
            {!loadingShows && shows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-[#FF8C00]">
                      <th className="p-4 text-left text-black font-bold">{t('showTable.movie')}</th>
                      <th className="p-4 text-left text-black font-bold">{t('showTable.originalTitle')}</th>
                      <th className="p-4 text-left text-black font-bold">{t('showTable.theater')}</th>
                      <th className="p-4 text-left text-black font-bold">{t('showTable.dateAndTime')}</th>
                      <th className="p-4 text-center text-black font-bold">{t('showTable.auditorium')}</th>
                    </tr>
                  </thead>
                  <tbody className="bg-gray-900">
                    {shows.map((show, idx) => (
                      <tr 
                        key={idx} 
                        className="border-b border-gray-800 hover:bg-gray-800 transition-colors duration-200"
                      >
                        {/* Elokuvan nimi + kuva */}
                        <td className="p-4">
                          <div className="flex items-center gap-4">
                            {show.Images && (
                              <img 
                                src={show.Images} 
                                alt={show.Title} 
                                className="w-12 h-18 object-cover rounded"
                              />
                            )}
                            <span className="text-white">{show.Title}</span>
                          </div>
                        </td>
                        <td className="p-4 text-gray-400">{show.OriginalTitle}</td>
                        <td className="p-4">
                          <span className="text-[#FF8C00] hover:underline cursor-pointer">
                            {show.Theatre}
                          </span>
                        </td>
                        <td className="p-4 text-white">
                          {new Date(show.dttmShowStart).toLocaleString('fi-FI')}
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
                <p className="text-white text-lg">{t("noShowsAvailable")}</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}