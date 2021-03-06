import logger from '../helpers/logger';
import Game from '../classes/Game';
import Player from '../classes/Player';
import handleSocketException from './handleSocketException';
import SocketException from '../classes/SocketException';
import { getConnection } from './socketManager';
import Bag from '../classes/Bag';

/**
 * Create a new game with player as gameMaster.
 */
function create(playerId, settings = {}) {
  new Game(playerId, settings); // eslint-disable-line no-new
}

/**
 * Join an existing game. If fail to find game, disconnect.
 */
function join(playerId, gameId) {
  const game = Game.getGameByid(gameId);
  if (!game) throw new SocketException('Game not found', true);

  // Check that game is not full and game has not started
  if (game.get('maxPlayers') === game.get('players').length || game.get('hasStarted')) {
    const player = Player.getPlayerById(playerId);
    if (!player) throw new SocketException('Player not found');

    // Disconnect player.
    player.get('socket').disconnect(true);
  } else {
    game.addPlayer(playerId);
  }
}

/**
 * Update an existing game. If fail to find game, disconnect.
 */
function update(playerId, gameId, settings) {
  const game = Game.getGameByid(gameId);
  if (!game) throw new SocketException('Game not found', true);

  // Check that player is allowed to update settings.
  if (game.isMaster(playerId)) game.update(settings);
}

/**
 *
 * @param playerId
 */
function line(playerId) {
  const player = Player.getPlayerById(playerId);
  if (!player) throw new SocketException('Player not found', true);

  const game = Game.getGameByid(player.get('gameId'));
  if (!game) throw new SocketException('Game not found', true);

  // Update score of player
  player.update({ score: player.get('score') + 10 });
  // Broadcast event addRow to all player but self.
  game.broadcast('/addRow', {}, [playerId]);
}

/**
 *
 * @param playerId
 * @param gameId
 */
function start(playerId, gameId) {
  const game = Game.getGameByid(gameId);
  if (!game) throw new SocketException('Game not found', true);

  // Check that player is allowed to start game.
  if (game.isMaster(playerId)) game.start();
}

/**
 *
 * @param playerId
 * @param gameId
 */
function end(playerId, gameId) {
  const currentGame = Game.getGameByid(gameId);
  const players = currentGame.get('players');
  const curPlayerIndex = players.findIndex(player => (player.get('id') === playerId));
  const playersLeft = players.filter(player => (player.get('id') !== playerId && player.get('hasWon') === null));

  if (playersLeft.length > 1) {
    players[curPlayerIndex].set('hasWon', false);
    getConnection().to(playerId).emit('/game', { path: '/end', hasWon: false });
  } else {
    players[curPlayerIndex].set('hasWon', true);
    getConnection().to(playerId).emit('/game', { path: '/end', hasWon: false });

    if (playersLeft && playersLeft[0]) {
      getConnection().to(playersLeft[0].get('id')).emit('/game', { path: '/end', hasWon: true });
    }
  }
}

/**
 *
 * @param gameId
 */
function restart(gameId) {
  const currentGame = Game.getGameByid(gameId);
  currentGame.get('players').forEach((player) => {
    player.set('hasWon', null);
    player.set('isReady', false);
  });
  currentGame.set('hasStarted', false);
  currentGame.bag = new Bag();
  currentGame.set('firstPiece', currentGame.bag.getRandomPiece());
  currentGame.broadcast('/restart');
}

/**
 * handle game socket input
 *
 * @param {Object} data - the data
 * @return {void}
 */
export default function (playerId, data) {
  try {
    const { path } = data;
    logger.info(`Socket - /game${path}`);
    switch (path) {
      case '/create': {
        create(playerId, data.settings);
        break;
      }
      case '/join': {
        join(playerId, data.gameId);
        break;
      }
      case '/update': {
        update(playerId, data.gameId, data.settings);
        break;
      }
      case '/line': {
        line(playerId);
        break;
      }
      case '/start': {
        start(playerId, data.gameId);
        break;
      }
      case '/end': {
        end(playerId, data.gameId);
        break;
      }
      case '/restart': {
        restart(data.gameId);
        break;
      }
      default:
        throw new SocketException('No path match');
    }
    logger.info('All Games', Game.allGames);
  } catch (e) {
    if (e instanceof SocketException) {
      e.socketId = playerId;
      handleSocketException(e);
    } else throw e;
  }
}
