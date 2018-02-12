// actions
import { RTCConnection, RTCConnectionMessage, RTC_CONN, RTC_MESSAGE } from './connexion';

import {
  refreshGridWithoutCurrent,
  increaseSpeed,
  drawPiece,
  erasePiece,
  setPiece,
  setNewPiece,
  togglePlay,
  dropPiece,
  movePieceLeft,
  movePieceRight,
  moveDown,
  rotatePiece,
  DRAW_PIECE,
  ERASE_PIECE,
  SET_PIECE,
  TOGGLE_PLAY,
  SET_NEW_PIECE,
  REFRESH_GRID_WITHOUT_CURRENT,
  INCREASE_SPEED,
  DELETE_ROWS,
} from './tetris';

export default {
  RTC_CONN,
  RTC_MESSAGE,
  DRAW_PIECE,
  ERASE_PIECE,
  SET_PIECE,
  TOGGLE_PLAY,
  SET_NEW_PIECE,
  REFRESH_GRID_WITHOUT_CURRENT,
  INCREASE_SPEED,
  DELETE_ROWS,
  RTCConnection,
  RTCConnectionMessage,
  refreshGridWithoutCurrent,
  increaseSpeed,
  drawPiece,
  erasePiece,
  setPiece,
  setNewPiece,
  togglePlay,
  dropPiece,
  movePieceLeft,
  movePieceRight,
  moveDown,
  rotatePiece,
};
