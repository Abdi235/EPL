import "./index.scss";

const toCharArray = (strArray) => {
  if (Array.isArray(strArray)) return strArray;
  if (strArray == null) return [];
  return Array.from(String(strArray));
};

const AnimatedLetters = ({ letterClass, strArray, idx }) => {
  const letters = toCharArray(strArray);
  return (
    <span>
      {letters.map((char, i) => (
        <span key={`${char}-${i}-${idx}`} className={`${letterClass} _${i + idx}`}>
          {char}
        </span>
      ))}
    </span>
  );
};

export default AnimatedLetters;
