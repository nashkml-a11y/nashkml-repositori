// ============================================================
// DRAGON BALL RADAR — Firmware Waveshare ESP32-S3-LCD-2.8C
// FASE 3: UART del cerebro → radar en pantalla con datos reales
// ============================================================
// Regla crítica: esta MCU SOLO dibuja. Nunca calcula posiciones,
// nunca accede a GPS, LoRa ni UWB directamente.
//
// HARDWARE:
//   Pantalla ST7701  480x480 circular, bus RGB 16 bits
//   UART cerebro     RX=43, TX=44, 115200 baud
//   Pulsador zoom    GPIO0 (BOOT pin, INPUT_PULLUP)
//   Giroscopio       QMI8658, I2C (SDA=7, SCL=15) — Fase 6
//   Buzzer           TCA9554 I2C — Fase 5
//
// SECUENCIA DE INIT OBLIGATORIA (no alterar el orden):
//   Wire.begin → I2C_Write_EXIO → TCA9554PWR_Init → delay(20)
//   → ST7701_Reset → ST7701_SPI_Only_Init → liberar SPI
//   → lcd.init() → Set_Backlight(70)
// ============================================================

#include <Arduino.h>
#include <Wire.h>
#include <math.h>
#include "lgfx_config.h"
#include "Display_ST7701.h"
#include "TCA9554PWR.h"
#include "logo.h"

// ---------------------------------------------------------------
// Constantes de pantalla
// ---------------------------------------------------------------
#define SCREEN_W    480
#define SCREEN_H    480
#define CX          240     // centro X
#define CY          240     // centro Y
#define RADAR_R     210     // radio del círculo del radar

// ---------------------------------------------------------------
// Pines
// ---------------------------------------------------------------
#define UART_RX     43
#define UART_TX     44
#define BTN_PIN      0

// ---------------------------------------------------------------
// Colores (RGB565)
// ---------------------------------------------------------------
#define C_BLACK     0x0000
#define C_GREEN     0x07E0
#define C_GREEN_DIM 0x0320   // verde oscuro para grid
#define C_ORANGE    0xFD20
#define C_WHITE     0xFFFF
#define C_YELLOW    0xFFE0
#define C_RED       0xF800
#define C_GRAY      0x4208
#define C_DARKGRAY  0x2104

// ---------------------------------------------------------------
// Niveles de zoom
// ---------------------------------------------------------------
static const float ZOOM_METROS[] = { 10, 50, 200, 1000, 5000, 15000 };
static const char* ZOOM_LABEL[]  = { "10m","50m","200m","1km","5km","15km" };
#define NUM_ZOOMS 6

// ---------------------------------------------------------------
// Estado de las bolas
// ---------------------------------------------------------------
#define NUM_BOLAS 7

struct Bola {
    double  lat;
    double  lon;
    float   dist_m;
    bool    activa;       // encontrada
    bool    recibida;     // al menos una trama recibida
    uint32_t ultimaVez;
};

// ---------------------------------------------------------------
// Estado global
// ---------------------------------------------------------------
Bola   bolas[NUM_BOLAS];
double myLat      = 0.0, myLon = 0.0;
bool   myFix      = false;
int    rssi       = -120;
uint8_t bateria   = 0;

int    zoomIdx    = 2;           // zoom inicial: 200m
float  sweepAngle = 0.0f;        // ángulo barrido (grados)
bool   pulsoBola[NUM_BOLAS]   = {};  // estado animación pulso
uint32_t lastPulso[NUM_BOLAS] = {};

// Botón
bool btnPrev = HIGH;

// ---------------------------------------------------------------
// LovyanGFX — sprites
// ---------------------------------------------------------------
LGFX lcd;
LGFX_Sprite mainSprite(&lcd);   // buffer de trabajo, PSRAM
LGFX_Sprite bgSprite(&lcd);     // fondo pre-renderizado, PSRAM

// ---------------------------------------------------------------
// UART del cerebro
// ---------------------------------------------------------------
HardwareSerial cerebro(1);      // UART1 en GPIO43/44
String uartBuf = "";

