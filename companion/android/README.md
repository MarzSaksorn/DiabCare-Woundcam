# DiabCare Thermal Companion

Android-focused companion app for the UNI-T UTi120M.

## Current slice

This native Android project implements the first hardware layer:

- USB host feature declaration.
- UTi120M device filter for VID `0x5656` / PID `0x1201`.
- Android USB permission request.
- Interface and endpoint discovery.
- Run-status command to enter image-upload mode.
- `0x81` frame request.
- 25,600-byte frame collection.
- Raw 120x90 Y16 frame parsing.
- Basic connection and frame-status screen.

It intentionally does **not** claim that raw sensor counts are Celsius. Shutter/NUC capture, factory calibration package parsing, temperature conversion, radiometric storage, patient assignment, and DiabCare upload come later.

## Build

From this directory, use Android Studio or an environment with the Android SDK and Gradle:

```bash
./gradlew :app:assembleDebug
```

Install the debug APK on an Android phone or tablet with USB host/OTG support, then connect the UTi120M using a USB-C data/OTG adapter.

The source build has been verified in the sandbox. The generated APK is at `app/build/outputs/apk/debug/app-debug.apk`.

The APK has not been tested with a physical UTi120M in this environment. Hardware validation still needs an Android device with USB host/OTG support, a data-capable cable, and the camera.

## Safety boundary

The status screen labels the output as raw sensor data. Do not use this build for clinical measurement. It is a transport validation slice only.
