// ============================================================
// DRAGON BALL RADAR — Firmware Bola
// FASE 1: GPS + LoRa + Deep Sleep
// ============================================================
// Cada bola emite su posición GPS por LoRa cada ~70 segundos.
// Ciclo: encender → leer GPS → emitir por LoRa → deep sleep 50s
//
// HARDWARE:
//   GPS NEO-6M   → UART2 (RX=16, TX=17)
//   LoRa Ra-02   → SPI (SCK=18, MISO=19, MOSI=23, NSS=5, RST=14, DIO0=2)
//   LED RGB      → GPIO25 (PWM, resistencia 100 ohm en serie)
// ============================================================

#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>
#include "esp_sleep.h"

// --- ID de esta bola (1-7). Cambiar antes de flashear cada unidad. ---
#define BOLA_ID 1

// --- Pines LoRa ---
#define LORA_SCK    18
#define LORA_MISO   19
#define LORA_MOSI   23
#define LORA_NSS     5
#define LORA_RST    14
#define LORA_DIO0    2

// --- Pines GPS ---
#define GPS_RX      16
#define GPS_TX      17

// --- Pin LED ---
#define LED_PIN     25

// --- Tiempos ---
#define GPS_TIMEOUT_MS      25000   // tiempo máximo esperando fix GPS
#define DEEP_SLEEP_SECS        50   // segundos en deep sleep entre emisiones
#define LORA_TX_POWER          17   // dBm (máximo Ra-02)

// --- LoRa config ---
#define LORA_FREQ       433E6
#define LORA_SF            12
#define LORA_BW        125000
#define LORA_CR             8   // coding rate 4/8

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);  // UART2

// ---------------------------------------------------------------

void setupLoRa() {
    SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_NSS);
    LoRa.setPins(LORA_NSS, LORA_RST, LORA_DIO0);

    if (!LoRa.begin(LORA_FREQ)) {
        Serial.println("ERROR: LoRa no iniciado");
        // No hay recuperación posible — dormir y reintentar en el próximo ciclo
        goToSleep();
    }

    LoRa.setSpreadingFactor(LORA_SF);
    LoRa.setSignalBandwidth(LORA_BW);
    LoRa.setCodingRate4(LORA_CR);
    LoRa.setTxPower(LORA_TX_POWER);
    LoRa.enableCrc();
}

void goToSleep() {
    Serial.printf("[BOLA %d] Durmiendo %d segundos...\n", BOLA_ID, DEEP_SLEEP_SECS);
    Serial.flush();
    LoRa.sleep();
    esp_sleep_enable_timer_wakeup((uint64_t)DEEP_SLEEP_SECS * 1000000ULL);
    esp_deep_sleep_start();
}

bool readGPS(double &lat, double &lon) {
    unsigned long start = millis();
    while (millis() - start < GPS_TIMEOUT_MS) {
        while (gpsSerial.available()) {
            gps.encode(gpsSerial.read());
        }
        if (gps.location.isValid() && gps.location.age() < 2000) {
            lat = gps.location.lat();
            lon = gps.location.lng();
            return true;
        }
    }
    return false;
}

void sendLoRa(double lat, double lon, bool hasFix) {
    char trama[64];
    snprintf(trama, sizeof(trama), "DB,%d,%.6f,%.6f,%d",
             BOLA_ID, lat, lon, hasFix ? 1 : 0);

    LoRa.beginPacket();
    LoRa.print(trama);
    LoRa.endPacket();

    Serial.printf("[BOLA %d] TX LoRa: %s\n", BOLA_ID, trama);
}

// ---------------------------------------------------------------

void setup() {
    Serial.begin(115200);
    Serial.printf("\n[BOLA %d] Despertando...\n", BOLA_ID);

    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);

    gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

    setupLoRa();

    double lat = 0.0, lon = 0.0;
    bool fix = readGPS(lat, lon);

    if (fix) {
        Serial.printf("[BOLA %d] GPS fix: %.6f, %.6f  sats=%d\n",
                      BOLA_ID, lat, lon, gps.satellites.value());
    } else {
        Serial.printf("[BOLA %d] Sin fix GPS — emitiendo sin coordenadas\n", BOLA_ID);
    }

    sendLoRa(lat, lon, fix);

    goToSleep();
}

void loop() {
    // Nunca se ejecuta — el ESP32 reinicia tras el deep sleep
}
