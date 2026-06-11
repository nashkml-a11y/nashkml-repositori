// ============================================================
// DRAGON BALL RADAR — Firmware Cerebro
// FASE 2: GPS propio + recepción LoRa de bolas + UART a Waveshare
// ============================================================
// El cerebro nunca dibuja. Solo calcula y envía datos procesados
// a la Waveshare por UART0 (115200 baud).
//
// HARDWARE:
//   GPS NEO-M8N  → UART2 (RX=16, TX=17)
//   LoRa Ra-02   → SPI  (SCK=18, MISO=19, MOSI=23, NSS=5, RST=14, DIO0=2)
//   DWM1000 UWB  → SPI compartido (CS=4, RST=22, IRQ=21) — FASE 5
//   Waveshare    → UART0 (TX=1, RX=3) a 115200
//
// NOTA: Serial (UART0) es el enlace a la Waveshare.
//   Durante verificación en Fase 2, el monitor serie muestra
//   exactamente las tramas que recibirá la Waveshare en Fase 3.
// ============================================================

#include <Arduino.h>
#include <SPI.h>
#include <LoRa.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>
#include <math.h>

// --- Pines LoRa ---
#define LORA_SCK    18
#define LORA_MISO   19
#define LORA_MOSI   23
#define LORA_NSS     5
#define LORA_RST    14
#define LORA_DIO0    2

// --- Pines GPS propio ---
#define GPS_RX      16
#define GPS_TX      17

// --- Pines DWM1000 (reservados, sin usar en Fase 2) ---
#define UWB_CS      4
#define UWB_RST     22
#define UWB_IRQ     21

// --- Tiempos ---
#define GPS_SEND_INTERVAL_MS    2000    // enviar posición propia cada 2s
#define BAT_SEND_INTERVAL_MS   10000   // enviar nivel batería cada 10s
#define BOLA_TIMEOUT_MS        300000  // bola inactiva si no recibe en 5 min

// --- LoRa config (idéntica a las bolas) ---
#define LORA_FREQ   433E6
#define LORA_SF        12
#define LORA_BW    125000
#define LORA_CR         8

#define NUM_BOLAS   7

// ---------------------------------------------------------------

struct Bola {
    uint8_t  id;
    double   lat;
    double   lon;
    bool     fix;
    float    distancia_m;
    bool     activa;          // true = encontrada (<5m confirmado)
    uint32_t ultimaVez;       // millis() de última recepción LoRa
    bool     recibida;        // al menos una trama recibida
};

TinyGPSPlus gps;
HardwareSerial gpsSerial(2);  // UART2

Bola bolas[NUM_BOLAS];

double myLat = 0.0, myLon = 0.0;
bool   myFix = false;

uint32_t lastGpsSend  = 0;
uint32_t lastBatSend  = 0;

// ---------------------------------------------------------------
// Haversine — distancia en metros entre dos coordenadas GPS
// ---------------------------------------------------------------
float haversine(double lat1, double lon1, double lat2, double lon2) {
    const double R = 6371000.0;
    double dLat = (lat2 - lat1) * PI / 180.0;
    double dLon = (lon2 - lon1) * PI / 180.0;
    double a = sin(dLat / 2) * sin(dLat / 2) +
               cos(lat1 * PI / 180.0) * cos(lat2 * PI / 180.0) *
               sin(dLon / 2) * sin(dLon / 2);
    double c = 2 * atan2(sqrt(a), sqrt(1 - a));
    return (float)(R * c);
}

// ---------------------------------------------------------------
// Lee ADC para nivel de batería (0-100)
// Ajustar según divisor de tensión usado en el hardware.
// LiPo 2000mAh: ~4.2V plena, ~3.3V vacía.
// ---------------------------------------------------------------
uint8_t readBattery() {
    // ADC1_CH0 (GPIO36) si hay divisor de tensión conectado.
    // Sin hardware de medición: devuelve 0 como placeholder.
    return 0;
}

// ---------------------------------------------------------------
// Parsea trama LoRa de bola: "DB,<id>,<lat>,<lon>,<fix>"
// ---------------------------------------------------------------
bool parseBolaPacket(const String &packet, uint8_t &id,
                     double &lat, double &lon, bool &fix) {
    if (!packet.startsWith("DB,")) return false;

    int f1 = packet.indexOf(',');
    int f2 = packet.indexOf(',', f1 + 1);
    int f3 = packet.indexOf(',', f2 + 1);
    int f4 = packet.indexOf(',', f3 + 1);

    if (f1 < 0 || f2 < 0 || f3 < 0 || f4 < 0) return false;

    id  = (uint8_t)packet.substring(f1 + 1, f2).toInt();
    lat = packet.substring(f2 + 1, f3).toDouble();
    lon = packet.substring(f3 + 1, f4).toDouble();
    fix = packet.substring(f4 + 1).toInt() == 1;

    return (id >= 1 && id <= NUM_BOLAS);
}

