# Carcasa Radar — Especificaciones para diseño 3D

## Medidas finales

| | |
|---|---|
| Diámetro exterior | 83mm |
| Diámetro interior | 75mm |
| Grosor exterior total | 35mm |
| Pared lateral | 4mm |
| Tapa frontal | 2mm |
| Tapa trasera | 2mm |

## Componentes internos y disposición

| Componente | Huella | Grosor | Posición |
|---|---|---|---|
| Waveshare ESP32-S3-LCD-2.8C | ⌀71mm | 7mm | Frente |
| ESP32 38 pines (sin headers) | 55×28mm | 9.5mm | Centro |
| LoRa Ra-02 | 17×16mm | 3.2mm | Lateral ESP32 |
| NEO-M8N (sin antena) | 16×12mm | 4mm | Lateral ESP32 |
| DWM1000 | 23×13mm | 2.9mm | Lateral ESP32 |
| LiPo 2000mAh | 50×34mm | 10mm | Fondo |
| Antena FPC GPS | pegada en tapa trasera | 0mm | Tapa trasera |

## Stack de grosor (frente → fondo)

```
Tapa frontal (cristal)        2mm
Waveshare                     7mm
ESP32 + módulos               9.5mm
LiPo                         10mm
Tapa trasera                  2mm
Tolerancias + cableado        4mm
─────────────────────────────────
Total:                       ~34.5mm
```

## Aberturas necesarias

| Elemento | Tipo | Posición |
|---|---|---|
| Botón zoom (GPIO0) | Taladro + botón | Lateral superior |
| Puerto USB | Taladro | Lateral inferior |
| Antena LoRa 433MHz | Taladro cable o interna enrollada | Lateral |
| Antena FPC GPS | Zona plástico fino sin metal | Tapa trasera centrada |

## Notas de diseño

- La antena FPC GPS se pega en la tapa trasera con su adhesivo. El cable pasa por dentro hasta el conector IPEX del NEO-M8N. No poner metal ni tornillos metálicos en esa zona.
- La antena LoRa lambda/4 mide 16.4cm — valorar si sale por taladro lateral o va enrollada dentro.
- Interruptor de encendido: pendiente de decisión.
- No usar relleno metálico ni pintura conductora en la zona de la antena GPS.