// ---------------------------------------------------------------
// Init pantalla — secuencia obligatoria
// ---------------------------------------------------------------
void initDisplay() {
    Wire.begin(7, 15);
    I2C_Write_EXIO(TCA9554_OUTPUT_REG, 0x05);
    TCA9554PWR_Init(0x00);
    delay(20);
    ST7701_Reset();
    ST7701_SPI_Only_Init();

    // Liberar SPI2 antes de que LovyanGFX tome el bus RGB
    spi_bus_remove_device(nullptr);   // handle real en los archivos de soporte
    spi_bus_free(SPI2_HOST);

    lcd.init();
    lcd.setBrightness(178);   // ~70% de 255
}

// ---------------------------------------------------------------
// Pre-renderiza el fondo: negro + grid + círculo radar
// ---------------------------------------------------------------
void buildBackground() {
    bgSprite.fillScreen(C_BLACK);

    // Grid verde semitransparente — líneas cada 60px
    for (int x = 0; x < SCREEN_W; x += 60) {
        bgSprite.drawLine(x, 0, x, SCREEN_H, C_GREEN_DIM);
    }
    for (int y = 0; y < SCREEN_H; y += 60) {
        bgSprite.drawLine(0, y, SCREEN_W, y, C_GREEN_DIM);
    }

    // Círculos concéntricos del radar
    bgSprite.drawCircle(CX, CY, RADAR_R,       C_GREEN_DIM);
    bgSprite.drawCircle(CX, CY, RADAR_R * 2/3, C_GREEN_DIM);
    bgSprite.drawCircle(CX, CY, RADAR_R * 1/3, C_GREEN_DIM);

    // Cruz central
    bgSprite.drawLine(CX - 10, CY, CX + 10, CY, C_GREEN_DIM);
    bgSprite.drawLine(CX, CY - 10, CX, CY + 10, C_GREEN_DIM);
}

// ---------------------------------------------------------------
// Proyección GPS → píxeles (válida <1km)
// Norte = arriba (Y−), Este = derecha (X+)
// ---------------------------------------------------------------
void gpsToScreen(double lat, double lon, int &px, int &py) {
    float zoom = ZOOM_METROS[zoomIdx];
    double dx = (lon - myLon) * cos(myLat * PI / 180.0) * 111320.0;
    double dy = (lat - myLat) * 111320.0;
    px = (int)(CX + dx * (RADAR_R / zoom));
    py = (int)(CY - dy * (RADAR_R / zoom));
}

// ---------------------------------------------------------------
// Dibuja la cola del barrido (28 líneas, degradado de brillo)
// ---------------------------------------------------------------
void drawSweep(LGFX_Sprite &spr) {
    const int TAIL_STEPS = 28;
    const float TAIL_DEG = 64.0f;

    for (int i = 0; i < TAIL_STEPS; i++) {
        float angle = sweepAngle - (i * TAIL_DEG / TAIL_STEPS);
        float rad   = angle * PI / 180.0f;
        int x2 = CX + (int)(RADAR_R * cos(rad));
        int y2 = CY + (int)(RADAR_R * sin(rad));

        uint8_t bright = (uint8_t)(180 * (1.0f - (float)i / TAIL_STEPS));
        uint16_t color = spr.color565(0, bright, 0);
        spr.drawLine(CX, CY, x2, y2, color);
    }

    // Línea principal del barrido
    float rad = sweepAngle * PI / 180.0f;
    int x2 = CX + (int)(RADAR_R * cos(rad));
    int y2 = CY + (int)(RADAR_R * sin(rad));
    spr.drawLine(CX, CY, x2, y2, C_GREEN);
}

// ---------------------------------------------------------------
// Dibuja una bola dentro del radar
// ---------------------------------------------------------------
void drawBolaInside(LGFX_Sprite &spr, int px, int py, int id) {
    uint32_t now = millis();
    bool pulso = (now - lastPulso[id]) < 200;   // parpadea 200ms cada 400ms

    spr.fillCircle(px, py, 6, C_ORANGE);
    if (pulso) {
        spr.fillCircle(px, py, 3, C_WHITE);
    }
    spr.drawCircle(px, py, 11, C_ORANGE);
}

