import React from 'react';
import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import { Redirect } from 'react-router-dom';

import GamePlayers from '../../components/GamePlayers/GamePlayers';
import GameSettings from '../../components/GameSettings/GameSettings';

import AudioContainer from '../AudioContainer/AudioContainer';

import './GameSettingsView.scss';

const GameSettingsView = ({ game, dispatch, playerId }) => {
  if (!game) return <Redirect to="/games" />;

  const { isSolo } = game;
  const player = game.players.find(p => p.id === playerId) || {};
  const title = isSolo ? 'SOLO' : 'MULTI - WAITING ROOM';

  return (
    <div className="container">
      <h1 className="title">{title}</h1>
      <div className="audioContainer">
        <AudioContainer />
      </div>
      <div className="game-settings-view">
        <GameSettings game={game} dispatch={dispatch} player={player} isSolo={isSolo} />
        {!isSolo && <GamePlayers game={game} dispatch={dispatch} player={player} />}
      </div>
    </div>
  );
};

GameSettingsView.propTypes = {
  dispatch: PropTypes.func.isRequired,
  game: PropTypes.object,
  playerId: PropTypes.string.isRequired,
};

GameSettingsView.defaultProps = {
  game: null,
};

const mapStateToProps = state => ({
  game: state.game,
  playerId: state.player.id,
});

export default connect(mapStateToProps)(GameSettingsView);

