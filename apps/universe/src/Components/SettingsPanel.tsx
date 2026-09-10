import React, { useEffect, useState } from "react";

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsChange?: (settings: Partial<UserSettings>) => void;
}

interface UserSettings {
  timeDilation: boolean;
  physicsRigor: "hard" | "speculative";
  uiMode: "telemetry" | "immersion";
  renderScale: "ly" | "au" | "meters";
  graphicsPreset: "low" | "medium" | "high" | "ultra";
  fovDeg: number;
  showFps: boolean;
  showCoordinates: boolean;
  enablePostProcessing: boolean;
  maxEntities: number;
  proceduralDensity: number;
  autoLod: boolean;
  soundEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
}

const DEFAULT_SETTINGS: UserSettings = {
  timeDilation: true,
  physicsRigor: "hard",
  uiMode: "telemetry",
  renderScale: "au",
  graphicsPreset: "high",
  fovDeg: 70,
  showFps: true,
  showCoordinates: true,
  enablePostProcessing: true,
  maxEntities: 10000,
  proceduralDensity: 1.0,
  autoLod: true,
  soundEnabled: true,
  musicVolume: 0.5,
  sfxVolume: 0.7,
};

function SettingsPanel({
  isOpen,
  onClose,
  onSettingsChange,
}: SettingsPanelProps): React.ReactElement | null {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  const handleChange = (
    key: keyof UserSettings,
    value: boolean | number | string
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    onSettingsChange?.({ [key]: value });
  };

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="settings-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-header">
          <h2 id="settings-title">Universe Settings</h2>
          <button
            className="settings-close"
            onClick={onClose}
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <div className="settings-tabs">
          <button
            className="settings-tab active"
            data-tab="simulation"
          >
            Simulation
          </button>
          <button
            className="settings-tab"
            data-tab="graphics"
          >
            Graphics
          </button>
          <button
            className="settings-tab"
            data-tab="audio"
          >
            Audio
          </button>
          <button
            className="settings-tab"
            data-tab="controls"
          >
            Controls
          </button>
        </div>

        <div className="settings-content">
          <div className="settings-pane active" data-pane="simulation">
            <section className="settings-section">
              <h3>Physics & Time</h3>
              <div className="setting-row">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.timeDilation}
                    onChange={(e) => handleChange("timeDilation", e.target.checked)}
                  />
                  <span>Time Dilation (Relativistic Effects)</span>
                </label>
                <span className="setting-hint">
                  Simulates relativistic time dilation at high velocities
                </span>
              </div>
              <div className="setting-row">
                <label>
                  <span>Physics Rigor</span>
                  <select
                    value={settings.physicsRigor}
                    onChange={(e) => handleChange("physicsRigor", e.target.value as "hard" | "speculative")}
                  >
                    <option value="hard">Hard Sci-Fi (Real Physics)</option>
                    <option value="speculative">Speculative Xenobiology</option>
                  </select>
                </label>
              </div>
            </section>

            <section className="settings-section">
              <h3>Procedural Generation</h3>
              <div className="setting-row">
                <label>
                  <span>Procedural Density</span>
                  <input
                    type="range"
                    min="0.1"
                    max="3.0"
                    step="0.1"
                    value={settings.proceduralDensity}
                    onChange={(e) => handleChange("proceduralDensity", parseFloat(e.target.value))}
                  />
                  <span className="setting-value">{settings.proceduralDensity.toFixed(1)}x</span>
                </label>
                <span className="setting-hint">
                  Controls density of procedural galaxies, stars, and planets
                </span>
              </div>
              <div className="setting-row">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.autoLod}
                    onChange={(e) => handleChange("autoLod", e.target.checked)}
                  />
                  <span>Auto Level-of-Detail</span>
                </label>
                <span className="setting-hint">
                  Automatically reduces detail for distant objects
                </span>
              </div>
              <div className="setting-row">
                <label>
                  <span>Max Entities</span>
                  <input
                    type="number"
                    min="1000"
                    max="100000"
                    step="1000"
                    value={settings.maxEntities}
                    onChange={(e) => handleChange("maxEntities", parseInt(e.target.value, 10))}
                  />
                </label>
              </div>
            </section>

            <section className="settings-section">
              <h3>Units & Scale</h3>
              <div className="setting-row">
                <label>
                  <span>Render Scale</span>
                  <select
                    value={settings.renderScale}
                    onChange={(e) => handleChange("renderScale", e.target.value as "ly" | "au" | "meters")}
                  >
                    <option value="ly">Light Years</option>
                    <option value="au">Astronomical Units (AU)</option>
                    <option value="meters">Meters (SI)</option>
                  </select>
                </label>
              </div>
              <div className="setting-row">
                <label>
                  <span>UI Mode</span>
                  <select
                    value={settings.uiMode}
                    onChange={(e) => handleChange("uiMode", e.target.value as "telemetry" | "immersion")}
                  >
                    <option value="telemetry">Data-Dense Telemetry</option>
                    <option value="immersion">Immersion Narrative</option>
                  </select>
                </label>
              </div>
            </section>
          </div>

          <div className="settings-pane" data-pane="graphics">
            <section className="settings-section">
              <h3>Visual Quality</h3>
              <div className="setting-row">
                <label>
                  <span>Graphics Preset</span>
                  <select
                    value={settings.graphicsPreset}
                    onChange={(e) => handleChange("graphicsPreset", e.target.value as "low" | "medium" | "high" | "ultra")}
                  >
                    <option value="low">Low (Performance)</option>
                    <option value="medium">Medium</option>
                    <option value="high">High (Recommended)</option>
                    <option value="ultra">Ultra (Maximum Quality)</option>
                  </select>
                </label>
              </div>
              <div className="setting-row">
                <label>
                  <span>Field of View</span>
                  <input
                    type="range"
                    min="40"
                    max="120"
                    step="1"
                    value={settings.fovDeg}
                    onChange={(e) => handleChange("fovDeg", parseInt(e.target.value, 10))}
                  />
                  <span className="setting-value">{settings.fovDeg}°</span>
                </label>
              </div>
              <div className="setting-row">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.enablePostProcessing}
                    onChange={(e) => handleChange("enablePostProcessing", e.target.checked)}
                  />
                  <span>Post Processing (Bloom, Tone Mapping, SSAO)</span>
                </label>
              </div>
            </section>

            <section className="settings-section">
              <h3>HUD Display</h3>
              <div className="setting-row">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.showFps}
                    onChange={(e) => handleChange("showFps", e.target.checked)}
                  />
                  <span>Show FPS Counter</span>
                </label>
              </div>
              <div className="setting-row">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.showCoordinates}
                    onChange={(e) => handleChange("showCoordinates", e.target.checked)}
                  />
                  <span>Show Coordinates</span>
                </label>
              </div>
            </section>
          </div>

          <div className="settings-pane" data-pane="audio">
            <section className="settings-section">
              <h3>Audio Settings</h3>
              <div className="setting-row">
                <label>
                  <input
                    type="checkbox"
                    checked={settings.soundEnabled}
                    onChange={(e) => handleChange("soundEnabled", e.target.checked)}
                  />
                  <span>Enable Sound</span>
                </label>
              </div>
              <div className="setting-row">
                <label>
                  <span>Music Volume</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.musicVolume}
                    onChange={(e) => handleChange("musicVolume", parseFloat(e.target.value))}
                  />
                  <span className="setting-value">{Math.round(settings.musicVolume * 100)}%</span>
                </label>
              </div>
              <div className="setting-row">
                <label>
                  <span>SFX Volume</span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={settings.sfxVolume}
                    onChange={(e) => handleChange("sfxVolume", parseFloat(e.target.value))}
                  />
                  <span className="setting-value">{Math.round(settings.sfxVolume * 100)}%</span>
                </label>
              </div>
            </section>
          </div>

          <div className="settings-pane" data-pane="controls">
            <section className="settings-section">
              <h3>Key Bindings</h3>
              <div className="keybindings">
                <div className="keybinding-row">
                  <kbd>W</kbd> <span>Forward</span>
                </div>
                <div className="keybinding-row">
                  <kbd>S</kbd> <span>Backward</span>
                </div>
                <div className="keybinding-row">
                  <kbd>A</kbd> <span>Left</span>
                </div>
                <div className="keybinding-row">
                  <kbd>D</kbd> <span>Right</span>
                </div>
                <div className="keybinding-row">
                  <kbd>Space</kbd> <span>Up</span>
                </div>
                <div className="keybinding-row">
                  <kbd>Shift</kbd> <span>Down</span>
                </div>
                <div className="keybinding-row">
                  <kbd>Mouse Drag</kbd> <span>Orbit Camera</span>
                </div>
                <div className="keybinding-row">
                  <kbd>Scroll</kbd> <span>Zoom / Dolly</span>
                </div>
                <div className="keybinding-row">
                  <kbd>C</kbd> <span>Cinematic Fly-To</span>
                </div>
                <div className="keybinding-row">
                  <kbd>F</kbd> <span>Focus Selected</span>
                </div>
                <div className="keybinding-row">
                  <kbd>H</kbd> <span>Home (Return to Earth)</span>
                </div>
                <div className="keybinding-row">
                  <kbd>Tab</kbd> <span>Toggle Mode (Explore/Science)</span>
                </div>
                <div className="keybinding-row">
                  <kbd>Esc</kbd> <span>Close Panels / Deselect</span>
                </div>
              </div>
            </section>

            <section className="settings-section">
              <h3>Camera Modes</h3>
              <div className="setting-row">
                <label>
                  <span>Default Camera Mode</span>
                  <select
                    value="orbit"
                    onChange={() => {}}
                    disabled
                  >
                    <option value="orbit">Orbit (Default)</option>
                    <option value="free">Free Flight</option>
                    <option value="chase">Chase</option>
                    <option value="surface">Surface Lock</option>
                    <option value="cinematic">Cinematic</option>
                  </select>
                </label>
                <span className="setting-hint">
                  Camera modes are switched via HUD buttons
                </span>
              </div>
            </section>
          </div>
        </div>

        <div className="settings-footer">
          <button className="settings-btn secondary" onClick={onClose}>
            Cancel
          </button>
          <button
            className="settings-btn primary"
            onClick={() => {
              onSettingsChange?.(settings);
              onClose();
            }}
          >
            Apply & Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;