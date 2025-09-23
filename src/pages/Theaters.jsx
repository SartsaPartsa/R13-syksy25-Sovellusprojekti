import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { XMLParser } from "fast-xml-parser";

const FINNKINO_API = "https://www.finnkino.fi/xml";

export default function Theaters() {
  const { t } = useTranslation("common");
  const location = useLocation();
  const navigate = useNavigate();

  // search query for filtering theaters
  const [searchQuery, setSearchQuery] = useState("");

  // which city accordions are open
  const [openCities, setOpenCities] = useState([]);

  // list of theaters (from API)
  const [theaters, setTheaters] = useState([]);

  // selected theater id
  const [selectedTheater, setSelectedTheater] = useState(null);

  // selected date (dd.MM.yyyy)
  const [selectedDate, setSelectedDate] = useState("");

  // shows for the selected theater and date
  const [shows, setShows] = useState([]);

  // loading flags
  const [loadingShows, setLoadingShows] = useState(false);
  const [loadingTheaters, setLoadingTheaters] = useState(true);

  // possible error message
  const [error, setError] = useState(null);

  // if URL has ?area=... preselect that theater
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const area = sp.get("area");
    if (area) setSelectedTheater(area);
  }, [location.search]);

  // toggle city accordion
  const toggleCity = (city) => {
    setOpenCities((prev) =>
      prev.includes(city) ? prev.filter((c) => c !== city) : [...prev, city]
    );
  };

  // load theaters from Finnkino on mount
  useEffect(() => {
    const fetchTheaters = async () => {
      try {
        setLoadingTheaters(true);

        // fetch XML data
        const response = await fetch(`${FINNKINO_API}/TheatreAreas/`);
        const xmlData = await response.text();

        // parse XML → JSON
        const parser = new XMLParser({ ignoreAttributes: false });
        const jsonData = parser.parse(xmlData);

        // get list of theatre areas
        let theaterList = jsonData.TheatreAreas.TheatreArea;
        if (!Array.isArray(theaterList)) theaterList = [theaterList]; // ensure array if single item

        // normalize and filter data
        const parsed = theaterList
          .filter(
            (theater) =>
              theater.Name !== "Valitse alue/teatteri" && // remove placeholder
              theater.Name !== "Pääkaupunkiseutu" && // remove combined area
              theater.Name !== "Turku ja Raisio" // remove combined area
          )
          .map((theater) => {
            // Finnkino returns e.g. "Espoo: Sello"
            const [city, ...rest] = theater.Name.split(":");
            return {
              id: theater.ID, // theater ID (used to fetch schedule)
              city: city.trim(), // city (e.g. Espoo)
              name: rest.length ? rest.join(":").trim() : "", // theater name (e.g. Sello)
            };
          })
          .filter((t) => t.name !== ""); // remove area-only entries

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

  // load shows when selected theater or date changes
  useEffect(() => {
    if (!selectedTheater) return; // nothing to do without a theater

    // default to today if no date selected
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

        // fetch schedule for selected theater and date
        const response = await fetch(
          `${FINNKINO_API}/Schedule/?area=${selectedTheater}&dt=${selectedDate}`
        );
        const xmlData = await response.text();

        // parse XML → JSON
        const parser = new XMLParser({ ignoreAttributes: false });
        const jsonData = parser.parse(xmlData);

        // extract shows list
        let showList = jsonData.Schedule.Shows?.Show || [];
        if (!Array.isArray(showList)) showList = [showList];

        // map shows to usable objects
        setShows(
          showList.map((Show) => ({
            Title: Show.Title, // movie title
            OriginalTitle: Show.OriginalTitle, // original title
            ProductionYear: Show.ProductionYear, // year
            dttmShowStart: Show.dttmShowStart, // start time
            TheatreAuditorium: Show.TheatreAuditorium, // auditorium
            Theatre: Show.Theatre, // theater
            TheatreID: Show.TheatreID, // theater id
            EventID: Show.EventID, // event id
            Images: Show.Images ? Show.Images.EventSmallImagePortrait : null, // poster image
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

  // group theaters by city
  const theatersByCity = theaters.reduce((acc, theater) => {
    if (!acc[theater.city]) acc[theater.city] = [];
    acc[theater.city].push(theater);
    return acc;
  }, {});

  return (
    <div className="bg-gray-800 min-h-screen py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* loading state */}
        {loadingTheaters && <div className="text-white">{t("loading")}...</div>}
        {/* error banner */}
        {error && <div className="text-red-500">{error}</div>}

        {/* show theater list when none selected */}
        {!selectedTheater && !loadingTheaters && (
          <div>
            <h2 className="text-4xl font-bold text-center my-8 text-white tracking-wide">
              {t("chooseTheater")}
            </h2>

            {/* search input */}
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

              {/* list cities and their theaters */}
              {Object.entries(theatersByCity).map(([city, cityTheaters]) => {
                // filter by search query
                const filtered = cityTheaters.filter(
                  (theater) =>
                    theater.name
                      .toLowerCase()
                      .includes(searchQuery.toLowerCase()) ||
                    city.toLowerCase().includes(searchQuery.toLowerCase())
                );
                if (filtered.length === 0) return null;

                // is city expanded?
                const isOpen = openCities.includes(city);

                return (
                  <div key={city} className="mb-4">
                    {/* city toggle button */}
                    <button
                      onClick={() => toggleCity(city)}
                      className="w-full text-left px-4 py-3 bg-gray-900 hover:bg-gray-800 transition-colors duration-200 rounded-lg flex items-center justify-between group"
                    >
                      <span className="text-white text-xl">{city}</span>
                      <span
                        className={`text-[#FF8C00] transform transition-transform duration-200 ${isOpen ? "rotate-180" : ""
                          }`}
                      >
                        ▼
                      </span>
                    </button>

                    {/* theater buttons */}
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

        {/* if a theater is selected → show schedule */}
        {selectedTheater && (
          <div className="max-w-6xl mx-auto p-5">
            <div className="flex items-center gap-4 mb-6">
              {/* back to theater list */}
              <button
                onClick={() => {
                  setSelectedTheater(null);
                  setShows([]);
                  setSelectedDate("");
                  // remove possible ?area=... from url
                  navigate("/theaters", { replace: false });
                }}
                className="px-5 py-2 rounded-lg bg-[#FF8C00] text-black hover:bg-[#E67E00] transition-colors duration-200"
              >
                {t("backToTheaters")}
              </button>

              {/* date picker */}
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
                    // input gives YYYY-MM-DD; convert to dd.MM.yyyy for API
                    const [y, m, d] = e.target.value.split("-");
                    setSelectedDate(`${d}.${m}.${y}`);
                  }}
                  className="px-3 py-2 rounded-lg border border-[#FF8C00] bg-white text-black focus:outline-none focus:ring-2 focus:ring-[#FF8C00] focus:border-[#FF8C00]"
                />
              </div>
            </div>

            {/* schedule table */}
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
                        {/* movie title and thumbnail */}
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
                              href={`https://www.finnkino.fi/event/${show.EventID
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

            {/* no shows available */}
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
