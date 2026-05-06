import React, { useEffect, useState } from "react";
import Loader from "react-loaders";
import { Link } from 'react-router-dom';
import "./index.scss";
import AnimatedLetters from "../AnimatedLetters";
import nationData from "../../data/nations.json";
import { defaultPlayerSeason } from "../../utils/playerDataset";
import { ReactCountryFlag } from 'react-country-flag';

const Nations = () => {
    const [letterClass, setLetterClass] = useState('text-animate');
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredNations, setFilteredNations] = useState([]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLetterClass("text-animate-hover");
        }, 3000); 

        return () => { 
            clearTimeout(timer);
        }
    });

    useEffect(() => {
      const filtered = nationData.nations.filter(nation =>
          nation.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
      setFilteredNations(filtered);
  }, [searchQuery]);

  const handleSearchChange = event => {
      setSearchQuery(event.target.value);
  };

    const renderCountryFlags = (countries) => {
        return (
          <div className="images-container">
            {countries.map((country, idx) => (
              <div key={idx} className="image-box">
                <ReactCountryFlag
                  countryCode={country.code}
                  svg
                  style={{
                    width: '100%',
                    height: '100%', 
                  }}
                />
                <div className="content">
                  <p className="title">{country.name}</p>
                  <Link
                    className="btn"
                    to={`/data?nation=${encodeURIComponent(country.search)}&season=${encodeURIComponent(
                      defaultPlayerSeason()
                    )}`}
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        );
      };
      return (
        <>
          <div className="container nation-page browse-page">
            <div className="browse-page__glass">
              <p className="browse-page__eyebrow">International</p>
              <h1 className="page-title">
                <AnimatedLetters letterClass={letterClass} strArray={"Nations".split("")} idx={15} />
              </h1>
              <p className="browse-page__intro">
                Choose a country to list players from that nation, then refine by season on the data view.
              </p>
              <div className="search-bar">
                <input
                  type="text"
                  placeholder="Search for countries"
                  value={searchQuery}
                  onChange={handleSearchChange}
                />
              </div>
              <div className="browse-page__body">{renderCountryFlags(filteredNations)}</div>
            </div>
          </div>
          <Loader type="pacman" />
        </>
      );
}
  

export default Nations