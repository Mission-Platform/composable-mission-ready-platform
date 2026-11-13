/**
 * ELF 64-bit Little-Endian Object File Synthesizer.
 */
export interface ElfSection {
  readonly name: string;
  readonly type: number; // SHT_PROGBITS = 1, SHT_SYMTAB = 2, SHT_STRTAB = 3
  readonly flags: number; // SHF_WRITE = 0x1, SHF_ALLOC = 0x2, SHF_EXECINSTR = 0x4
  readonly data: Uint8Array;
}

export function createElf64Header(machine: 0x3e | 0xb7): Uint8Array {
  // 0x3e = EM_X86_64, 0xb7 = EM_AARCH64
  const header = new Uint8Array(64);
  header[0] = 0x7f;
  header[1] = 0x45; // 'E'
  header[2] = 0x4c; // 'L'
  header[3] = 0x46; // 'F'
  header[4] = 2; // ELFCLASS64
  header[5] = 1; // ELFDATA2LSB (little endian)
  header[6] = 1; // EV_CURRENT
  header[7] = 0; // ELFOSABI_NONE

  // e_type = ET_REL (1)
  header[16] = 1;
  header[17] = 0;

  // e_machine
  header[18] = machine & 0xff;
  header[19] = (machine >> 8) & 0xff;

  // e_version = 1
  header[20] = 1;

  // e_ehsize = 64
  header[52] = 64;
  header[53] = 0;

  return header;
}
