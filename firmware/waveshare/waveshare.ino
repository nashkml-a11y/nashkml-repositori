// ============================================================
// DRAGON BALL RADAR — Firmware Waveshare ESP32-S3-LCD-2.8C
// FASE 4: arranque real con espera de fix GPS
// ============================================================
// Regla crítica: esta MCU SOLO dibuja. Nunca calcula posiciones,
// nunca accede a GPS, LoRa ni UWB directamente.
//
// HARDWARE:
//   Pantalla ST7701  480x480 circular, bus RGB 16 bits
//   UART cerebro     RX=43, TX=44, 115200 baud
//   Pulsador zoom    GPIO0 (BOOT pin, INPUT_PULLUP)
//   Giroscopio       QMI8658, I2C (SDA=15, SCL=7) — Fase 6
//   Buzzer           TCA9554 I2C — Fase 5
//
// SECUENCIA DE INIT OBLIGATORIA (no alterar el orden):
//   Wire.begin → I2C_Write_EXIO → TCA9554PWR_Init → delay(20)
//   → ST7701_Reset → ST7701_SPI_Only_Init → liberar SPI
//   → lcd.init() → setBrightness
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
#define CX          240
#define CY          240
#define RADAR_R     210

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
#define C_GREEN_DIM 0x0320
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
// Máquina de estados del arranque
// ---------------------------------------------------------------
enum AppState {
    STATE_LOGO,        // mostrando logo (~2s)
    STATE_SEARCHING,   // esperando fix GPS
    STATE_GPS_OK,      // fix obtenido, transición breve
    STATE_RADAR        // operación normal
};

AppState appState    = STATE_LOGO;
uint32_t stateTimer  = 0;
uint8_t  dotCount    = 0;      // animación puntos suspensivos
uint32_t lastDot     = 0;

// ---------------------------------------------------------------
// Estado de las bolas
// ---------------------------------------------------------------
#define NUM_BOLAS 7

struct Bola {
    double   lat;
    double   lon;
    float    dist_m;
    bool     activa;
    bool     recibida;
    uint32_t ultimaVez;
};

// ---------------------------------------------------------------
// Estado global
// ---------------------------------------------------------------
Bola    bolas[NUM_BOLAS];
double  myLat    = 0.0, myLon = 0.0;
bool    myFix    = false;
uint8_t mySats   = 0;
int     rssi     = -120;
uint8_t bateria  = 0;

int     zoomIdx    = 2;
float   sweepAngle = 0.0f;
uint32_t lastPulso[NUM_BOLAS] = {};

bool btnPrev = HIGH;

// ---------------------------------------------------------------
// LovyanGFX
// ---------------------------------------------------------------
LGFX lcd;
LGFX_Sprite mainSprite(&lcd);
LGFX_Sprite bgSprite(&lcd);

// ---------------------------------------------------------------
// UART del cerebro
// ---------------------------------------------------------------
HardwareSerial cerebro(1);
String uartBuf = "";

// ---------------------------------------------------------------
// Init pantalla — secuencia obligatoria (no reordenar)
// ---------------------------------------------------------------
void initDisplay() {
    Wire.begin(15, 7);
    I2C_Write_EXIO(TCA9554_OUTPUT_REG, 0x05);
    TCA9554PWR_Init(0x00);
    delay(20);
    ST7701_Reset();
    ST7701_SPI_Only_Init();

    spi_bus_remove_device(nullptr);
    spi_bus_free(SPI2_HOST);

    lcd.init();
    lcd.setBrightness(178);   // 70%
}

// ---------------------------------------------------------------
// Pantalla de arranque — logo
// ---------------------------------------------------------------
void drawLogo() {
    mainSprite.fillScreen(C_BLACK);
    mainSprite.setSwapBytes(false);
    mainSprite.pushImage(
        CX - LOGO_W, CY - LOGO_H,
        LOGO_W * 2, LOGO_H * 2,
        logo_data
    );
    mainSprite.pushSprite(0, 0);
}

