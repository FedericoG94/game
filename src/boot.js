import '@fontsource-variable/fredoka';
import '@fontsource-variable/nunito';
import './styles/main.css';
import { start as startGame } from './game.js';

export function start() {
  document.title = "Carlotta's Gift Run";
  const icon = document.querySelector('link[rel="icon"]');
  if (icon) icon.href = `${import.meta.env.BASE_URL}favicon.svg`;
  startGame();
}
