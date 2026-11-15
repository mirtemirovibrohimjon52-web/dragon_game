import { MarsDragonGame } from './game.js';

window.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('game-container');
  new MarsDragonGame(container);
});
