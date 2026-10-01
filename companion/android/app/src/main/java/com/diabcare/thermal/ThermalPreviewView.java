package com.diabcare.thermal;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Rect;
import android.graphics.Shader;
import android.graphics.LinearGradient;
import android.util.AttributeSet;
import android.view.View;

/**
 * Local preview for the raw UTi120M sensor stream.
 *
 * The frame is normalized by its raw-count range for visibility only. It is
 * deliberately not a Celsius display until device calibration is implemented.
 */
final class ThermalPreviewView extends View {
    private static final int PREVIEW_WIDTH = Uti120Protocol.FRAME_WIDTH;
    private static final int PREVIEW_HEIGHT = Uti120Protocol.FRAME_HEIGHT;

    private final Paint imagePaint = new Paint(Paint.FILTER_BITMAP_FLAG | Paint.DITHER_FLAG);
    private final Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint borderPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Paint legendPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Bitmap previewBitmap = Bitmap.createBitmap(
            PREVIEW_WIDTH, PREVIEW_HEIGHT, Bitmap.Config.ARGB_8888);
    private final Rect sourceRect = new Rect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
    private final Rect destinationRect = new Rect();
    private final RectFHolder imageBounds = new RectFHolder();
    private final int[] argbPixels = new int[Uti120Protocol.FRAME_PIXELS];

    private ThermalFrameSnapshot snapshot;
    private long renderedFrames;

    ThermalPreviewView(Context context) {
        super(context);
        configure();
    }

    ThermalPreviewView(Context context, AttributeSet attrs) {
        super(context, attrs);
        configure();
    }

    private void configure() {
        setBackgroundColor(Color.rgb(18, 31, 35));
        textPaint.setTypeface(android.graphics.Typeface.create(
                android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD));
        textPaint.setTextSize(dp(12));
        borderPaint.setStyle(Paint.Style.STROKE);
        borderPaint.setStrokeWidth(dp(1));
        legendPaint.setStyle(Paint.Style.FILL);
        setContentDescription("Live uncalibrated raw thermal preview");
    }

    void setFrame(Uti120Protocol.ThermalFrame frame) {
        if (frame == null || frame.rawPixels.length != argbPixels.length) return;
        int span = Math.max(1, frame.rawMax - frame.rawMin);
        for (int index = 0; index < frame.rawPixels.length; index++) {
            int normalized = ((frame.rawPixels[index] - frame.rawMin) * 255) / span;
            argbPixels[index] = rawToColor(clamp(normalized, 0, 255));
        }
        previewBitmap.setPixels(argbPixels, 0, PREVIEW_WIDTH, 0, 0,
                PREVIEW_WIDTH, PREVIEW_HEIGHT);
        snapshot = new ThermalFrameSnapshot(frame.rawMin, frame.rawMax, frame.frameCounter);
        renderedFrames++;
        postInvalidateOnAnimation();
    }

    void clearFrame() {
        snapshot = null;
        renderedFrames = 0;
        previewBitmap.eraseColor(Color.rgb(18, 31, 35));
        postInvalidateOnAnimation();
    }

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        int width = getWidth();
        int height = getHeight();
        if (width <= 0 || height <= 0) return;

        float legendHeight = dp(26);
        float availableHeight = Math.max(1, height - legendHeight);
        float scale = Math.min(width / (float) PREVIEW_WIDTH,
                availableHeight / PREVIEW_HEIGHT);
        int drawWidth = Math.max(1, Math.round(PREVIEW_WIDTH * scale));
        int drawHeight = Math.max(1, Math.round(PREVIEW_HEIGHT * scale));
        int left = (width - drawWidth) / 2;
        int top = Math.max(0, Math.round((availableHeight - drawHeight) / 2));
        destinationRect.set(left, top, left + drawWidth, top + drawHeight);
        imageBounds.set(left, top, left + drawWidth, top + drawHeight);