// ---------------------------------------------------------------
// Dibuja triángulo en el borde del radar apuntando a la bola
// ---------------------------------------------------------------
void drawBolaEdge(LGFX_Sprite &spr, double lat, double lon) {
    if (!myFix) return;

    double dx = (lon - myLon) * cos(myLat * PI / 180.0) * 111320.0;
    double dy = (lat - myLat) * 111320.0;
    float angle = atan2(-dy, dx);   // atan2 con Y invertido (Norte = arriba)

    int ex = CX + (int)((RADAR_R - 12) * cos(angle));
    int ey = CY + (int)((RADAR_R - 12) * sin(angle));

    // Triángulo equilátero de 12px apuntando hacia la bola
    float perp = angle + PI / 2.0f;
    int ax = ex + (int)(6 * cos(perp));
    int ay = ey + (int)(6 * sin(perp));
    int bx = ex - (int)(6 * cos(perp));
    int by = ey - (int)(6 * sin(perp));
    int cx = ex + (int)(12 * cos(angle));
    int cy = ey + (int)(12 * sin(angle));

    spr.fillTriangle(ax, ay, bx, by, cx, cy, C_ORANGE);
}

// ---------------------------------------------------------------
// HUD superior: zoom + contador de bolas encontradas
// ---------------------------------------------------------------
void drawHUDTop(LGFX_Sprite &spr) {
    spr.setTextSize(1);
    spr.setTextColor(C_WHITE);

    char buf[32];
    snprintf(buf, sizeof(buf), "ZOOM: %s", ZOOM_LABEL[zoomIdx]);
    spr.drawString(buf, CX, 18, &fonts::Font2);

    int encontradas = 0;
    for (int i = 0; i < NUM_BOLAS; i++) {
        if (bolas[i].activa) encontradas++;
    }
    snprintf(buf, sizeof(buf), "%d / %d", encontradas, NUM_BOLAS);
    spr.drawString(buf, CX, 36, &fonts::Font2);
}

// ---------------------------------------------------------------
// HUD inferior: GPS, batería, señal LoRa
// ---------------------------------------------------------------
void drawHUDBottom(LGFX_Sprite &spr) {
    spr.setTextSize(1);

    // Estado GPS
    if (myFix) {
        spr.setTextColor(C_GREEN);
        spr.drawString("GPS OK", 80, SCREEN_H - 24, &fonts::Font2);
    } else {
        spr.setTextColor(C_RED);
        spr.drawString("GPS...", 80, SCREEN_H - 24, &fonts::Font2);
    }

    // Batería
    char buf[16];
    snprintf(buf, sizeof(buf), "BAT %d%%", bateria);
    uint16_t batColor = (bateria > 20) ? C_GREEN : C_RED;
    spr.setTextColor(batColor);
    spr.drawString(buf, CX, SCREEN_H - 24, &fonts::Font2);

    // Señal LoRa
    snprintf(buf, sizeof(buf), "%ddBm", rssi);
    spr.setTextColor(C_GRAY);
    spr.drawString(buf, SCREEN_W - 80, SCREEN_H - 24, &fonts::Font2);
}

// ---------------------------------------------------------------
// Frame completo del radar
// ---------------------------------------------------------------
void drawRadar() {
    // Copiar fondo pre-renderizado al sprite principal
    bgSprite.pushSprite(&mainSprite, 0, 0);

    // Barrido
    drawSweep(mainSprite);

    // Bolas
    for (int i = 0; i < NUM_BOLAS; i++) {
        if (!bolas[i].recibida) continue;

        int px, py;
        gpsToScreen(bolas[i].lat, bolas[i].lon, px, py);

        float dx = px - CX, dy = py - CY;
        bool dentro = (dx * dx + dy * dy) <= ((float)RADAR_R * RADAR_R);

        if (dentro) {
            drawBolaInside(mainSprite, px, py, i);
        } else {
            drawBolaEdge(mainSprite, bolas[i].lat, bolas[i].lon);
        }
    }

    drawHUDTop(mainSprite);
    drawHUDBottom(mainSprite);

    // Volcar sprite a pantalla
    mainSprite.pushSprite(0, 0);
}

