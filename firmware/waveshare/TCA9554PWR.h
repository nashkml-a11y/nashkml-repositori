// ============================================================
// STUB — TCA9554PWR.h
// Reemplazar por el original del SDK de Waveshare.
// Proporciona: TCA9554PWR_Init(), I2C_Write_EXIO()
// ============================================================
#pragma once
#include <stdint.h>

#define TCA9554_OUTPUT_REG 0x01

void TCA9554PWR_Init(uint8_t mode);
void I2C_Write_EXIO(uint8_t reg, uint8_t val);