        if (snapshot == null) {
            textPaint.setTextAlign(Paint.Align.CENTER);
            textPaint.setTypeface(android.graphics.Typeface.create(
                    android.graphics.Typeface.DEFAULT, android.graphics.Typeface.NORMAL));
            canvas.drawText("Connect UTi120M to start preview", width / 2f,
                    availableHeight / 2f, textPaint);
            textPaint.setTypeface(android.graphics.Typeface.create(
                    android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD));
        } else {
            canvas.drawBitmap(previewBitmap, sourceRect, destinationRect, imagePaint);
            borderPaint.setColor(Color.argb(210, 255, 255, 255));
            canvas.drawRect(imageBounds.left, imageBounds.top,
                    imageBounds.right, imageBounds.bottom, borderPaint);

            textPaint.setTextAlign(Paint.Align.LEFT);
            textPaint.setColor(Color.WHITE);
            canvas.drawText("RAW PREVIEW · NOT °C", imageBounds.left + dp(8),
                    imageBounds.top + dp(18), textPaint);
        }

        drawLegend(canvas, width, height, legendHeight);
    }

    private void drawLegend(Canvas canvas, int width, int height, float legendHeight) {
        float horizontalPadding = dp(12);
        float barTop = height - dp(17);
        float barBottom = height - dp(7);
        LinearGradient gradient = new LinearGradient(
                horizontalPadding, barTop, width - horizontalPadding, barTop,
                new int[]{rawToColor(0), rawToColor(64), rawToColor(128),
                        rawToColor(192), rawToColor(255)},
                null, Shader.TileMode.CLAMP);
        legendPaint.setShader(gradient);
        canvas.drawRoundRect(horizontalPadding, barTop,
                width - horizontalPadding, barBottom, dp(4), dp(4), legendPaint);
        legendPaint.setShader(null);
        textPaint.setTextSize(dp(10));
        textPaint.setTypeface(android.graphics.Typeface.create(
                android.graphics.Typeface.DEFAULT, android.graphics.Typeface.NORMAL));
        textPaint.setColor(Color.argb(215, 255, 255, 255));
        textPaint.setTextAlign(Paint.Align.LEFT);
        canvas.drawText("LOW RAW", horizontalPadding, height - dp(19), textPaint);
        textPaint.setTextAlign(Paint.Align.RIGHT);
        canvas.drawText("HIGH RAW", width - horizontalPadding, height - dp(19), textPaint);
        textPaint.setTypeface(android.graphics.Typeface.create(
                android.graphics.Typeface.DEFAULT, android.graphics.Typeface.BOLD));
        textPaint.setTextSize(dp(12));
    }

    /** Ironbow-like palette used only to make raw-count changes visible. */
    static int rawToColor(int value) {
        float normalized = clamp(value, 0, 255) / 255f;
        float red = clamp(1.7f * normalized, 0f, 1f);
        float green = clamp(1.7f * normalized - 0.55f, 0f, 1f);
        float blue = clamp(1.5f * normalized - 1.05f, 0f, 1f);
        return Color.rgb(Math.round(red * 255), Math.round(green * 255), Math.round(blue * 255));
    }

    private static int clamp(int value, int low, int high) {
        return Math.max(low, Math.min(high, value));
    }

    private static float clamp(float value, float low, float high) {
        return Math.max(low, Math.min(high, value));
    }

    private float dp(int value) {
        return value * getResources().getDisplayMetrics().density;
    }

    private static final class ThermalFrameSnapshot {
        final int rawMin;
        final int rawMax;
        final int frameCounter;

        ThermalFrameSnapshot(int rawMin, int rawMax, int frameCounter) {
            this.rawMin = rawMin;
            this.rawMax = rawMax;
            this.frameCounter = frameCounter;
        }
    }

    private static final class RectFHolder {
        float left;
        float top;
        float right;
        float bottom;

        void set(float left, float top, float right, float bottom) {
            this.left = left;
            this.top = top;
            this.right = right;
            this.bottom = bottom;
        }
    }
}
