import { el } from "@elemaudio/core";
import WebRenderer from "@elemaudio/web-renderer";
import { ChangeEvent, useCallback, useEffect, useState } from "react";
import styles from "./tones.module.scss";

type KeyPressMapType = { [key: string]: boolean };

const keyToMidiMap: { [key: string]: number } = {
  CapsLock: 130.813, // C3
  ShiftLeft: 138.591, // C#3
  Digit1: 146.832, // D3
  KeyQ: 155.563, // D#3
  KeyA: 164.814, // E3
  KeyZ: 174.614, // F3
  Digit2: 184.997, // F#3
  KeyW: 195.998, // G3
  KeyS: 207.652, // G#3
  KeyX: 220.0, // A3
  Digit3: 233.082, // A#3
  KeyE: 246.942, // B3
  KeyD: 261.626, // C4
  KeyC: 277.183, // C#4
  Digit4: 293.665, // D4
  KeyR: 311.127, // D#4
  KeyF: 329.628, // E4
  KeyV: 349.228, // F4
  Digit5: 369.994, // F#4
  KeyT: 391.995, // G4
  KeyG: 415.305, // G#4
  KeyB: 440.0, // A4
  Digit6: 466.164, // A#4
  KeyY: 493.883, // B4
  KeyH: 523.251, // C5
  KeyN: 554.365, // C#5
  Digit7: 587.33, // D5
  KeyU: 622.254, // D#5
  KeyJ: 659.255, // E5
  KeyM: 698.456, // F5
  Digit8: 739.989, // F#5
  KeyI: 783.991, // G5
  KeyK: 830.609, // G#5
  Comma: 880.0, // A5
  Digit9: 932.328, // A#5
  KeyO: 987.767, // B5
  KeyL: 1046.502, // C6
  Period: 1108.731, // C#6
  Digit0: 1174.659, // D6
  KeyP: 1244.508, // D#6
  Semicolon: 1318.51, // E6
  Slash: 1396.913, // F6
  Minus: 1479.978, // F#6
  BracketLeft: 1567.982, // G6
  Quote: 1661.219, // G#6
  ShiftRight: 1760.0, // A6
  Equal: 1864.655, // A#6
  BracketRight: 1975.533, // B6
  Enter: 2093.005, // C7
  Backspace: 2217.461, // C#7
  Backslash: 2349.318, // D7
};

