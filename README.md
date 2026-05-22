# AxisCalibrator

AxisCalibrator is a static web app for testing controller stick drift and estimating joystick deadzones using the browser Gamepad API. It's intended to be hosted on GitHub Pages.

Features
- Visual, DPR-aware canvases for left and right sticks
- Automatic baseline centering (Re-center available)
- Visual deadzone ring and crosshair for quick inspection
- "Measure resting drift" and "Auto-calibrate" tools

Quick usage
1. Open the published site in a modern browser (Chrome or Edge recommended).
2. Connect your controller and press any button to make the browser recognize it.
3. Wait briefly for automatic calibration — the white dot should be centered.
4. If the dot drifts while untouched, the stick shows drift.
5. Use the controls to auto-calibrate or measure resting drift.

Deploy to GitHub Pages
1. Create a GitHub repository named `AxisCalibrator.github.io` under the GitHub account that will publish the site (user pages). This repository name will publish to `https://<username>.github.io/`.
2. Push the site files to the repository root.

Example Git commands (run in the `axiscalibrator` folder):

```bash
# if you haven't set your Git identity yet (do this once):
git config --global user.email "you@example.com"
git config --global user.name "Your Name"

git init
git add .
git commit -m "Add AxisCalibrator site"
git branch -M main
git remote add origin https://github.com/AxisCalibrator/AxisCalibrator.github.io.git
git push -u origin main
```

Notes
- GitHub Pages serves over HTTPS, which the Gamepad API requires in some browsers.
- Favicons are cached by browsers; if the tab icon doesn't update immediately, try an Incognito window or clear your cache.

Support / contributions
If you'd like visual changes or additional features, open an issue or submit a pull request on the repository.

License
Add a `LICENSE` file if you want to apply an open-source license (MIT recommended).

