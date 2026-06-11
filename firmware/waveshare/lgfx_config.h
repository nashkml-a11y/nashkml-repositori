// ============================================================
// LGFX config para Waveshare ESP32-S3-LCD-2.8C
// ST7701 con bus RGB 16 bits, resolución 480x480
// ============================================================
// IMPORTANTE: el ST7701 se inicializa primero por SPI (Display_ST7701.h)
// y luego se libera el SPI antes de que LovyanGFX tome el bus RGB.
// No llamar a lcd.init() antes de completar esa secuencia.
// ============================================================

#pragma once
#include <LovyanGFX.hpp>

class LGFX : public lgfx::LGFX_Device {
    lgfx::Bus_RGB     _bus_instance;
    lgfx::Panel_ST7701 _panel_instance;
    lgfx::Light_PWM   _light_instance;

public:
    LGFX() {
        // --- Bus RGB ---
        {
            auto cfg = _bus_instance.config();

            cfg.panel = &_panel_instance;

            // Pines de control
            cfg.pin_hsync  = 46;
            cfg.pin_vsync  = 3;
            cfg.pin_henable = 40;
            cfg.pin_pclk   = 9;

            // Datos R (5 bits)
            cfg.pin_d0  = 11;   // R0
            cfg.pin_d1  = 12;   // R1
            cfg.pin_d2  = 13;   // R2
            cfg.pin_d3  = 14;   // R3
            cfg.pin_d4  = 21;   // R4

            // Datos G (6 bits)
            cfg.pin_d5  = 47;   // G0
            cfg.pin_d6  = 48;   // G1
            cfg.pin_d7  = 45;   // G2
            cfg.pin_d8  = 38;   // G3
            cfg.pin_d9  = 39;   // G4
            cfg.pin_d10 = 40;   // G5  (DE comparte con G5 en algunos paneles)

            // Datos B (5 bits)
            cfg.pin_d11 = 41;   // B0
            cfg.pin_d12 = 42;   // B1
            cfg.pin_d13 =  2;   // B2
            cfg.pin_d14 =  1;   // B3  ← verificar contra esquemático
            cfg.pin_d15 =  0;   // B4

            cfg.hsync_polarity    = 0;
            cfg.hsync_front_porch = 10;
            cfg.hsync_pulse_width = 8;
            cfg.hsync_back_porch  = 50;
            cfg.vsync_polarity    = 0;
            cfg.vsync_front_porch = 10;
            cfg.vsync_pulse_width = 8;
            cfg.vsync_back_porch  = 20;
            cfg.pclk_idle_high    = 0;
            cfg.pclk_hz           = 14000000;

            _bus_instance.config(cfg);
            _panel_instance.setBus(&_bus_instance);
        }

        // --- Panel ---
        {
            auto cfg = _panel_instance.config();
            cfg.memory_width  = 480;
            cfg.memory_height = 480;
            cfg.panel_width   = 480;
            cfg.panel_height  = 480;
            cfg.offset_x      = 0;
            cfg.offset_y      = 0;
            _panel_instance.config(cfg);
        }

        // --- Backlight ---
        {
            auto cfg = _light_instance.config();
            cfg.pin_bl = 45;    // ajustar si el backlight usa otro pin
            cfg.invert = false;
            cfg.freq   = 44100;
            cfg.pwm_channel = 7;
            _light_instance.config(cfg);
            _panel_instance.setLight(&_light_instance);
        }

        setPanel(&_panel_instance);
    }
};
