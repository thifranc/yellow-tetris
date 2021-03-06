import { get } from 'lodash';

import { isPiecePlacable, checkRowsToDelete } from '../utils/tetris';
import { newPiece, socketLineCompleted, socketEndGame } from './socket';
import { keys } from '../helpers/constants';

// Constants
export const DRAW_PIECE = 'DRAW_PIECE';
export const ERASE_PIECE = 'ERASE_PIECE';
export const SET_PIECE = 'SET_PIECE';
export const TOGGLE_PLAY = 'TOGGLE_PLAY';
export const SET_NEW_PIECE = 'SET_NEW_PIECE';
export const ADD_PIECE_TO_QUEUE = 'ADD_PIECE_TO_QUEUE';
export const REFRESH_GRID_WITHOUT_CURRENT = 'REFRESH_GRID_WITHOUT_CURRENT';
export const INCREASE_SPEED = 'INCREASE_SPEED';
export const DELETE_ROWS = 'DELETE_ROWS';
export const ADD_ROW = 'ADD_ROW';
export const UPDATE_SPECTRUM = 'UPDATE_SPECTRUM';
export const UPDATE_SCORE = 'UPDATE_SCORE';
export const IS_LISTENING_KEY = 'IS_LISTENING_KEY';

// Action objects
export function isListeningKey() {
  return { type: IS_LISTENING_KEY };
}

export function refreshGridWithoutCurrent() {
  return { type: REFRESH_GRID_WITHOUT_CURRENT };
}

export function increaseSpeed() {
  return { type: INCREASE_SPEED };
}

export function drawPiece() {
  return { type: DRAW_PIECE };
}

export function erasePiece() {
  return { type: ERASE_PIECE };
}

export function addRow() {
  return { type: ADD_ROW };
}

export function setGrid() {
  return { type: SET_GRID };
}

export function setPiece(piece) {
  return { type: SET_PIECE, piece };
}

export function deleteRows(rowsToDelete) {
  return { type: DELETE_ROWS, rowsToDelete };
}

export function updateSpectrum(grid) {
  return { type: UPDATE_SPECTRUM, grid };
}

export function updateScore(score) {
  return { type: UPDATE_SCORE, score };
}

export const SET_GRID = 'SET_GRID';
/**
 * Add piece received by web socket to end of queue
 *
 * @param piece
 * @returns {function(*)}
 */
export function addPieceToQueue(piece) {
  return { type: ADD_PIECE_TO_QUEUE, newPiece: piece };
}

// Action thunk functions

/*
** Will drop piece from one x.
** Draw new Grid if needed or set a new piece if current piece can't be placed.
** We'll compare to Grid without current piece to avoid overlay.
*/
export function dropPiece() {
  return (dispatch, getState) => {
    const state = getState();

    // State is resume. Stop dropping.
    if (state.onPause || !state.game) return;

    const { currentPiece, gridWithoutCurrent, grid } = state;
    const nextPiece = { ...currentPiece, ...{ x: currentPiece.x + 1 } };
    const interval = state.game.speed.value || 1000;

    // Enough space to place piece.
    if (isPiecePlacable(nextPiece, gridWithoutCurrent)) {
      dispatch(erasePiece());
      dispatch(setPiece(nextPiece));
      dispatch(drawPiece());
      setTimeout(() => {
        dispatch(dropPiece());
      }, interval);
    } else {
      const rowsToDelete = checkRowsToDelete(grid, currentPiece.x);
      if (rowsToDelete.length) {
        rowsToDelete.forEach(() => {
          dispatch(socketLineCompleted());
        });
        dispatch(deleteRows(rowsToDelete));
      }
      // We set a new piece.
      dispatch(setNewPiece());
    }
  };
}

/**
 * Will set a new piece. Replace current piece. Check if Game is lost or start dropping new piece.
 */
export function setNewPiece() {
  return (dispatch, getState) => {
    // Set new current piece randomly.
    dispatch({ type: SET_NEW_PIECE });
    // Save Grid state without current piece for later comparison.
    dispatch({ type: REFRESH_GRID_WITHOUT_CURRENT });

    const { currentPiece, gridWithoutCurrent, game, piecesQueue } = getState();
    const interval = game.speed.value;

    if (piecesQueue.length <= 1) {
      dispatch(newPiece({ gameId: game.id }));
    }

    // Not enough space to place piece. Game is lost.
    if (!isPiecePlacable(currentPiece, gridWithoutCurrent)) {
      dispatch(socketEndGame(getState().game.id));
    } else {
      dispatch(updateSpectrum(gridWithoutCurrent));
      dispatch(drawPiece());

      // todo: move setTimeout from here
      setTimeout(() => {
        dispatch(dropPiece());
      }, interval);
    }
  };
}

/*
** Action when on/off Button is pressed.
*/
export function togglePlay() {
  return (dispatch) => {
    dispatch({ type: TOGGLE_PLAY });
    dispatch(dropPiece());
  };
}


/*
** Draw next piece position as a response to key events.
*/
function drawWithNextPiece(dispatch, getState, getNextPiece) {
  const state = getState();
  const { currentPiece, gridWithoutCurrent } = state;
  const nextPiece = getNextPiece(currentPiece);

  // Enough space to place piece.
  if (isPiecePlacable(nextPiece, gridWithoutCurrent)) {
    dispatch(erasePiece());
    dispatch(setPiece(nextPiece));
    dispatch(drawPiece());
  }
}

function movePieceLeft(dispatch, getState) {
  drawWithNextPiece(dispatch, getState, currentPiece => ({ ...currentPiece, ...{ y: currentPiece.y - 1 } }));
}

function movePieceRight(dispatch, getState) {
  drawWithNextPiece(dispatch, getState, currentPiece => ({ ...currentPiece, ...{ y: currentPiece.y + 1 } }));
}

function rotatePiece(dispatch, getState) {
  drawWithNextPiece(dispatch, getState, currentPiece => ({ ...currentPiece, ...{ direction: currentPiece.direction === 3 ? 0 : currentPiece.direction + 1 } }));
}

function movePieceDown(dispatch, getState) {
  drawWithNextPiece(dispatch, getState, currentPiece => ({ ...currentPiece, ...{ x: currentPiece.x + 1 } }));
}

// Will move piece to the lowest posible position.
function stickPieceDown(dispatch, getState) {
  const { currentPiece, gridWithoutCurrent } = getState();

  function tryNextPiece(piece, _gridWithoutCurrent) {
    const nextPiece = {
      ...piece,
      ...{ x: piece.x + 1 }
    };

    if (isPiecePlacable(nextPiece, _gridWithoutCurrent)) {
      tryNextPiece(nextPiece, _gridWithoutCurrent);
    } else {
      dispatch(erasePiece());
      dispatch(setPiece({ ...piece, isDroped: true }));
      dispatch(drawPiece());
    }
  }
  tryNextPiece(currentPiece, gridWithoutCurrent);
}
/*
** Map key events to actions.
*/
export function move(event) {
  return (dispatch, getState) => {
    const state = getState();
    if (state.onPause || !state.game || get(state, 'currentPiece.isDroped')) return;
    switch (event.keyCode) {
      case keys.LEFT:
        movePieceLeft(dispatch, getState);
        break;
      case keys.RIGHT:
        movePieceRight(dispatch, getState);
        break;
      case keys.UP:
        rotatePiece(dispatch, getState);
        break;
      case keys.DOWN:
        movePieceDown(dispatch, getState);
        break;
      case keys.SPACE:
        stickPieceDown(dispatch, getState);
        break;
    }
  };
}

