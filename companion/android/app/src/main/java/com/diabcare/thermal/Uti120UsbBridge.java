package com.diabcare.thermal;

import android.hardware.usb.UsbConstants;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbDeviceConnection;
import android.hardware.usb.UsbEndpoint;
import android.hardware.usb.UsbInterface;
import android.hardware.usb.UsbManager;

import java.util.Map;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicBoolean;

/**
 * Minimal Android USB transport for the UTi120M.
 *
 * This slice intentionally stops at validated raw Y16 frames. Calibration,
 * shutter capture, and radiometric upload are separate steps and must not be
 * represented as Celsius output until they are implemented and hardware-tested.
 */
final class Uti120UsbBridge {
    interface Listener {
        void onStatus(String message);
        void onFrame(Uti120Protocol.ThermalFrame frame);
        void onError(String message);
    }

    private final UsbManager usbManager;
    private final Listener listener;
    private final ExecutorService io = Executors.newSingleThreadExecutor();
    private final AtomicBoolean streaming = new AtomicBoolean(false);
    private UsbDeviceConnection connection;
    private UsbInterface frameInterface;
    private UsbInterface commandInterface;
    private UsbEndpoint frameIn;
    private UsbEndpoint commandIn;
    private UsbEndpoint commandOut;

    Uti120UsbBridge(UsbManager usbManager, Listener listener) {
        this.usbManager = usbManager;
        this.listener = listener;
    }

    UsbDevice findDevice() {
        for (Map.Entry<String, UsbDevice> entry : usbManager.getDeviceList().entrySet()) {
            UsbDevice device = entry.getValue();
            if (device.getVendorId() == Uti120Protocol.VENDOR_ID
                    && device.getProductId() == Uti120Protocol.PRODUCT_ID) {
                return device;
            }
        }
        return null;
    }

    boolean hasPermission(UsbDevice device) {
        return device != null && usbManager.hasPermission(device);
    }

    void open(UsbDevice device) {
        close();
        if (device == null) {
            listener.onError("UTi120M was not found. Connect it with a USB-C OTG data cable.");
            return;
        }
        if (!hasPermission(device)) {
            listener.onError("Android USB permission is required before connecting.");
            return;
        }

        connection = usbManager.openDevice(device);
        if (connection == null) {
            listener.onError("Android could not open the UTi120M USB device.");
            return;
        }
        if (device.getInterfaceCount() < 2) {
            listener.onError("Unexpected UTi120M interface layout.");
            close();
            return;
        }

        frameInterface = device.getInterface(0);
        commandInterface = device.getInterface(1);
        if (!connection.claimInterface(frameInterface, true)
                || !connection.claimInterface(commandInterface, true)) {
            listener.onError("Could not claim the UTi120M USB interfaces.");
            close();
            return;
        }

        for (int i = 0; i < frameInterface.getEndpointCount(); i++) {
            UsbEndpoint endpoint = frameInterface.getEndpoint(i);
            if (endpoint.getDirection() == UsbConstants.USB_DIR_IN) {
                frameIn = endpoint;
            }
        }
        for (int i = 0; i < commandInterface.getEndpointCount(); i++) {
            UsbEndpoint endpoint = commandInterface.getEndpoint(i);
            if (endpoint.getDirection() == UsbConstants.USB_DIR_IN) {
                commandIn = endpoint;
            } else if (endpoint.getDirection() == UsbConstants.USB_DIR_OUT) {
                commandOut = endpoint;
            }
        }

        if (frameIn == null || commandIn == null || commandOut == null) {
            listener.onError("Could not find the UTi120M frame and command endpoints.");
            close();
            return;
        }

        listener.onStatus("USB interfaces claimed. Starting raw frame stream...");
        startStreaming();
    }

    private void startStreaming() {
        streaming.set(true);
        io.execute(() -> {
            try {
                sendCommand(Uti120Protocol.writeRegister(
                        Uti120Protocol.REGISTER_RUN_STATUS,
                        Uti120Protocol.STATUS_IMAGE_UPLOAD), true);
                Thread.sleep(300L);
                listener.onStatus("Streaming raw 120x90 sensor frames. Calibration is not active yet.");
                while (streaming.get()) {
                    byte[] raw = requestFrame();
                    if (raw == null) {
                        continue;
                    }
                    try {
                        listener.onFrame(Uti120Protocol.parseFrame(raw));
                    } catch (IllegalArgumentException error) {
                        listener.onError(error.getMessage());
                    }
                }
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            } catch (Exception error) {
                if (streaming.get()) {
                    listener.onError("UTi120M stream stopped: " + error.getMessage());
                }
            }
        });
    }

    private byte[] requestFrame() {
        if (connection == null || commandOut == null || frameIn == null) {
            return null;
        }
        int sent = connection.bulkTransfer(commandOut, Uti120Protocol.requestFrameCommand(), 1, 50);
        if (sent < 1) {
            return null;
        }
        try {
            Thread.sleep(1L);
        } catch (InterruptedException error) {
            Thread.currentThread().interrupt();
            return null;
        }

        byte[] frame = new byte[Uti120Protocol.FRAME_SIZE];
        int total = 0;
        for (int iteration = 0; iteration < 8 && total < frame.length; iteration++) {
            int length = Math.min(4_096, frame.length - total);
            int received = connection.bulkTransfer(frameIn, frame, total, length, 13);
            if (received < 0) {
                if (total == 0) {
                    return null;
                }
                break;
            }
            if (received == 0) {
                break;
            }
            total += received;
        }
        return total == frame.length ? frame : null;
    }

    private void sendCommand(byte[] command, boolean readResponse) {
        if (connection == null || commandOut == null) {
            throw new IllegalStateException("UTi120M is not connected");
        }
        int sent = connection.bulkTransfer(commandOut, command, command.length, 500);
        if (sent != command.length) {
            throw new IllegalStateException("UTi120M command transfer failed");
        }
        if (readResponse && commandIn != null) {
            byte[] response = new byte[64];
            connection.bulkTransfer(commandIn, response, response.length, 500);
        }
    }

    void close() {
        streaming.set(false);
        if (connection != null) {
            try {
                if (commandOut != null) {
                    sendCommand(Uti120Protocol.writeRegister(
                            Uti120Protocol.REGISTER_RUN_STATUS,
                            Uti120Protocol.STATUS_IDLE), true);
                }
            } catch (Exception ignored) {
                // Teardown must remain best-effort after disconnects.
            }
            if (frameInterface != null) connection.releaseInterface(frameInterface);
            if (commandInterface != null) connection.releaseInterface(commandInterface);
            connection.close();
        }
        connection = null;
        frameInterface = null;
        commandInterface = null;
        frameIn = null;
        commandIn = null;
        commandOut = null;
    }

    void shutdown() {
        close();
        io.shutdownNow();
    }
}
