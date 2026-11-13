/**
 * Peripheral memory map definitions for STM32 microcontrollers (e.g., STM32F4 / Cortex-M4).
 */
export interface PeripheralBlock {
  readonly name: string;
  readonly baseAddress: number;
  readonly sizeBytes: number;
  readonly registers: Readonly<Record<string, number>>;
}

export const STM32F4_PERIPHERALS: Readonly<Record<string, PeripheralBlock>> = {
  GPIOA: {
    name: "GPIOA",
    baseAddress: 0x4002_0000,
    sizeBytes: 0x400,
    registers: {
      MODER: 0x00,
      OTYPER: 0x04,
      OSPEEDR: 0x08,
      PUPDR: 0x0c,
      IDR: 0x10,
      ODR: 0x14,
      BSRR: 0x18,
    },
  },
  USART1: {
    name: "USART1",
    baseAddress: 0x4001_1000,
    sizeBytes: 0x400,
    registers: {
      SR: 0x00,
      DR: 0x04,
      BRR: 0x08,
      CR1: 0x0c,
      CR2: 0x10,
      CR3: 0x14,
    },
  },
  NVIC: {
    name: "NVIC",
    baseAddress: 0xe000_e100,
    sizeBytes: 0x400,
    registers: {
      ISER0: 0x00,
      ICER0: 0x80,
      ISPR0: 0x100,
      ICPR0: 0x180,
      IPR0: 0x300,
    },
  },
};
