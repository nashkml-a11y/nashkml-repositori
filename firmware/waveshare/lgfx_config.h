// ============================================================
// LGFX config para Waveshare ESP32-S3-LCD-2.8C
// ST7701 con bus RGB 16 bits, resolución 480x480
// ============================================================
// Pines verificados contra esquemático oficial:
//   esp-arduino-libs/ESP32_Display_Panel
//   BOARD_WAVESHARE_ESP32_S3_TOUCH_LCD_2_8_C.h
//
// IMPORTANTE: el ST7701 se inicializa primero por SPI (Display_ST7701.h)
// y luego se libera el SPI antes de que LovyanGFX tome el bus RGB.
// No llamar a lcd.init() antes de completar esa secuencia.
// ============================================================

#pragma once
#include <LovyanGFX.hpp>

class LGFX : public lgfx::LGFX_Device {
    lgfx::Bus_RGB      _bus_instance;
    lgfx::Panel_ST7701 _panel_instance;
    lgfx::Light_PWM    _light_instance;

public:
    LGFX() {
        // --- Bus RGB ---
        {
            auto cfg = _bus_instance.config();

            cfg.panel = &_panel_instance;

            // Pines de control
            cfg.pin_hsync   = 38;
            cfg.pin_vsync   = 39;
            cfg.pin_henable = 40;
            cfg.pin_pclk    = 41;

            // Datos R (5 bits, R0=LSB)
            cfg.pin_d0  = 46;   // R0
            cfg.pin_d1  =  3;   // R1
            cfg.pin_d2  =  8;   // R2
            cfg.pin_d3  = 18;   // R3
            cfg.pin_d4  = 17;   // R4

            // Datos G (6 bits, G0=LSB)
            cfg.pin_d5  = 14;   // G0
            cfg.pin_d6  = 13;   // G1
            cfg.pin_d7  = 12;   // G2
            cfg.pin_d8  = 11;   // G3
            cfg.pin_d9  = 10;   // G4
            cfg.pin_d10 =  9;   // G5

            // Datos B (5 bits, B0=LSB)
            cfg.pin_d11 =  5;   // B0
            cfg.pin_d12 = 45;   // B1
            cfg.pin_d13 = 48;   // B2
            cfg.pin_d14 = 47;   // B3
            cfg.pin_d15 = 21;   // B4

            // Timing verificado contra esquemático oficial (18 MHz PCLK)
            cfg.hsync_polarity    = 0;
            cfg.hsync_front_porch = 50;
            cfg.hsync_pulse_width =  8;
            cfg.hsync_back_porch  = 10;
            cfg.vsync_polarity    = 0;
            cfg.vsync_front_porch =  8;
            cfg.vsync_pulse_width =  2;
            cfg.vsync_back_porch  = 18;
            cfg.pclk_idle_high    = 0;
            cfg.pclk_hz           = 18000000;

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

        // --- Backlight (GPIO6, PWM) ---
        {
            auto cfg = _light_instance.config();
            cfg.pin_bl      = 6;
            cfg.invert      = false;
            cfg.freq        = 44100;
            cfg.pwm_channel = 7;
            _light_instance.config(cfg);
            _panel_instance.setLight(&_light_instance);
        }

        setPanel(&_panel_instance);
    }
};
