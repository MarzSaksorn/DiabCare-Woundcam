package com.diabcare.thermal;

import java.nio.ByteBuffer;
import java.nio.ByteOrder;

public final class Uti120ProtocolSmokeTest {
    public static void main(String[] args) {
        byte[] raw = new byte[Uti120Protocol.FRAME_SIZE];
        ByteBuffer buffer = ByteBuffer.wrap(raw).order(ByteOrder.LITTLE_ENDIAN);
        buffer.putShort(0, (short) 0xAA55);
        buffer.putShort(2, (short) 42);
        buffer.putShort(4, (short) 120);
        buffer.putShort(6, (short) 92);
        buffer.putShort(16, (short) 2510);
        buffer.putShort(18, (short) 2520);
        buffer.putShort(20, (short) 2490);
        buffer.putShort(22, (short) 3275);

        int pixelOffset = Uti120Protocol.PIXEL_SHORT_OFFSET * 2;
        for (int index = 0; index < Uti120Protocol.FRAME_PIXELS; index++) {
            int value = index == 0 ? 0xF234 : 5800 + (index % 10);
            raw[pixelOffset + index * 2] = (byte) value;
            raw[pixelOffset + index * 2 + 1] = (byte) (value >>> 8);
        }

        Uti120Protocol.ThermalFrame frame = Uti120Protocol.parseFrame(raw);
        require(frame.frameCounter == 42, "frame counter");
        require(frame.width == 120 && frame.height == 90, "dimensions");
        require(Math.abs(frame.fpaC - 32.75f) < 0.001f, "FPA temperature");
        require(frame.rawPixels[0] == 0xF234, "unsigned pixel parsing");
        require(frame.rawMin == 5800 && frame.rawMax == 0xF234, "raw range");
        System.out.println("UTi120ProtocolSmokeTest passed");
    }

    private static void require(boolean condition, String label) {
        if (!condition) throw new AssertionError("Failed: " + label);
    }
}