// ---------------------------------------------------------------
// Envía tramas UART a la Waveshare (Serial = UART0)
// ---------------------------------------------------------------
void sendBola(const Bola &b) {
    char buf[64];
    snprintf(buf, sizeof(buf), "BOLA,%d,%.6f,%.6f,%.1f,%d\n",
             b.id, b.lat, b.lon, b.distancia_m, b.activa ? 1 : 0);
    Serial.print(buf);
}

void sendGPS() {
    char buf[56];
    uint8_t sats = gps.satellites.isValid() ? (uint8_t)gps.satellites.value() : 0;
    snprintf(buf, sizeof(buf), "GPS,%.6f,%.6f,%d,%d\n",
             myLat, myLon, myFix ? 1 : 0, sats);
    Serial.print(buf);
}

void sendSenal(int rssi) {
    char buf[24];
    snprintf(buf, sizeof(buf), "SENAL,%d\n", rssi);
    Serial.print(buf);
}

void sendBat(uint8_t nivel) {
    char buf[16];
    snprintf(buf, sizeof(buf), "BAT,%d\n", nivel);
    Serial.print(buf);
}

// ---------------------------------------------------------------

void setupLoRa() {
    SPI.begin(LORA_SCK, LORA_MISO, LORA_MOSI, LORA_NSS);
    LoRa.setPins(LORA_NSS, LORA_RST, LORA_DIO0);

    if (!LoRa.begin(LORA_FREQ)) {
        Serial.println("ERROR: LoRa no iniciado — reiniciando en 5s");
        delay(5000);
        ESP.restart();
    }

    LoRa.setSpreadingFactor(LORA_SF);
    LoRa.setSignalBandwidth(LORA_BW);
    LoRa.setCodingRate4(LORA_CR);
    LoRa.enableCrc();
    // Modo recepción continua
    LoRa.receive();
}

void initBolas() {
    for (int i = 0; i < NUM_BOLAS; i++) {
        bolas[i].id         = i + 1;
        bolas[i].lat        = 0.0;
        bolas[i].lon        = 0.0;
        bolas[i].fix        = false;
        bolas[i].distancia_m = 0.0f;
        bolas[i].activa     = false;
        bolas[i].ultimaVez  = 0;
        bolas[i].recibida   = false;
    }
}

// ---------------------------------------------------------------

void setup() {
    Serial.begin(115200);   // UART0 → Waveshare (y monitor serie en Fase 2)
    delay(500);

    // DWM1000 CS en HIGH para evitar conflicto SPI — Fase 5
    pinMode(UWB_CS, OUTPUT);
    digitalWrite(UWB_CS, HIGH);

    gpsSerial.begin(9600, SERIAL_8N1, GPS_RX, GPS_TX);

    initBolas();
    setupLoRa();
}

void loop() {
    uint32_t now = millis();

    // --- Leer GPS propio ---
    while (gpsSerial.available()) {
        gps.encode(gpsSerial.read());
    }
    if (gps.location.isValid() && gps.location.age() < 3000) {
        myLat = gps.location.lat();
        myLon = gps.location.lng();
        myFix = true;
    } else if (gps.location.age() > 10000) {
        myFix = false;
    }

    // --- Leer paquete LoRa ---
    int packetSize = LoRa.parsePacket();
    if (packetSize > 0) {
        String packet = "";
        while (LoRa.available()) {
            packet += (char)LoRa.read();
        }
        int rssi = LoRa.packetRssi();

        uint8_t id;
        double  lat, lon;
        bool    fix;

        if (parseBolaPacket(packet, id, lat, lon, fix)) {
            Bola &b       = bolas[id - 1];
            b.lat         = lat;
            b.lon         = lon;
            b.fix         = fix;
            b.ultimaVez   = now;
            b.recibida    = true;

            if (myFix && fix) {
                b.distancia_m = haversine(myLat, myLon, lat, lon);
            }

            sendBola(b);
            sendSenal(rssi);
        }

        // Volver a modo recepción tras parsear
        LoRa.receive();
    }

    // --- Enviar posición propia periódicamente ---
    if (now - lastGpsSend >= GPS_SEND_INTERVAL_MS) {
        lastGpsSend = now;
        sendGPS();
    }

    // --- Enviar batería periódicamente ---
    if (now - lastBatSend >= BAT_SEND_INTERVAL_MS) {
        lastBatSend = now;
        sendBat(readBattery());
    }
}