// ---------------------------------------------------------------
// Pantalla de arranque — buscando satélites
// ---------------------------------------------------------------
void drawSearching() {
    mainSprite.fillScreen(C_BLACK);
    mainSprite.setTextDatum(MC_DATUM);

    // Título
    mainSprite.setTextColor(C_YELLOW);
    mainSprite.drawString("DRAGON BALL RADAR", CX, CY - 60, &fonts::Font4);

    // Mensaje con puntos animados
    char msg[32];
    char dots[4] = "";
    for (int i = 0; i < (int)dotCount; i++) dots[i] = '.';
    dots[dotCount] = '\0';
    snprintf(msg, sizeof(msg), "BUSCANDO SATELITES%s", dots);
    mainSprite.setTextColor(C_GREEN);
    mainSprite.drawString(msg, CX, CY, &fonts::Font2);

    // Contador de satélites
    char satMsg[24];
    snprintf(satMsg, sizeof(satMsg), "SATS: %d", mySats);
    mainSprite.setTextColor(mySats >= 4 ? C_GREEN : C_GRAY);
    mainSprite.drawString(satMsg, CX, CY + 30, &fonts::Font4);

    mainSprite.pushSprite(0, 0);
}

// ---------------------------------------------------------------
// Pantalla de arranque — GPS OK
// ---------------------------------------------------------------
void drawGPSOk() {
    mainSprite.fillScreen(C_BLACK);
    mainSprite.setTextDatum(MC_DATUM);

    mainSprite.setTextColor(C_GREEN);
    mainSprite.drawString("GPS OK", CX, CY - 20, &fonts::Font6);

    char buf[24];
    snprintf(buf, sizeof(buf), "%d SATELITES", mySats);
    mainSprite.setTextColor(C_WHITE);
    mainSprite.drawString(buf, CX, CY + 30, &fonts::Font4);

    mainSprite.pushSprite(0, 0);
}

// ---------------------------------------------------------------
// Fade de brillo: de 178 a 0 y de vuelta a 178
// ---------------------------------------------------------------
void fadeTransition() {
    for (int b = 178; b >= 0; b -= 6) {
        lcd.setBrightness(b);
        delay(8);
    }
    buildBackground();   // preparar fondo del radar mientras pantalla apagada
    for (int b = 0; b <= 178; b += 6) {
        lcd.setBrightness(b);
        delay(8);
    }
}

// ---------------------------------------------------------------
// Pre-renderiza el fondo del radar
// ---------------------------------------------------------------
void buildBackground() {
    bgSprite.fillScreen(C_BLACK);

    for (int x = 0; x < SCREEN_W; x += 60)
        bgSprite.drawLine(x, 0, x, SCREEN_H, C_GREEN_DIM);
    for (int y = 0; y < SCREEN_H; y += 60)
        bgSprite.drawLine(0, y, SCREEN_W, y, C_GREEN_DIM);

    bgSprite.drawCircle(CX, CY, RADAR_R,       C_GREEN_DIM);
    bgSprite.drawCircle(CX, CY, RADAR_R * 2/3, C_GREEN_DIM);
    bgSprite.drawCircle(CX, CY, RADAR_R * 1/3, C_GREEN_DIM);
    bgSprite.drawLine(CX - 10, CY, CX + 10, CY, C_GREEN_DIM);
    bgSprite.drawLine(CX, CY - 10, CX, CY + 10, C_GREEN_DIM);
}

// ---------------------------------------------------------------
// Proyección GPS → píxeles
// ---------------------------------------------------------------
void gpsToScreen(double lat, double lon, int &px, int &py) {
    float zoom = ZOOM_METROS[zoomIdx];
    double dx = (lon - myLon) * cos(myLat * PI / 180.0) * 111320.0;
    double dy = (lat - myLat) * 111320.0;
    px = (int)(CX + dx * (RADAR_R / zoom));
    py = (int)(CY - dy * (RADAR_R / zoom));
}

// ---------------------------------------------------------------
// Barrido con cola degradada
// ---------------------------------------------------------------
void drawSweep(LGFX_Sprite &spr) {
    const int   TAIL_STEPS = 28;
    const float TAIL_DEG   = 64.0f;

    for (int i = 0; i < TAIL_STEPS; i++) {
        float angle = sweepAngle - (i * TAIL_DEG / TAIL_STEPS);
        float rad   = angle * PI / 180.0f;
        int x2 = CX + (int)(RADAR_R * cos(rad));
        int y2 = CY + (int)(RADAR_R * sin(rad));
        uint8_t bright = (uint8_t)(180 * (1.0f - (float)i / TAIL_STEPS));
        spr.drawLine(CX, CY, x2, y2, spr.color565(0, bright, 0));
    }

    float rad = sweepAngle * PI / 180.0f;
    spr.drawLine(CX, CY,
                 CX + (int)(RADAR_R * cos(rad)),
                 CY + (int)(RADAR_R * sin(rad)),
                 C_GREEN);
}

