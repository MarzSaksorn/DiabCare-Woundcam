# UNI-T UTi120M Integration Research

## Finding

The UNI-T UTi120M is not a normal webcam. It exposes a vendor-specific USB device with custom control and bulk-transfer interfaces. The open-source desktop project communicates with it through PyUSB/libusb, requests raw frames, downloads calibration data from the device, and reconstructs a calibrated temperature map in Python.

UNI-T does provide an official Android companion app called **Thermal Mobile**. The Google Play package is `com.unitrend.thermal_mobile_721`, and the official UTi120M page links to its Android APK and app listing. The app is intended to connect to UNI-T USB thermal devices, display thermal imagery, analyze temperatures, capture images, record video, and provide palettes and on-screen measurement tools. [5] [6]

The important limitation is that the official materials document the app as an end-user viewer, not as an SDK or integration service. The product page lists JPEG and MP4 as the storage formats. It does not document a local API, WebSocket, Android intent contract for live frames, radiometric matrix export, or a way for another app or a browser to subscribe to its stream. The open-source desktop project exists because the USB protocol and image-processing path had to be reverse-engineered rather than consumed through an official desktop API. [1] [4]

This makes integration possible, but the web application should not try to treat the device as `getUserMedia()` video. The browser camera API only handles cameras exposed through the operating system's media stack. The UTi120M instead requires a device bridge.

## How the reference project works

The reference project identifies the camera as USB VID `0x5656`, PID `0x1201`. It uses two USB interfaces:

- Interface 0, bulk IN endpoint `0x82`, receives one 25,600-byte frame.
- Interface 1, interrupt OUT endpoint `0x01`, receives commands.
- Interface 1, interrupt IN endpoint `0x81`, returns command responses.

The startup sequence is roughly:

1. Find and reset the USB device.
2. Claim both interfaces.
3. Read device information and calibration registers.
4. Download low- and high-temperature calibration packages from camera flash.
5. Enter image-upload mode by writing run status `2`.
6. Perform shutter/NUC calibration and capture a dark frame.
7. Send frame request byte `0x81`.
8. Read the next 25,600-byte frame from the bulk endpoint.
9. Repeat, while refreshing shutter calibration and switching temperature ranges when needed.

Each frame contains 12,800 little-endian 16-bit values:

- Bytes `0..719`: header and sensor parameters.
- Bytes `720..22319`: 10,800 raw Y16 pixels, arranged as 90 rows by 120 columns.
- Bytes `22320..25599`: padding.

The header includes a magic value, frame counter, dimensions, shutter temperatures, lens temperature, focal-plane-array temperature, shutter status, and NUC status. Raw pixels are sensor counts, not Celsius values.

The reference processing pipeline is:

1. Subtract a shutter-captured dark frame.
2. Apply factory per-pixel gain correction and bad-pixel replacement.
3. Apply temporal noise filtering and stripe correction where available.
4. Correct lens drift and shutter-temperature bias.
5. Convert Y16 values using calibration curves downloaded from the device.
6. Apply emissivity correction.
7. Produce a 120x90 float temperature map in Celsius.

The reference project also exports a display PNG and a radiometric float32 TIFF whose pixel values are directly Celsius values. Its metadata records emissivity, ambient temperature, distance, FPA/shutter/lens temperatures, active range, frame counter, and timestamp.

## What this means for DiabCare Woundcam

The current diagnostic page is built around an RGB image workflow:

- Browser camera or image upload produces JPEG data.
- `wound.infer` accepts base64 image data.
- The YOLO service returns detections and bounding boxes.
- The image can be assigned to a registered patient and stored as wound media.

A thermal capture needs a second data path. It should preserve both:

- A false-color preview image for clinician review.
- The original calibrated temperature matrix and capture metadata for analysis and audit.

The existing RGB endpoint should not silently accept thermal PNGs and pretend they have the same meaning. The app should label thermal results as **Decision Support** and show calibration limitations beside them.

## Recommended architecture

### Phase 1: local desktop thermal bridge

Run a small Python service on the computer that has the UTi120M physically connected. Reuse the reference project's USB and calibration logic, but separate the GUI from the acquisition layer.

The bridge should expose a narrow local API:

- `GET /health` — bridge version, device connection, serial, calibration status.
- `POST /session/start` — claim the camera and start acquisition.
- `POST /session/stop` — stop acquisition and release USB interfaces.
- `GET /stream` or a WebSocket — preview frames and current sensor status.
- `POST /capture` — return one capture identifier.
- `GET /capture/:id` — return false-color PNG, temperature matrix, and metadata.
- `POST /calibration/shutter` — request a controlled shutter/NUC refresh.

Use WebSocket for the live preview. Send a low-rate preview rather than 25 raw frames per second. For example, send 5 to 10 false-color JPEG frames per second and keep the complete radiometric frame only for an explicit capture.

The bridge should bind to `127.0.0.1`, not `0.0.0.0`. Protect it with a per-install random token, validate the browser `Origin`, and require a user gesture for starting a session. Do not expose the USB control API to the LAN.

## Can DiabCare reuse the official app?

There are three levels of reuse:

1. **Manual image handoff:** The nurse captures an image in Thermal Mobile, uses Android Share or an export action, and chooses DiabCare. This is the easiest path, but it produces an ordinary image workflow. It may not include the original 120x90 temperature matrix or complete calibration metadata.
2. **File-import workflow:** DiabCare can accept an image exported by Thermal Mobile and store it as a thermal capture only when the file format and metadata are verified. A JPEG with a color palette should not be treated as radiometric data automatically.
3. **Direct live bridge:** This would require an official SDK/API, an exposed Android intent/service, or a supported shared-data contract. I found no such public contract in UNI-T's official materials. The safer route is a separate DiabCare companion app that communicates with the camera directly, using the reverse-engineered protocol, rather than trying to control or scrape Thermal Mobile.

