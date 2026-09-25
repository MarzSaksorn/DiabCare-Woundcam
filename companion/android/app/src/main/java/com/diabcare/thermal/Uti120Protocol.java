package com.diabcare.thermal;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;

/** Wire constants and raw-frame parsing for the UNI-T UTi120M. */
final class Uti120Protocol {
    static final int VENDOR_ID = 0x5656;
    static final int PRODUCT_ID = 0x1201;
    static final int FRAME_SIZE = 25_600;
    static final int FRAME_WIDTH = 120;
    static final int FRAME_HEIGHT = 90;
    static final int FRAME_PIXELS = FRAME_WIDTH * FRAME_HEIGHT;
    static final int PIXEL_SHORT_OFFSET = 360;
    static final int REQUEST_FRAME = 0x81;
    static final int FUNCTION_WRITE_REGISTER = 0x04;
    static final int REGISTER_RUN_STATUS = 0xF0;
    static final int STATUS_IDLE = 0;
    static final int STATUS_IMAGE_UPLOAD = 2;

    private Uti120Protocol() {}

    static byte[] requestFrameCommand() {
        return new byte[]{(byte) REQUEST_FRAME};
    }

    static byte[] writeRegister(int offset, int value) {
        byte[] command = new byte[7];
        command[0] = (byte) FUNCTION_WRITE_REGISTER;
        command[1] = (byte) offset;
        command[2] = 0x01;
        ByteBuffer.wrap(command, 3, 4).order(ByteOrder.BIG_ENDIAN).putInt(value);
        return command;
    }

    static ThermalFrame parseFrame(byte[] raw) {
        if (raw == null || raw.length < FRAME_SIZE) {
            throw new IllegalArgumentException("Incomplete UTi120M frame");
        }

        ByteBuffer shorts = ByteBuffer.wrap(raw).order(ByteOrder.LITTLE_ENDIAN);
        int magic = unsignedShort(shorts, 0);
        int counter = unsignedShort(shorts, 1);
        int width = unsignedShort(shorts, 2);
        int height = unsignedShort(shorts, 3);
        if (magic != 0xAA55) {
            throw new IllegalArgumentException("Invalid UTi120M frame magic: 0x" + Integer.toHexString(magic));
        }
        if (width != FRAME_WIDTH || height < FRAME_HEIGHT) {
            throw new IllegalArgumentException("Unexpected UTi120M dimensions: " + width + "x" + height);
        }

        float shutterStart = unsignedShort(shorts, 8) / 100.0f;
        float shutter = unsignedShort(shorts, 9) / 100.0f;
        float lens = unsignedShort(shorts, 10) / 100.0f;
        float fpa = unsignedShort(shorts, 11) / 100.0f;
        int[] pixels = new int[FRAME_PIXELS];
        int min = Integer.MAX_VALUE;
        int max = Integer.MIN_VALUE;
        int pixelOffset = PIXEL_SHORT_OFFSET * 2;
        for (int i = 0; i < FRAME_PIXELS; i++) {
            int value = (raw[pixelOffset + i * 2] & 0xFF)
                    | ((raw[pixelOffset + i * 2 + 1] & 0xFF) << 8);
            pixels[i] = value;
            min = Math.min(min, value);
            max = Math.max(max, value);
        }

        return new ThermalFrame(counter, width, FRAME_HEIGHT, shutterStart, shutter, lens, fpa, pixels, min, max);
    }

    private static int unsignedShort(ByteBuffer buffer, int shortIndex) {
        return buffer.getShort(shortIndex * 2) & 0xFFFF;
    }

    static final class ThermalFrame {
        final int frameCounter;
        final int width;
        final int height;
        final float shutterStartC;
        final float shutterC;
        final float lensC;
        final float fpaC;
        final int[] rawPixels;
        final int rawMin;
        final int rawMax;

        ThermalFrame(int frameCounter, int width, int height, float shutterStartC, float shutterC,
                     float lensC, float fpaC, int[] rawPixels, int rawMin, int rawMax) {
            this.frameCounter = frameCounter;
            this.width = width;
            this.height = height;
            this.shutterStartC = shutterStartC;
            this.shutterC = shutterC;
            this.lensC = lensC;
            this.fpaC = fpaC;
            this.rawPixels = rawPixels;
            this.rawMin = rawMin;
            this.rawMax = rawMax;
        }
    }
}