// ---------------------------------------------------------------
// Parser UART — procesa líneas completas del cerebro
// ---------------------------------------------------------------
void parseUART(const String &line) {
    if (line.startsWith("BOLA,")) {
        // BOLA,<id>,<lat>,<lon>,<dist_m>,<activa>
        int f[5];
        f[0] = line.indexOf(',');
        for (int i = 1; i < 5; i++) f[i] = line.indexOf(',', f[i-1] + 1);
        if (f[4] < 0) return;

        int id = line.substring(f[0]+1, f[1]).toInt();
        if (id < 1 || id > NUM_BOLAS) return;

        Bola &b     = bolas[id - 1];
        b.lat       = line.substring(f[1]+1, f[2]).toDouble();
        b.lon       = line.substring(f[2]+1, f[3]).toDouble();
        b.dist_m    = line.substring(f[3]+1, f[4]).toFloat();
        b.activa    = line.substring(f[4]+1).toInt() == 1;
        b.recibida  = true;
        b.ultimaVez = millis();

    } else if (line.startsWith("GPS,")) {
        // GPS,<lat>,<lon>,<fix>
        int f1 = line.indexOf(',');
        int f2 = line.indexOf(',', f1+1);
        int f3 = line.indexOf(',', f2+1);
        if (f3 < 0) return;

        myLat = line.substring(f1+1, f2).toDouble();
        myLon = line.substring(f2+1, f3).toDouble();
        myFix = line.substring(f3+1).toInt() == 1;

    } else if (line.startsWith("SENAL,")) {
        rssi = line.substring(6).toInt();

    } else if (line.startsWith("BAT,")) {
        bateria = (uint8_t)line.substring(4).toInt();

    } else if (line.startsWith("ENCONTRADA,")) {
        // Fase 5: bola encontrada por UWB
        int id = line.substring(11).toInt();
        if (id >= 1 && id <= NUM_BOLAS) {
            bolas[id - 1].activa = true;
            // TODO Fase 5: reproducir fanfarria por buzzer TCA9554
        }

    } else if (line.startsWith("UWB,")) {
        // UWB,<id>,<dist_cm> — informativo, el cerebro ya envía ENCONTRADA
    }
}

void readUART() {
    while (cerebro.available()) {
        char c = cerebro.read();
        if (c == '\n') {
            uartBuf.trim();
            if (uartBuf.length() > 0) parseUART(uartBuf);
            uartBuf = "";
        } else {
            uartBuf += c;
        }
    }
}

// ---------------------------------------------------------------
// Botón zoom
// ---------------------------------------------------------------
void checkButton() {
    bool btnNow = digitalRead(BTN_PIN);
    if (btnPrev == HIGH && btnNow == LOW) {
        zoomIdx = (zoomIdx + 1) % NUM_ZOOMS;
        buildBackground();   // regenerar fondo (sin cambios visuales, por consistencia)
    }
    btnPrev = btnNow;
}

// ---------------------------------------------------------------
// Actualiza temporizadores de pulso de bolas
// ---------------------------------------------------------------
void updatePulsos() {
    uint32_t now = millis();
    for (int i = 0; i < NUM_BOLAS; i++) {
        if (now - lastPulso[i] >= 400) {
            lastPulso[i] = now;
            pulsoBola[i] = !pulsoBola[i];
        }
    }
}

// ---------------------------------------------------------------

void setup() {
    pinMode(BTN_PIN, INPUT_PULLUP);

    initDisplay();

    // Sprites en PSRAM
    mainSprite.setColorDepth(16);
    mainSprite.createSprite(SCREEN_W, SCREEN_H);   // ~460KB en PSRAM

    bgSprite.setColorDepth(16);
    bgSprite.createSprite(SCREEN_W, SCREEN_H);

    buildBackground();

    // Mostrar logo al arrancar (Fase 4 añadirá la espera de GPS)
    mainSprite.fillScreen(C_BLACK);
    mainSprite.setSwapBytes(false);   // evitar colores arco iris en el logo
    mainSprite.pushImage(
        CX - LOGO_W, CY - LOGO_H,
        LOGO_W * 2, LOGO_H * 2,
        logo_data
    );
    mainSprite.pushSprite(0, 0);
    delay(2000);

    cerebro.begin(115200, SERIAL_8N1, UART_RX, UART_TX);

    // Inicializar estado de bolas
    memset(bolas, 0, sizeof(bolas));
}

void loop() {
    readUART();
    checkButton();
    updatePulsos();

    sweepAngle += 1.5f;   // ~1.5 grados por frame → ~4 rpm a 40fps
    if (sweepAngle >= 360.0f) sweepAngle -= 360.0f;

    drawRadar();
}