function ToneProvider() {
  const [core, _] = useState<WebRenderer>(new WebRenderer());
  const [coreInitd, setCoreInitd] = useState<boolean>(false);
  const [keyPressMap, setKeyPressMap] = useState<KeyPressMapType>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [sliderValue, setSliderValue] = useState<number>(50);
  const [bits, setBits] = useState(16);
  const [attackSec, setAttackSec] = useState(1);
  const [decaySec, setDecaySec] = useState(2);
  const [sustainAmp, setSustainAmp] = useState(60);
  const [releaseSec, setReleaseSec] = useState(4);
  const [volume, setVolume] = useState(0.3);
  const [filterFreq, setFilterFreq] = useState(3000);

  const onVolumeChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(event.target.value) / 100);
  }, []);

  const onSliderChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setSliderValue(parseInt(event.target.value));
  }, []);

  const onAttackChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setAttackSec(parseInt(event.target.value));
  }, []);

  const onDecayChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDecaySec(parseInt(event.target.value));
  }, []);

  const onSustainChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setSustainAmp(parseInt(event.target.value));
    },
    []
  );

  const onReleaseChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setReleaseSec(parseInt(event.target.value));
    },
    []
  );

  const onFilterChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setFilterFreq(parseInt(event.target.value));
  }, []);

  const onBitCrushSelect = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      setBits(parseInt(event.target.value));
    },
    []
  );

  const playNote = useCallback(
    (event: KeyboardEvent) => {
      setKeyPressMap({ ...keyPressMap, [event.code]: true });
    },
    [keyPressMap]
  );

  const stopNote = useCallback(
    (event: KeyboardEvent) => {
      setKeyPressMap({ ...keyPressMap, [event.code]: false });
    },
    [keyPressMap]
  );

  useEffect(() => {
    if (coreInitd) {
      window.addEventListener("keydown", playNote);
      window.addEventListener("keyup", stopNote);
    }

    return () => {
      window.removeEventListener("keydown", playNote);
      window.removeEventListener("keyup", stopNote);
    };
  }, [coreInitd, playNote, stopNote]);

  useEffect(() => {
    async function initCore() {
      const ctx = new AudioContext();
      const node = await core.initialize(ctx, {
        numberOfInputs: 0,
        numberOfOutputs: 1,
        outputChannelCount: [2],
      });
      node.connect(ctx.destination);
    }

    core.on("load", function () {
      setCoreInitd(true);
      setLoading(false);
    });

    if (!coreInitd) {
      window.addEventListener("keydown", initCore);
    }

    return () => {
      window.removeEventListener("keydown", initCore);
    };
  }, [core, coreInitd]);

  useEffect(() => {
    const tones = Object.keys(keyPressMap)
      .filter((key) => keyToMidiMap[key] !== undefined)
      .map((key) => {
        let pressed = keyPressMap[key] === true;

        let gate = el.const({ key: `${key}:gate`, value: pressed ? 1 : 0 });
        let env = el.adsr(
          attackSec / 10,
          decaySec / 10,
          sustainAmp / 100,
          releaseSec / 10,
          gate
        );

        const frequency = keyToMidiMap[key];
        const sin = el.mul(
          el.cycle(frequency),
          el.const({ key: `${key}:sin`, value: 1 - sliderValue / 100 })
        );
        const saw = el.mul(
          el.blepsaw(frequency),
          el.const({ key: `${key}:saw`, value: sliderValue / 100 })
        );
        const combined = el.add(saw, sin);
        // Step size is 2^bits
        const step = Math.pow(2, bits);
        // Crunchy amplitude quantization: floor at each step, then divide back
        const crushed = el.div(el.floor(el.mul(combined, step)), step);
        const filtered = el.lowpass(filterFreq, 1, crushed);
        return el.mul(volume, env, filtered);
      });
    if (coreInitd) {
      const finaltone = el.add(...tones);
      core.render(finaltone, finaltone);
    }
  }, [
    coreInitd,
    keyPressMap,
    volume,
    sliderValue,
    attackSec,
    decaySec,
    sustainAmp,
    releaseSec,
    bits,
  ]);

  return (
    <>
      {loading ? (
        <p>Press a key to load the audio context..</p>
      ) : (
        <>
          <h2>Race that Wav</h2>
          <div className={styles.settings}>
            <p>Sine</p>
            <input type="range" onChange={onSliderChange} value={sliderValue} />
            <p>Saw</p>
          </div>
          <div className={styles.settings}>
            <input
              min="0"
              max="100"
              onChange={onVolumeChange}
              type="range"
              value={volume * 100}
            />
            <p>Volume {(volume * 100).toPrecision(3)}</p>
          </div>
          <div className={styles.settings}>
            <input
              min="0"
              max="100"
              onChange={onAttackChange}
              type="range"
              value={attackSec}
            />
            <p>Attack {attackSec / 10}s</p>
          </div>
          <div className={styles.settings}>
            <input
              min="0"
              max="100"
              onChange={onDecayChange}
              type="range"
              value={decaySec}
            />
            <p>Decay {decaySec / 10}s</p>
          </div>
          <div className={styles.settings}>
            <input
              min="0"
              max="100"
              onChange={onSustainChange}
              type="range"
              value={sustainAmp}
            />
            <p>Sustain {sustainAmp}%</p>
          </div>
          <div className={styles.settings}>
            <input
              min="0"
              max="100"
              onChange={onReleaseChange}
              type="range"
              value={releaseSec}
            />
            <p>Release {releaseSec / 10}s</p>
          </div>
          <div className={styles.settings}>
            <input
              min="30"
              max="10000"
              onChange={onFilterChange}
              type="range"
              value={filterFreq}
            />
            <p>Lowpass {filterFreq}Hz</p>
          </div>
          <div className={styles.settings}>
            <p>How many bits? </p>
            <select
              defaultValue={16}
              onChange={onBitCrushSelect}
              onKeyDown={(event) => event?.preventDefault()}
              style={{ height: "32px", marginLeft: "24px" }}
            >
              <option value={2}>2</option>
              <option value={4}>4</option>
              <option value={8}>8</option>
              <option value={16}>16</option>
              <option value={32}>32</option>
            </select>
          </div>
        </>
      )}
    </>
  );
}

export default ToneProvider;
