import _ from 'lodash';

import { getUUID } from '../helpers/utils';
import Payload from './Payload';
import Player from './Player';


const _allGames = [];


/**
 * Class Game
 *
 * @param constructor {String} - masterId
 */
class Game extends Payload {
  constructor(masterId) {
    const master = Player.getPlayerById(masterId);
    if (!master) throw new Error('Master not found');
    super({
      id: getUUID(),
      masterId: master.get('id'),
      speed: 'normal',
      size: 'normal',
      maxPlayers: 5,
      players: [],
      hasStarted: false,
      hasFinished: false,
      isFullVisibility: false,
      isPieceSynchro: false,
      pieceQueue: [],
    });
    this.addPlayer(masterId);
  }

  static get allGames() {
    return _allGames;
  }

  static getGameByid(id) {
    const result = _allGames.filter(game => game.get('id') === id);
    return (result.length > 0) ? result[0] : null;
  }

  broadcast(subject, data, idsToOmit = []) {
    data.path = subject;
    this.payload.players.forEach((player) => {
      // Don't emit to specific ids.
      if (!idsToOmit.includes(player.get('id'))) {
        const socket = player.get('socket');
        socket.emit('/game', data);
      }
    });
  }

  start() {
    this.set('hasStarted', true);
    this.broadcast('/update', { game: this.format() });
  }

  addPlayer(playerId) {
    const player = Player.getPlayerById(playerId);
    if (!player) throw new Error('Player not found');
    if (this.getPlayer(playerId)) throw new Error('Player already in game');
    player.update({ gameId: this.get('id') });
    // Send a join alert for RTC init in front.
    player.get('socket').emit('/game', { path: '/join', game: this.format() });
    this.payload.players.push(player);
    this.broadcast('/update', { game: this.format() });
  }

  removePlayer(playerId) {
    if (!this.getPlayer(playerId)) throw new Error('Player not in game');
    _.remove(this.payload.players, p => p.get('id') === playerId);
    // Game is now empty. Delete it.
    if (this.payload.players.length === 0) {
      _.remove(Game.allGames, g => g.get('id') === this.get('id'));
    } else {
      // Game not empty and masterPlayer quit. change masterPlayerId.
      if (this.get('masterId') === playerId) {
        const players = this.get('players');
        this.set('masterId', players[0].get('id'));
      }
      this.broadcast('/update', { game: this.format() });
    }
  }

  getPlayer(playerId) {
    const result = this.get('players').filter(player => player.get('id') === playerId);
    return (result.length > 0) ? result[0] : null;
  }

  format(props = ['id', 'masterId', 'speed', 'size', 'maxPlayers', 'hasStarted', 'hasFinished', 'pieceQueue', 'isPieceSynchro', 'isFullVisibility']) {
    let players = this.get('players');
    players = players.map(p => p.format());
    return _.merge(super.format(props), { players });
  }

  isMaster(playerId) {
    return playerId === this.get('masterId');
  }

  update(settings) {
    // If maxPlayer is set, we might have to kick players.
    const players = this.get('players');
    const playersNumber = players.length;
    if (settings.maxPlayers && settings.maxPlayers < playersNumber) {
      if (settings.maxPlayers === 0) settings.maxPlayers = 1;
      const i = settings.maxPlayers;
      let j = settings.maxPlayers;
      for (j; j < playersNumber; j++) {
        const p = players[i];
        // this.removePlayer(p.get('id'));
        p.get('socket').disconnect(true);
      }
    }
    _.merge(this.payload, settings);
    this.broadcast('/update', { game: this.format() });
  }
}

export default Game;
