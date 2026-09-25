package com.diabcare.thermal;

import android.app.Activity;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.hardware.usb.UsbDevice;
import android.hardware.usb.UsbManager;
import android.os.Bundle;
import android.os.Build;
import android.view.Gravity;
import android.view.View;
import android.widget.Button;
import android.widget.LinearLayout;
import android.widget.TextView;

import java.util.Locale;

public final class MainActivity extends Activity implements Uti120UsbBridge.Listener {
    private static final String USB_PERMISSION_ACTION = "com.diabcare.thermal.USB_PERMISSION";

    private UsbManager usbManager;
    private Uti120UsbBridge bridge;
    private TextView connectionText;
    private TextView statusText;
    private TextView frameText;
    private TextView rawRangeText;
    private UsbDevice pendingDevice;

    private final BroadcastReceiver usbReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            if (!USB_PERMISSION_ACTION.equals(intent.getAction())) return;
            UsbDevice device = intent.getParcelableExtra(UsbManager.EXTRA_DEVICE);
            boolean granted = intent.getBooleanExtra(UsbManager.EXTRA_PERMISSION_GRANTED, false);
            if (granted && device != null) {
                bridge.open(device);
            } else {
                onError("USB permission was not granted.");
            }
        }
    };

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        usbManager = (UsbManager) getSystemService(Context.USB_SERVICE);
        bridge = new Uti120UsbBridge(usbManager, this);
        IntentFilter permissionFilter = new IntentFilter(USB_PERMISSION_ACTION);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            registerReceiver(usbReceiver, permissionFilter, Context.RECEIVER_NOT_EXPORTED);
        } else {
            registerReceiver(usbReceiver, permissionFilter);
        }
        setContentView(buildContent());

        UsbDevice attached = getIntent().getParcelableExtra(UsbManager.EXTRA_DEVICE);
        if (attached != null && isUti120(attached)) {
            requestUsbPermission(attached);
        }
    }

    private View buildContent() {
        int padding = dp(20);
        LinearLayout root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setPadding(padding, padding, padding, padding);
        root.setBackgroundColor(0xFFF6F8F6);

        TextView eyebrow = text("DIABCARE / THERMAL COMPANION", 12, 0xFF4F7463);
        eyebrow.setAllCaps(true);
        root.addView(eyebrow);
        root.addView(text("UNI-T UTi120M bridge", 28, 0xFF132238));
        root.addView(text("Android USB host connection for calibrated thermal capture.", 15, 0xFF64746B));

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setPadding(dp(16), dp(16), dp(16), dp(16));
        card.setBackgroundColor(0xFFFFFFFF);
        LinearLayout.LayoutParams cardParams = new LinearLayout.LayoutParams(-1, -2);
        cardParams.setMargins(0, dp(24), 0, dp(16));
        root.addView(card, cardParams);

        connectionText = text("Not connected", 18, 0xFF132238);
        card.addView(connectionText);
        statusText = text("Connect the UTi120M with a USB-C OTG data cable.", 14, 0xFF64746B);
        card.addView(statusText);
        frameText = text("Frames received: 0", 14, 0xFF315E49);
        card.addView(frameText);
        rawRangeText = text("Raw sensor range: —", 14, 0xFF64746B);
        card.addView(rawRangeText);

        Button find = new Button(this);
        find.setText("Find UTi120M");
        find.setOnClickListener(view -> findAndRequest());
        root.addView(find, fullWidth());

        Button disconnect = new Button(this);
        disconnect.setText("Disconnect");
        disconnect.setOnClickListener(view -> {
            bridge.close();
            connectionText.setText("Not connected");
            statusText.setText("Disconnected");
        });
        root.addView(disconnect, fullWidth());

        TextView note = text("Raw frames are shown for hardware validation only. Celsius conversion, shutter/NUC calibration, patient assignment, and DiabCare upload are intentionally not enabled in this first slice.", 13, 0xFF8A6654);
        note.setPadding(0, dp(20), 0, 0);
        root.addView(note);
        return root;
    }

    private void findAndRequest() {
        UsbDevice device = bridge.findDevice();
        if (device == null) {
            onError("UTi120M not found. Check the OTG adapter and data cable.");
            return;
        }
        requestUsbPermission(device);
    }

    private void requestUsbPermission(UsbDevice device) {
        pendingDevice = device;
        if (bridge.hasPermission(device)) {
            bridge.open(device);
            return;
        }
        Intent permissionIntent = new Intent(USB_PERMISSION_ACTION);
        PendingIntent pendingIntent = PendingIntent.getBroadcast(
                this, 0, permissionIntent, PendingIntent.FLAG_MUTABLE);
        usbManager.requestPermission(device, pendingIntent);
        statusText.setText("Waiting for Android USB permission…");
    }

    private static boolean isUti120(UsbDevice device) {
        return device.getVendorId() == Uti120Protocol.VENDOR_ID
                && device.getProductId() == Uti120Protocol.PRODUCT_ID;
    }

    @Override
    public void onStatus(String message) {
        runOnUiThread(() -> statusText.setText(message));
    }

    @Override
    public void onFrame(Uti120Protocol.ThermalFrame frame) {
        runOnUiThread(() -> {
            connectionText.setText("UTi120M streaming");
            frameText.setText(String.format(Locale.US, "Frame %d · %dx%d", frame.frameCounter, frame.width, frame.height));
            rawRangeText.setText(String.format(Locale.US, "Raw sensor range: %d–%d · header FPA %.2f°C", frame.rawMin, frame.rawMax, frame.fpaC));
        });
    }

    @Override
    public void onError(String message) {
        runOnUiThread(() -> {
            connectionText.setText("Connection needs attention");
            statusText.setText(message);
        });
    }

    @Override
    protected void onDestroy() {
        bridge.shutdown();
        unregisterReceiver(usbReceiver);
        super.onDestroy();
    }

    private TextView text(String value, int size, int color) {
        TextView view = new TextView(this);
        view.setText(value);
        view.setTextSize(size);
        view.setTextColor(color);
        view.setGravity(Gravity.START);
        view.setPadding(0, dp(5), 0, dp(5));
        return view;
    }

    private LinearLayout.LayoutParams fullWidth() {
        LinearLayout.LayoutParams params = new LinearLayout.LayoutParams(-1, -2);
        params.setMargins(0, dp(6), 0, 0);
        return params;
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
