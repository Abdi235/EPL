import React, { useEffect, useState } from "react";
import Loader from "react-loaders";
import "./index.scss";
import AnimatedLetters from "../AnimatedLetters";
import { defaultPlayerSeason } from "../../utils/playerDataset";

const Search = () => {
    const [letterClass, setLetterClass] = useState('text-animate');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        const timer = setTimeout(() => {
            setLetterClass("text-animate-hover");
        }, 3000); 

        return () => { 
            clearTimeout(timer);
        }
    }, []);

    const handleSearchChange = event => {
        setSearchQuery(event.target.value);
    };

    const handleGoButtonClick = () => {
        window.location.href = `/data?name=${encodeURIComponent(searchQuery)}&season=${encodeURIComponent(
          defaultPlayerSeason()
        )}`;
    };

    return (
        <>
            <div className="container teams-page browse-page">
                <div className="browse-page__glass">
                    <p className="browse-page__eyebrow">Player lookup</p>
                    <h1 className="page-title">
                        <AnimatedLetters letterClass={letterClass} strArray={"Search".split("")} idx={15} />
                    </h1>
                    <p className="browse-page__intro">
                        Enter a player name to jump to their season stats, minutes, and contributions on the data page.
                    </p>
                    <div className="search-bar">
                        <input
                            type="text"
                            placeholder="Search for players"
                            value={searchQuery}
                            onChange={handleSearchChange}
                        />
                        <button type="button" onClick={handleGoButtonClick}>Go</button>
                    </div>
                </div>
            </div>
            <Loader type="pacman"/>
        </>
    );
}

export default Search;