// ---------------------------------------------------------------
// Marcador bola dentro del radar
// ---------------------------------------------------------------
void drawBolaInside(LGFX_Sprite &spr, int px, int py, int id) {
    bool pulso = (millis() - lastPulso[id]) < 200;
    spr.fillCircle(px, py, 6, C_ORANGE);
    if (pulso) spr.fillCircle(px, py, 3, C_WHITE);
    spr.drawCircle(px, py, 11, C_ORANGE);
}

// ---------------------------------------------------------------
// Triángulo en el borde del radar apuntando a la bola
// ---------------------------------------------------------------
void drawBolaEdge(LGFX_Sprite &spr, double lat, double lon) {
    if (!myFix) return;
    double dx = (lon - myLon) * cos(myLat * PI / 180.0) * 111320.0;
    double dy = (lat - myLat) * 111320.0;
    float angle = atan2(-dy, dx);

    int ex = CX + (int)((RADAR_R - 12) * cos(angle));
    int ey = CY + (int)((RADAR_R - 12) * sin(angle));
    float perp = angle + PI / 2.0f;

    spr.fillTriangle(
        ex + (int)(6 * cos(perp)),  ey + (int)(6 * sin(perp)),
        ex - (int)(6 * cos(perp)),  ey - (int)(6 * sin(perp)),
        ex + (int)(12 * cos(angle)), ey + (int)(12 * sin(angle)),
        C_ORANGE
    );
}

// ---------------------------------------------------------------
// HUD superior
// ---------------------------------------------------------------
void drawHUDTop(LGFX_Sprite &spr) {
    spr.setTextDatum(MC_DATUM);
    char buf[32];
    snprintf(buf, sizeof(buf), "ZOOM: %s", ZOOM_LABEL[zoomIdx]);
    spr.setTextColor(C_WHITE);
    spr.drawString(buf, CX, 18, &fonts::Font2);

    int enc = 0;
    for (int i = 0; i < NUM_BOLAS; i++) if (bolas[i].activa) enc++;
    snprintf(buf, sizeof(buf), "%d / %d", enc, NUM_BOLAS);
    spr.drawString(buf, CX, 36, &fonts::Font2);
}

// ---------------------------------------------------------------
// HUD inferior
// ---------------------------------------------------------------
void drawHUDBottom(LGFX_Sprite &spr) {
    spr.setTextDatum(MC_DATUM);
    char buf[16];

    spr.setTextColor(myFix ? C_GREEN : C_RED);
    spr.drawString(myFix ? "GPS OK" : "GPS...", 80, SCREEN_H - 24, &fonts::Font2);

    snprintf(buf, sizeof(buf), "BAT %d%%", bateria);
    spr.setTextColor(bateria > 20 ? C_GREEN : C_RED);
    spr.drawString(buf, CX, SCREEN_H - 24, &fonts::Font2);

    snprintf(buf, sizeof(buf), "%ddBm", rssi);
    spr.setTextColor(C_GRAY);
    spr.drawString(buf, SCREEN_W - 80, SCREEN_H - 24, &fonts::Font2);
}

// ---------------------------------------------------------------
// Frame radar completo
// ---------------------------------------------------------------
void drawRadar() {
    bgSprite.pushSprite(&mainSprite, 0, 0);
    drawSweep(mainSprite);

    for (int i = 0; i < NUM_BOLAS; i++) {
        if (!bolas[i].recibida) continue;
        int px, py;
        gpsToScreen(bolas[i].lat, bolas[i].lon, px, py);
        float ddx = px - CX, ddy = py - CY;
        bool dentro = (ddx * ddx + ddy * ddy) <= ((float)RADAR_R * RADAR_R);
        if (dentro) drawBolaInside(mainSprite, px, py, i);
        else        drawBolaEdge(mainSprite, bolas[i].lat, bolas[i].lon);
    }

    drawHUDTop(mainSprite);
    drawHUDBottom(mainSprite);
    mainSprite.pushSprite(0, 0);
}

