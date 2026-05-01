/**
 * EPL club anthems — add matching MP3 files under Frontend/public/anthems/
 * (you must own or license any audio you host). Filenames below must match exactly.
 */
export const EPL_ANTHEM_PLAYLIST = [
  {
    id: 'liverpool',
    team: 'Liverpool FC',
    title: "You'll Never Walk Alone",
    artist: 'Gerry and the Pacemakers',
    src: '/anthems/liverpool-ynwa.mp3',
  },
  {
    id: 'man-city',
    team: 'Manchester City',
    title: 'Blue Moon',
    artist: 'The Marcels',
    src: '/anthems/man-city-blue-moon.mp3',
  },
  {
    id: 'west-ham',
    team: 'West Ham United',
    title: "I'm Forever Blowing Bubbles",
    artist: 'Traditional',
    src: '/anthems/west-ham-bubbles.mp3',
  },
  {
    id: 'arsenal',
    team: 'Arsenal FC',
    title: 'North London Forever',
    artist: 'Louis Dunford',
    src: '/anthems/arsenal-north-london-forever.mp3',
  },
  {
    id: 'spurs',
    team: 'Tottenham Hotspur',
    title: 'When the Spurs Go Marching In',
    artist: 'Traditional (from When the Saints Go Marching In)',
    src: '/anthems/spurs-marching-in.mp3',
  },
  {
    id: 'chelsea',
    team: 'Chelsea FC',
    title: 'Blue Is the Colour',
    artist: 'Chelsea squad (official club song)',
    src: '/anthems/chelsea-blue-is-the-colour.mp3',
  },
  {
    id: 'man-united',
    team: 'Manchester United',
    title: 'This Is the One',
    artist: 'The Stone Roses',
    src: '/anthems/man-united-this-is-the-one.mp3',
  },
  {
    id: 'everton',
    team: 'Everton FC',
    title: 'Z-Cars Theme',
    artist: 'Jack Trombey (TV theme)',
    src: '/anthems/everton-z-cars.mp3',
  },
  {
    id: 'wolves',
    team: 'Wolverhampton Wanderers',
    title: 'Hi Ho Silver Lining',
    artist: 'Jeff Beck',
    src: '/anthems/wolves-hi-ho-silver-lining.mp3',
  },
  {
    id: 'leeds',
    team: 'Leeds United',
    title: 'Marching On Together',
    artist: 'Leeds United (official anthem)',
    src: '/anthems/leeds-marching-on-together.mp3',
  },
];

function shuffleIndices(length) {
  const arr = [...Array(length).keys()];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function createShuffledOrder() {
  return shuffleIndices(EPL_ANTHEM_PLAYLIST.length);
}
