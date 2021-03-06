export function rtcMessage(state, action) {

  if (!state.game) return state;
  const data = JSON.parse(action.data);
  const peerIndex = state.game.players.findIndex(p => (p.webRTCId === data.peer));
  const players = [...state.game.players];
  players[peerIndex].spectrum = data.spectrum;
  return { ...state, game: { ...state.game, players } };
}

export function addAudioStream(state, action) {
  const { audioStreams } = state;
  console.log('all streams are -- ', [...audioStreams, action.data]);
  return { ...state, audioStreams: [...audioStreams, action.data] };
}

export function toggleMuted(state, action) {
  return { ...state, muted: action.data.muted };
}

export function initAudioStream(state) {
  return { ...state, hasAudio: true };
}

export function hasCalled(state) {
  return { ...state, hasCalled: true };
}

export function killAudio(state) {
  return { ...state, audioStreams: [], hasCalled: false };
}
