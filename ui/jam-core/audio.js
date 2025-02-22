import {addLocalStream} from '../lib/swarm';
import {useState, declare, use, useRootState, useOn} from '../lib/state-tree';
import Microphone from './audio/Microphone';
import AudioFile from './audio/AudioFile';
import PlayingAudio from './audio/PlayingAudio';
import VolumeMeter from './audio/VolumeMeter';
const AudioContext = window.AudioContext || window.webkitAudioContext;

// TODO: could we use AudioContext.onstatechange to detect cases where the the ability to play audio is lost?

export {AudioState};

function AudioState({swarm}) {
  const state = useRootState();
  const audioElements = {}; // {peerId: HTMLAudioElement}
  let audioContext = null;

  // not clear whether this improves anything for Safari, could try to remove
  // creates lots of unnecessary audio elements in rooms with large audience
  useOn(swarm, 'newPeer', peerId => {
    if (!audioElements[peerId]) {
      audioElements[peerId] = new Audio();
      audioElements[peerId].muted = state.soundMuted;
    }
  });

  return function AudioState({
    myId,
    inRoom,
    iAmSpeaker,
    userInteracted,
    micMuted,
  }) {
    let [handRaised, audioFile] = useRootState(['handRaised', 'audioFile']);

    if (userInteracted && audioContext === null && AudioContext) {
      audioContext = new AudioContext();
    }

    let shouldHaveMic = !!(inRoom && (iAmSpeaker || handRaised));
    let {micStream, hasRequestedOnce} = use(Microphone, {shouldHaveMic});
    let {audioFileStream, audioFileElement} = use(AudioFile, {
      audioFile,
      audioContext,
    });

    let myAudio = audioFileStream ?? micStream;
    declare(Muted, {myAudio, micMuted});
    declare(ConnectMyAudio, {myAudio, iAmSpeaker, swarm});
    if (iAmSpeaker) {
      declare(VolumeMeter, {peerId: myId, stream: myAudio, audioContext});
    }

    let soundMuted = !inRoom || (iAmSpeaker && !hasRequestedOnce);

    let remoteStreams = use(swarm, 'remoteStreams');
    remoteStreams.map(({peerId, stream}) =>
      declare(PlayingAudio, {
        key: peerId,
        peerId,
        audioContext,
        audioElements,
        stream,
        soundMuted,
        shouldPlay: !!inRoom,
      })
    );

    return {myAudio, soundMuted, audioFileElement};
  };
}

function Muted({myAudio, micMuted}) {
  if (myAudio) {
    for (let track of myAudio.getTracks()) {
      if (track.enabled !== !micMuted) {
        track.enabled = !micMuted;
      }
    }
  }
}

function ConnectMyAudio({myAudio, iAmSpeaker, swarm}) {
  let [connected, setConnected] = useState(null);
  let shouldConnect = myAudio && iAmSpeaker;

  if (connected !== myAudio && shouldConnect) {
    addLocalStream(swarm, myAudio, 'audio');
    setConnected(myAudio);
  } else if (connected && !shouldConnect) {
    addLocalStream(swarm, null, 'audio');
    setConnected(null);
  }
}
