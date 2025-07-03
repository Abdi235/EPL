.home-page{ 
    .text-zone { 
        position: absolute; 
        align-content: center;
        left: 10%; 
        top: 50%; 
        transform: translateY(-50%); 
        width: 40%; 
        max-height: 90%; 
        display: absolute;
    }
    h1{
        color: #fff; 
        font-size: 53px; 
        margin: 0; 
        font-weight: 400; 
        cursor: pointer;

        &::before { 
            color: #ffd700; 
            font-size: 18px; 
            position: absolute; 
            margin-top: -40px; 
            left: 15px; 
            opacity: 0.6; 
        }

        &::after { 
            color: #ffd700; 
            font-size: 18px; 
            position: absolute; 
            margin-top: 18px; 
            left: 20px; 
            animation: fadeIn 1s 1.7s backwards; 
            opacity: 0.6; 
        }
        img { 
            width: 200px; 
            opacity: 0; 
            height: auto; 
            animation: rotateIn 1s linear both; 
            animation-delay: 1.4s; 
        }
    }

    h2 { 
        color: #ade8f4; 
        margin-top: 20px; 
        font-weight: 500; 
        font-size: 11px; 
        font-family: sans-serif; 
        letter-spacing: 3px; 
        animation: fadeIn 1s 1.8s backwards; 
    }

    .flat-button { 
        color: #ffd700; 
        font-size: 15px; 
        font-weight: 800;
        letter-spacing: 4px;
        text-decoration: none;
        padding: 10px 18px; 
        border: 2px solid #ffd700; 
        margin-top: 25px; 
        float: left; 
        animation: fadeIn 1s 1.8s backwards; 
        white-space: nowrap; 

        &:hover { 
            background: #ffd700; 
            color: #333;
        }
    }
    .mute-button {
        color: #ffd700;
        font-size: 13px;
        font-weight: 400;
        letter-spacing: 3px;
        text-decoration: none;
        padding: 8px 15px;
        border: 1px solid #ffd700;
        margin-top: 25px;
        margin-left: 10px; // Add some space if it's next to another button
        float: left;
        background: transparent;
        cursor: pointer;

        &:hover {
            background: #ffd700;
            color: #333;
        }
    }
}

#background-video {
    position: fixed;
    right: 0;
    bottom: 0;
    min-width: 100%;
    min-height: 100%;
    width: auto;
    height: auto;
    z-index: -1; // Set z-index to -1 to ensure it's in the background
    background-size: cover;
    object-fit: cover; // This ensures the video covers the screen without distortion
    pointer-events: none; // Prevent interaction with the video
}

@media screen and (max-width: 1400px){
    .home-page{
        h1{
            font-size: 39px;
        }
    }
}
@media screen and (max-width: 1000px){
    
    .home-page{
        h1{
            font-size: 40px; 
            justify-content: center;
        }
        .text-zone{
            position: block;
            width: 100%; 
            transform: none;
            padding: 10px;
            box-sizing: border-box;
            display: inline-block;
            text-align: left;
            padding-top: 100px;
        }

        .flat-button{
            float: none;
            display: block;
            width: 125px;
        }
    }
}
