import {set} from 'minimal-state';
import {useEffect} from 'react';
import {useJamState} from './JamContext';

// unmute on space bar if currently muted
export function usePushToTalk() {
  const state = useJamState();
  useEffect(() => {
    let keys = [' ', 'Spacebar'];
    let isPressingKey = false;
    let unmuteOnSpaceDown = event => {
      if (
        keys.includes(event.key) &&
        state.micMuted &&
        !event.repeat &&
        event.target?.tagName !== 'INPUT' &&
        event.target?.tagName !== 'TEXTAREA'
      ) {
        isPressingKey = true;
        event.stopPropagation();
        event.preventDefault();
        set(state, 'micMuted', false);
      }
    };
    let muteOnSpaceUp = event => {
      if (
        isPressingKey &&
        keys.includes(event.key) &&
        !state.micMuted &&
        event.target?.tagName !== 'INPUT' &&
        event.target?.tagName !== 'TEXTAREA'
      ) {
        isPressingKey = false;
        event.stopPropagation();
        event.preventDefault();
        set(state, 'micMuted', true);
      }
    };
    document.addEventListener('keydown', unmuteOnSpaceDown);
    document.addEventListener('keyup', muteOnSpaceUp);
    return () => {
      document.removeEventListener('keydown', unmuteOnSpaceDown);
      document.removeEventListener('keyup', muteOnSpaceUp);
    };
  }, [state]);
}
