import React, { useEffect, useState } from "react";
import Loader from "react-loaders";
import { Link } from 'react-router-dom';
import "./index.scss";
import AnimatedLetters from "../AnimatedLetters";
import positionData from "../../data/positions.json";
import { defaultPlayerSeason } from "../../utils/playerDataset";

const Positions = () => {
    const [letterClass, setLetterClass] = useState('text-animate');
    const [searchQuery, setSearchQuery] = useState('');
    const [filteredPositions, setFilteredPositions] = useState([]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setLetterClass("text-animate-hover");
        }, 3000); 

        return () => { 
            clearTimeout(timer);
        }
    }, []);

    useEffect(() => {
        const filtered = positionData.positions.filter(position =>
            position.title.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setFilteredPositions(filtered);
    }, [searchQuery]);

    const handleSearchChange = event => {
        setSearchQuery(event.target.value);
    };

    const renderPosition = (positions) => { 
        return (
          <div className="images-container">
            {positions.map((position, idx) => (
              <div key={idx} className="image-box">
                <img src={position.cover} alt="positions" className="teams-image" />
                <div className="content">
                  <p className="title">{position.title}</p>
                  <Link
                    className="btn"
                    to={`/data?position=${encodeURIComponent(position.search)}&season=${encodeURIComponent(
                      defaultPlayerSeason()
                    )}`}
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )
    };

    return (
        <>
            <div className="container position-page browse-page">
                <div className="browse-page__glass">
                    <p className="browse-page__eyebrow">Roles</p>
                    <h1 className="page-title">
                        <AnimatedLetters letterClass={letterClass} strArray={"Positions".split("")} idx={15} />
                    </h1>
                    <p className="browse-page__intro">
                        Filter the player pool by on-pitch role—from goalkeepers to forwards—with one click into stats.
                    </p>
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search for positions"
                            value={searchQuery}
                            onChange={handleSearchChange}
                        />
                    </div>
                    <div className="browse-page__body">{renderPosition(filteredPositions)}</div>
                </div>
            </div>
            <Loader type="pacman"/>
        </>
    );
}

export default Positions;