// ---------------------------------------------------------------
// Parser UART
// ---------------------------------------------------------------
void parseUART(const String &line) {
    if (line.startsWith("BOLA,")) {
        int f[5];
        f[0] = line.indexOf(',');
        for (int i = 1; i < 5; i++) f[i] = line.indexOf(',', f[i-1]+1);
        if (f[4] < 0) return;
        int id = line.substring(f[0]+1, f[1]).toInt();
        if (id < 1 || id > NUM_BOLAS) return;
        Bola &b    = bolas[id-1];
        b.lat      = line.substring(f[1]+1, f[2]).toDouble();
        b.lon      = line.substring(f[2]+1, f[3]).toDouble();
        b.dist_m   = line.substring(f[3]+1, f[4]).toFloat();
        b.activa   = line.substring(f[4]+1).toInt() == 1;
        b.recibida = true;
        b.ultimaVez = millis();

    } else if (line.startsWith("GPS,")) {
        // GPS,<lat>,<lon>,<fix>,<sats>
        int f1 = line.indexOf(',');
        int f2 = line.indexOf(',', f1+1);
        int f3 = line.indexOf(',', f2+1);
        int f4 = line.indexOf(',', f3+1);
        if (f3 < 0) return;
        myLat  = line.substring(f1+1, f2).toDouble();
        myLon  = line.substring(f2+1, f3).toDouble();
        myFix  = line.substring(f3+1, f4 > 0 ? f4 : line.length()).toInt() == 1;
        mySats = f4 > 0 ? (uint8_t)line.substring(f4+1).toInt() : 0;

        // Avanzar estado de arranque cuando llega el primer fix
        if (myFix && appState == STATE_SEARCHING) {
            appState   = STATE_GPS_OK;
            stateTimer = millis();
        }

    } else if (line.startsWith("SENAL,")) {
        rssi = line.substring(6).toInt();

    } else if (line.startsWith("BAT,")) {
        bateria = (uint8_t)line.substring(4).toInt();

    } else if (line.startsWith("ENCONTRADA,")) {
        int id = line.substring(11).toInt();
        if (id >= 1 && id <= NUM_BOLAS) {
            bolas[id-1].activa = true;
            // TODO Fase 5: fanfarria por buzzer TCA9554
        }
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
// Botón zoom (solo activo en STATE_RADAR)
// ---------------------------------------------------------------
void checkButton() {
    bool btnNow = digitalRead(BTN_PIN);
    if (btnPrev == HIGH && btnNow == LOW && appState == STATE_RADAR) {
        zoomIdx = (zoomIdx + 1) % NUM_ZOOMS;
    }
    btnPrev = btnNow;
}

void updatePulsos() {
    uint32_t now = millis();
    for (int i = 0; i < NUM_BOLAS; i++) {
        if (now - lastPulso[i] >= 400) lastPulso[i] = now;
    }
}

// ---------------------------------------------------------------

void setup() {
    pinMode(BTN_PIN, INPUT_PULLUP);

    initDisplay();

    mainSprite.setColorDepth(16);
    mainSprite.createSprite(SCREEN_W, SCREEN_H);
    bgSprite.setColorDepth(16);
    bgSprite.createSprite(SCREEN_W, SCREEN_H);

    memset(bolas, 0, sizeof(bolas));

    cerebro.begin(115200, SERIAL_8N1, UART_RX, UART_TX);

    appState   = STATE_LOGO;
    stateTimer = millis();
    drawLogo();
}

void loop() {
    readUART();
    checkButton();

    uint32_t now = millis();

    switch (appState) {

        case STATE_LOGO:
            if (now - stateTimer >= 2000) {
                appState   = STATE_SEARCHING;
                stateTimer = now;
            }
            break;

        case STATE_SEARCHING:
            // Actualizar puntos animados cada 500ms
            if (now - lastDot >= 500) {
                lastDot  = now;
                dotCount = (dotCount + 1) % 4;
                drawSearching();
            }
            break;

        case STATE_GPS_OK:
            drawGPSOk();
            if (now - stateTimer >= 1500) {
                fadeTransition();
                buildBackground();
                appState = STATE_RADAR;
            }
            break;

        case STATE_RADAR:
            updatePulsos();
            sweepAngle += 1.5f;
            if (sweepAngle >= 360.0f) sweepAngle -= 360.0f;
            drawRadar();
            break;
    }
}