The official app can still be useful during development as a reference and as a fallback capture tool. It should not be treated as the source of live data for clinical records unless UNI-T provides an integration interface or we validate exactly what its exported files contain.

### Phase 2: thermal capture endpoint in the app

Add a dedicated tRPC procedure rather than changing `wound.infer`:

```ts
thermal.capture.create({
  patientId,
  woundAssessmentId,
  capturedAt,
  previewImage,
  temperatureMap,
  width: 120,
  height: 90,
  unit: "C",
  emissivity,
  ambientTemperatureC,
  distanceM,
  fpaTemperatureC,
  shutterTemperatureC,
  lensTemperatureC,
  frameCounter,
  deviceSerial,
  calibrationVersion,
  bridgeVersion,
})
```

The server should validate that the matrix is exactly 120x90, reject missing units or calibration metadata, and enforce the same patient authorization rules as wound photos. Store image bytes in object storage. Store the temperature matrix as compressed binary or a structured object in protected storage, not as a large SQL text field. Store searchable metadata and derived statistics in Supabase.

Useful derived fields include:

- minimum, maximum, mean, and median temperature;
- ROI minimum, maximum, mean, and median;
- temperature delta between wound ROI and nearby reference skin ROI;
- emissivity and ambient temperature;
- device serial and calibration package version;
- capture timestamp and clinician ID.

### Phase 3: thermal review UI

Extend the diagnostic page with a thermal mode rather than replacing the existing RGB mode:

- Connection status: disconnected, connecting, streaming, calibration required, or error.
- False-color live preview.
- Temperature readout for cursor or touch position.
- ROI rectangle over the wound and reference skin area.
- Minimum, maximum, average, and delta temperature for each ROI.
- Explicit shutter-calibration state when the camera freezes briefly.
- Capture button that saves the radiometric record.
- Patient and wound-assessment confirmation before upload.
- A visible **Decision Support — not a diagnosis** label.

On the patient record, show the preview image and a thermal-data indicator. Allow the clinician to download the original radiometric artifact for later review.

## Alternative architectures

### Browser WebUSB proof of concept

A Chromium desktop browser can potentially communicate directly with the device through WebUSB. The API requires HTTPS or localhost and a user permission prompt. It is not a dependable cross-browser production solution because WebUSB has limited browser availability and is not supported consistently across the browsers and mobile platforms used by clinicians. [3]

Direct WebUSB would also require moving the following native responsibilities into TypeScript or WebAssembly:

- USB endpoint setup and frame reads.
- Shutter and NUC control.
- Calibration package download and parsing.
- Per-pixel correction.
- Temperature curve interpolation.
- Reconnect and timeout handling.

On Windows, the reference project requires replacing the camera driver with WinUSB through Zadig. That may conflict with the official Android/Windows support path and creates a deployment burden. The reference project itself marks the Windows path as not tested. [1]

Use WebUSB only as a technical experiment, not as the primary clinical workflow.

### Native Android companion

If the camera must remain connected to a phone, a native Android companion is the better path. The phone app can own USB access, reuse the protocol implementation, perform calibration and temperature conversion, and send only the captured radiometric record to the local hospital server. The official product page describes the UTi120M as an Android USB-C module. [2]

The Android app could either:

- provide the entire capture UI and then hand the saved capture to DiabCare; or
- expose a local app-to-web handoff using an app link, QR code, or local authenticated endpoint.

This is the only architecture that directly matches the camera's intended mobile use without requiring a desktop in the examination room.

## Important model limitation

The existing YOLO wound detector must not be assumed to work on thermal imagery. If `best.pt` was trained on ordinary wound photographs, feeding it a false-color thermal PNG changes the input domain and may produce unreliable detections.

A safe rollout should begin with temperature visualization and clinician-defined ROIs. If automated thermal detection is needed later, collect paired RGB/thermal examples, label them for the intended task, validate sensitivity and false-positive behavior, and keep the output under the app's Decision Support label.

## Proposed implementation order

1. Build a standalone Python bridge with no patient data and validate live frames, calibration, reconnect, and radiometric export.
2. Add a local bridge health check and connection state to DiagnosticCamera.
3. Add a thermal capture contract and protected storage tables.
4. Add thermal preview and ROI statistics without automated diagnosis.
5. Add patient assignment and audit events.
6. Validate with real hardware across warm-up, shutter refresh, disconnect/reconnect, and low/high temperature range transitions.
7. Only then evaluate thermal-specific ML using a separately validated dataset.

## Decision

Integration is feasible. The recommended production design is a **local Python USB bridge for desktop capture** or a **native Android companion for mobile capture**, feeding a dedicated radiometric thermal-capture API. Direct browser USB access is possible only as a Chromium proof of concept and should not be the foundation of a hospital workflow.

## References

[1]: https://github.com/diegosainz/uni-t-thermal-uti120 "UNI-T UTi120 USB-C Thermal Camera Multi-Platform Desktop Application"
[2]: https://thermal.uni-trend.com/product/uti120m/ "UNI-T UTi120M product specifications"
[3]: https://developer.mozilla.org/en-US/docs/Web/API/WebUSB_API "MDN WebUSB API reference"
[4]: https://www.eevblog.com/forum/thermal-imaging/uni-t-uti120m-python-desktop-application/ "EEVBlog discussion of the UTi120M desktop application"
[5]: https://play.google.com/store/apps/details?id=com.unitrend.thermal_mobile_721&hl=en-US "UNI-T Thermal Mobile on Google Play"
[6]: https://thermal.uni-trend.com/product/uti120m/ "UNI-T UTi120M official product page and Android app links"
