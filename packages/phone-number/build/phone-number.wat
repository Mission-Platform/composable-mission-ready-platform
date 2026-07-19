(module
 (type $0 (func (param i32 i32) (result i32)))
 (type $1 (func (param i32) (result i32)))
 (type $2 (func (param i32 i32)))
 (type $3 (func (param i32 i32 i32) (result i32)))
 (type $4 (func))
 (type $5 (func (param i32)))
 (type $6 (func (param i32 i32 i32)))
 (type $7 (func (param i32 i32 i32 i32) (result i32)))
 (type $8 (func (result i32)))
 (type $9 (func (param i32 i32 i32 i32)))
 (type $10 (func (param i32 i32 i32 i32 i32 i32 i32 i32 i32) (result i32)))
 (type $11 (func (param i32 i32 i64)))
 (type $12 (func (param i32 i32 i32 i32 i32) (result i32)))
 (type $13 (func (param i32 i32 i32 i32 i32 i32) (result i32)))
 (import "env" "abort" (func $~lib/builtins/abort (param i32 i32 i32 i32)))
 (global $~lib/rt/itcms/total (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/threshold (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/state (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/visitCount (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/pinSpace (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/iter (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/toSpace (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/white (mut i32) (i32.const 0))
 (global $~lib/rt/itcms/fromSpace (mut i32) (i32.const 0))
 (global $~lib/rt/tlsf/ROOT (mut i32) (i32.const 0))
 (global $assembly/metadata/REGION_METADATA (mut i32) (i32.const 0))
 (global $assembly/metadata/CODE_TO_REGION (mut i32) (i32.const 0))
 (global $assembly/metadata/REGION_LIST (mut i32) (i32.const 0))
 (global $assembly/index/NumberType.FIXED_LINE i32 (i32.const 0))
 (global $assembly/index/NumberType.MOBILE i32 (i32.const 1))
 (global $assembly/index/NumberType.FIXED_LINE_OR_MOBILE i32 (i32.const 2))
 (global $assembly/index/NumberType.UNKNOWN i32 (i32.const -1))
 (global $assembly/index/PhoneNumberFormat.E164 i32 (i32.const 0))
 (global $assembly/index/PhoneNumberFormat.INTERNATIONAL i32 (i32.const 1))
 (global $assembly/index/PhoneNumberFormat.NATIONAL i32 (i32.const 2))
 (global $assembly/index/PhoneNumberFormat.RFC3966 i32 (i32.const 3))
 (global $~argumentsLength (mut i32) (i32.const 0))
 (global $~lib/rt/__rtti_base i32 (i32.const 5984))
 (global $~lib/memory/__stack_pointer (mut i32) (i32.const 38808))
 (memory $0 1)
 (data $0 (i32.const 1036) "<")
 (data $0.1 (i32.const 1048) "\02\00\00\00(\00\00\00A\00l\00l\00o\00c\00a\00t\00i\00o\00n\00 \00t\00o\00o\00 \00l\00a\00r\00g\00e")
 (data $1 (i32.const 1100) "<")
 (data $1.1 (i32.const 1112) "\02\00\00\00 \00\00\00~\00l\00i\00b\00/\00r\00t\00/\00i\00t\00c\00m\00s\00.\00t\00s")
 (data $4 (i32.const 1228) "<")
 (data $4.1 (i32.const 1240) "\02\00\00\00$\00\00\00I\00n\00d\00e\00x\00 \00o\00u\00t\00 \00o\00f\00 \00r\00a\00n\00g\00e")
 (data $5 (i32.const 1292) ",")
 (data $5.1 (i32.const 1304) "\02\00\00\00\14\00\00\00~\00l\00i\00b\00/\00r\00t\00.\00t\00s")
 (data $7 (i32.const 1372) "<")
 (data $7.1 (i32.const 1384) "\02\00\00\00\1e\00\00\00~\00l\00i\00b\00/\00r\00t\00/\00t\00l\00s\00f\00.\00t\00s")
 (data $8 (i32.const 1436) ",")
 (data $8.1 (i32.const 1448) "\02\00\00\00\1c\00\00\00I\00n\00v\00a\00l\00i\00d\00 \00l\00e\00n\00g\00t\00h")
 (data $9 (i32.const 1484) "<")
 (data $9.1 (i32.const 1496) "\02\00\00\00&\00\00\00~\00l\00i\00b\00/\00a\00r\00r\00a\00y\00b\00u\00f\00f\00e\00r\00.\00t\00s")
 (data $10 (i32.const 1548) ",")
 (data $10.1 (i32.const 1560) "\02\00\00\00\1a\00\00\00~\00l\00i\00b\00/\00a\00r\00r\00a\00y\00.\00t\00s")
 (data $11 (i32.const 1596) "\1c")
 (data $11.1 (i32.const 1608) "\02\00\00\00\04\00\00\00U\00S")
 (data $12 (i32.const 1628) "\1c")
 (data $12.1 (i32.const 1640) "\02\00\00\00\02\00\00\001")
 (data $13 (i32.const 1660) "\1c")
 (data $13.1 (i32.const 1672) "\01\00\00\00\04\00\00\00\n")
 (data $14 (i32.const 1692) "\1c")
 (data $14.1 (i32.const 1704) "\01")
 (data $15 (i32.const 1724) "\1c")
 (data $15.1 (i32.const 1736) "\01")
 (data $16 (i32.const 1756) "\1c")
 (data $16.1 (i32.const 1768) "\01\00\00\00\0c\00\00\00\03\00\00\00\03\00\00\00\04")
 (data $17 (i32.const 1788) "\1c")
 (data $17.1 (i32.const 1800) "\01\00\00\00\0c\00\00\00\03\00\00\00\03\00\00\00\04")
 (data $18 (i32.const 1820) ",")
 (data $18.1 (i32.const 1832) "\02\00\00\00\14\00\00\002\000\001\005\005\005\000\001\002\003")
 (data $19 (i32.const 1868) "\1c")
 (data $19.1 (i32.const 1880) "\02\00\00\00\04\00\00\00C\00A")
 (data $20 (i32.const 1900) "\1c")
 (data $20.1 (i32.const 1912) "\01\00\00\00\04\00\00\00\n")
 (data $21 (i32.const 1932) "\1c")
 (data $21.1 (i32.const 1944) "\01")
 (data $22 (i32.const 1964) "\1c")
 (data $22.1 (i32.const 1976) "\01")
 (data $23 (i32.const 1996) "\1c")
 (data $23.1 (i32.const 2008) "\01\00\00\00\0c\00\00\00\03\00\00\00\03\00\00\00\04")
 (data $24 (i32.const 2028) "\1c")
 (data $24.1 (i32.const 2040) "\01\00\00\00\0c\00\00\00\03\00\00\00\03\00\00\00\04")
 (data $25 (i32.const 2060) ",")
 (data $25.1 (i32.const 2072) "\02\00\00\00\14\00\00\005\000\006\002\003\004\005\006\007\008")
 (data $26 (i32.const 2108) "\1c")
 (data $26.1 (i32.const 2120) "\02\00\00\00\04\00\00\00G\00B")
 (data $27 (i32.const 2140) "\1c")
 (data $27.1 (i32.const 2152) "\02\00\00\00\02\00\00\000")
 (data $28 (i32.const 2172) "\1c")
 (data $28.1 (i32.const 2184) "\01\00\00\00\08\00\00\00\t\00\00\00\n")
 (data $29 (i32.const 2204) "\1c")
 (data $29.1 (i32.const 2216) "\02\00\00\00\02\00\00\007")
 (data $30 (i32.const 2236) "\1c")
 (data $30.1 (i32.const 2248) "\01\00\00\00\04\00\00\00\b0\08")
 (data $31 (i32.const 2268) "\1c")
 (data $31.1 (i32.const 2280) "\02\00\00\00\02\00\00\002")
 (data $32 (i32.const 2300) "\1c")
 (data $32.1 (i32.const 2312) "\02\00\00\00\02\00\00\003")
 (data $33 (i32.const 2332) "\1c")
 (data $33.1 (i32.const 2344) "\02\00\00\00\02\00\00\008")
 (data $34 (i32.const 2364) ",")
 (data $34.1 (i32.const 2376) "\01\00\00\00\10\00\00\00p\06\00\00\f0\08\00\00\10\t\00\000\t")
 (data $35 (i32.const 2412) "\1c")
 (data $35.1 (i32.const 2424) "\01\00\00\00\08\00\00\00\04\00\00\00\06")
 (data $36 (i32.const 2444) "\1c")
 (data $36.1 (i32.const 2456) "\01\00\00\00\08\00\00\00\04\00\00\00\06")
 (data $37 (i32.const 2476) ",")
 (data $37.1 (i32.const 2488) "\02\00\00\00\14\00\00\007\004\000\000\001\002\003\004\005\006")
 (data $38 (i32.const 2524) "\1c")
 (data $38.1 (i32.const 2536) "\02\00\00\00\04\00\00\00F\00R")
 (data $39 (i32.const 2556) "\1c")
 (data $39.1 (i32.const 2568) "\01\00\00\00\04\00\00\00\t")
 (data $40 (i32.const 2588) "\1c")
 (data $40.1 (i32.const 2600) "\02\00\00\00\02\00\00\006")
 (data $41 (i32.const 2620) "\1c")
 (data $41.1 (i32.const 2632) "\01\00\00\00\08\00\00\000\n\00\00\b0\08")
 (data $42 (i32.const 2652) "\1c")
 (data $42.1 (i32.const 2664) "\02\00\00\00\02\00\00\004")
 (data $43 (i32.const 2684) "\1c")
 (data $43.1 (i32.const 2696) "\02\00\00\00\02\00\00\005")
 (data $44 (i32.const 2716) "\1c")
 (data $44.1 (i32.const 2728) "\02\00\00\00\02\00\00\009")
 (data $45 (i32.const 2748) ",")
 (data $45.1 (i32.const 2760) "\01\00\00\00\1c\00\00\00p\06\00\00\f0\08\00\00\10\t\00\00p\n\00\00\90\n\00\000\t\00\00\b0\n")
 (data $46 (i32.const 2796) ",")
 (data $46.1 (i32.const 2808) "\01\00\00\00\14\00\00\00\01\00\00\00\02\00\00\00\02\00\00\00\02\00\00\00\02")
 (data $47 (i32.const 2844) ",")
 (data $47.1 (i32.const 2856) "\01\00\00\00\14\00\00\00\01\00\00\00\02\00\00\00\02\00\00\00\02\00\00\00\02")
 (data $48 (i32.const 2892) ",")
 (data $48.1 (i32.const 2904) "\02\00\00\00\12\00\00\006\001\002\003\004\005\006\007\008")
 (data $49 (i32.const 2940) "\1c")
 (data $49.1 (i32.const 2952) "\02\00\00\00\04\00\00\00D\00E")
 (data $50 (i32.const 2972) ",")
 (data $50.1 (i32.const 2984) "\01\00\00\00\14\00\00\00\07\00\00\00\08\00\00\00\t\00\00\00\n\00\00\00\0b")
 (data $51 (i32.const 3020) "\1c")
 (data $51.1 (i32.const 3032) "\02\00\00\00\04\00\00\001\005")
 (data $52 (i32.const 3052) "\1c")
 (data $52.1 (i32.const 3064) "\02\00\00\00\04\00\00\001\006")
 (data $53 (i32.const 3084) "\1c")
 (data $53.1 (i32.const 3096) "\02\00\00\00\04\00\00\001\007")
 (data $54 (i32.const 3116) "\1c")
 (data $54.1 (i32.const 3128) "\01\00\00\00\0c\00\00\00\e0\0b\00\00\00\0c\00\00 \0c")
 (data $55 (i32.const 3148) "\1c")
 (data $55.1 (i32.const 3160) "\01")
 (data $56 (i32.const 3180) "\1c")
 (data $56.1 (i32.const 3192) "\01\00\00\00\08\00\00\00\04\00\00\00\07")
 (data $57 (i32.const 3212) "\1c")
 (data $57.1 (i32.const 3224) "\01\00\00\00\08\00\00\00\04\00\00\00\07")
 (data $58 (i32.const 3244) ",")
 (data $58.1 (i32.const 3256) "\02\00\00\00\14\00\00\001\005\001\002\003\004\005\006\007\008")
 (data $59 (i32.const 3292) "\1c")
 (data $59.1 (i32.const 3304) "\02\00\00\00\04\00\00\00A\00U")
 (data $60 (i32.const 3324) "\1c")
 (data $60.1 (i32.const 3336) "\01\00\00\00\04\00\00\00\t")
 (data $61 (i32.const 3356) "\1c")
 (data $61.1 (i32.const 3368) "\01\00\00\00\04\00\00\00p\n")
 (data $62 (i32.const 3388) ",")
 (data $62.1 (i32.const 3400) "\01\00\00\00\10\00\00\00\f0\08\00\00\10\t\00\00\b0\08\00\000\t")
 (data $63 (i32.const 3436) "\1c")
 (data $63.1 (i32.const 3448) "\01\00\00\00\0c\00\00\00\01\00\00\00\04\00\00\00\04")
 (data $64 (i32.const 3468) "\1c")
 (data $64.1 (i32.const 3480) "\01\00\00\00\0c\00\00\00\01\00\00\00\04\00\00\00\04")
 (data $65 (i32.const 3500) ",")
 (data $65.1 (i32.const 3512) "\02\00\00\00\12\00\00\004\001\002\003\004\005\006\007\008")
 (data $66 (i32.const 3548) "\1c")
 (data $66.1 (i32.const 3560) "\02\00\00\00\04\00\00\00I\00N")
 (data $67 (i32.const 3580) "\1c")
 (data $67.1 (i32.const 3592) "\01\00\00\00\04\00\00\00\n")
 (data $68 (i32.const 3612) ",")
 (data $68.1 (i32.const 3624) "\01\00\00\00\10\00\00\000\n\00\00\b0\08\00\000\t\00\00\b0\n")
 (data $69 (i32.const 3660) ",")
 (data $69.1 (i32.const 3672) "\01\00\00\00\14\00\00\00p\06\00\00\f0\08\00\00\10\t\00\00p\n\00\00\90\n")
 (data $70 (i32.const 3708) "\1c")
 (data $70.1 (i32.const 3720) "\01\00\00\00\08\00\00\00\05\00\00\00\05")
 (data $71 (i32.const 3740) "\1c")
 (data $71.1 (i32.const 3752) "\01\00\00\00\08\00\00\00\05\00\00\00\05")
 (data $72 (i32.const 3772) ",")
 (data $72.1 (i32.const 3784) "\02\00\00\00\14\00\00\008\001\002\003\004\005\006\007\008\009")
 (data $73 (i32.const 3820) "\1c")
 (data $73.1 (i32.const 3832) "\02\00\00\00\04\00\00\00J\00P")
 (data $74 (i32.const 3852) "\1c")
 (data $74.1 (i32.const 3864) "\01\00\00\00\08\00\00\00\t\00\00\00\n")
 (data $75 (i32.const 3884) "\1c")
 (data $75.1 (i32.const 3896) "\02\00\00\00\04\00\00\007\000")
 (data $76 (i32.const 3916) "\1c")
 (data $76.1 (i32.const 3928) "\02\00\00\00\04\00\00\008\000")
 (data $77 (i32.const 3948) "\1c")
 (data $77.1 (i32.const 3960) "\02\00\00\00\04\00\00\009\000")
 (data $78 (i32.const 3980) "\1c")
 (data $78.1 (i32.const 3992) "\01\00\00\00\0c\00\00\00@\0f\00\00`\0f\00\00\80\0f")
 (data $79 (i32.const 4012) "\1c")
 (data $79.1 (i32.const 4024) "\01\00\00\00\08\00\00\00\10\t\00\000\n")
 (data $80 (i32.const 4044) "\1c")
 (data $80.1 (i32.const 4056) "\01\00\00\00\0c\00\00\00\02\00\00\00\04\00\00\00\04")
 (data $81 (i32.const 4076) "\1c")
 (data $81.1 (i32.const 4088) "\01\00\00\00\0c\00\00\00\02\00\00\00\04\00\00\00\04")
 (data $82 (i32.const 4108) ",")
 (data $82.1 (i32.const 4120) "\02\00\00\00\14\00\00\009\000\001\002\003\004\005\006\007\008")
 (data $83 (i32.const 4156) "\1c")
 (data $83.1 (i32.const 4168) "\02\00\00\00\04\00\00\00B\00R")
 (data $84 (i32.const 4188) "\1c")
 (data $84.1 (i32.const 4200) "\01\00\00\00\08\00\00\00\n\00\00\00\0b")
 (data $85 (i32.const 4220) ",")
 (data $85.1 (i32.const 4232) "\01\00\00\00\10\00\00\000\n\00\00\b0\08\00\000\t\00\00\b0\n")
 (data $86 (i32.const 4268) ",")
 (data $86.1 (i32.const 4280) "\01\00\00\00\10\00\00\00\f0\08\00\00\10\t\00\00p\n\00\00\90\n")
 (data $87 (i32.const 4316) "\1c")
 (data $87.1 (i32.const 4328) "\01\00\00\00\0c\00\00\00\02\00\00\00\05\00\00\00\04")
 (data $88 (i32.const 4348) "\1c")
 (data $88.1 (i32.const 4360) "\01\00\00\00\0c\00\00\00\02\00\00\00\05\00\00\00\04")
 (data $89 (i32.const 4380) ",")
 (data $89.1 (i32.const 4392) "\02\00\00\00\14\00\00\001\001\002\003\004\005\006\007\008\009")
 (data $90 (i32.const 4428) "\1c")
 (data $90.1 (i32.const 4440) "\02\00\00\00\04\00\00\00C\00N")
 (data $91 (i32.const 4460) "\1c")
 (data $91.1 (i32.const 4472) "\01\00\00\00\04\00\00\00\0b")
 (data $92 (i32.const 4492) "\1c")
 (data $92.1 (i32.const 4504) "\01\00\00\00\04\00\00\00p\06")
 (data $93 (i32.const 4524) "\1c")
 (data $93.1 (i32.const 4536) "\01")
 (data $94 (i32.const 4556) "\1c")
 (data $94.1 (i32.const 4568) "\01\00\00\00\0c\00\00\00\03\00\00\00\04\00\00\00\04")
 (data $95 (i32.const 4588) "\1c")
 (data $95.1 (i32.const 4600) "\01\00\00\00\0c\00\00\00\03\00\00\00\04\00\00\00\04")
 (data $96 (i32.const 4620) ",")
 (data $96.1 (i32.const 4632) "\02\00\00\00\16\00\00\001\003\001\002\003\004\005\006\007\008\009")
 (data $97 (i32.const 4668) "\1c")
 (data $97.1 (i32.const 4680) "\02\00\00\00\04\00\00\00R\00U")
 (data $98 (i32.const 4700) "\1c")
 (data $98.1 (i32.const 4712) "\01\00\00\00\04\00\00\00\n")
 (data $99 (i32.const 4732) "\1c")
 (data $99.1 (i32.const 4744) "\01\00\00\00\04\00\00\00\b0\n")
 (data $100 (i32.const 4764) "\1c")
 (data $100.1 (i32.const 4776) "\01\00\00\00\0c\00\00\00\10\t\00\00p\n\00\000\t")
 (data $101 (i32.const 4796) ",")
 (data $101.1 (i32.const 4808) "\01\00\00\00\10\00\00\00\03\00\00\00\03\00\00\00\02\00\00\00\02")
 (data $102 (i32.const 4844) ",")
 (data $102.1 (i32.const 4856) "\01\00\00\00\10\00\00\00\03\00\00\00\03\00\00\00\02\00\00\00\02")
 (data $103 (i32.const 4892) ",")
 (data $103.1 (i32.const 4904) "\02\00\00\00\14\00\00\009\001\002\003\004\005\006\007\008\009")
 (data $104 (i32.const 4940) "<")
 (data $104.1 (i32.const 4952) "\02\00\00\00$\00\00\00K\00e\00y\00 \00d\00o\00e\00s\00 \00n\00o\00t\00 \00e\00x\00i\00s\00t")
 (data $105 (i32.const 5004) ",")
 (data $105.1 (i32.const 5016) "\02\00\00\00\16\00\00\00~\00l\00i\00b\00/\00m\00a\00p\00.\00t\00s")
 (data $106 (i32.const 5052) "\1c")
 (data $106.1 (i32.const 5064) "\02")
 (data $107 (i32.const 5084) "\1c")
 (data $107.1 (i32.const 5096) "\02\00\00\00\06\00\00\000\001\001")
 (data $108 (i32.const 5116) "\1c")
 (data $108.1 (i32.const 5128) "\02\00\00\00\04\00\00\000\000")
 (data $109 (i32.const 5148) "|")
 (data $109.1 (i32.const 5160) "\02\00\00\00d\00\00\00t\00o\00S\00t\00r\00i\00n\00g\00(\00)\00 \00r\00a\00d\00i\00x\00 \00a\00r\00g\00u\00m\00e\00n\00t\00 \00m\00u\00s\00t\00 \00b\00e\00 \00b\00e\00t\00w\00e\00e\00n\00 \002\00 \00a\00n\00d\00 \003\006")
 (data $110 (i32.const 5276) "<")
 (data $110.1 (i32.const 5288) "\02\00\00\00&\00\00\00~\00l\00i\00b\00/\00u\00t\00i\00l\00/\00n\00u\00m\00b\00e\00r\00.\00t\00s")
 (data $111 (i32.const 5340) "\\")
 (data $111.1 (i32.const 5352) "\02\00\00\00H\00\00\000\001\002\003\004\005\006\007\008\009\00a\00b\00c\00d\00e\00f\00g\00h\00i\00j\00k\00l\00m\00n\00o\00p\00q\00r\00s\00t\00u\00v\00w\00x\00y\00z")
 (data $112 (i32.const 5436) "|")
 (data $112.1 (i32.const 5448) "\02\00\00\00^\00\00\00E\00l\00e\00m\00e\00n\00t\00 \00t\00y\00p\00e\00 \00m\00u\00s\00t\00 \00b\00e\00 \00n\00u\00l\00l\00a\00b\00l\00e\00 \00i\00f\00 \00a\00r\00r\00a\00y\00 \00i\00s\00 \00h\00o\00l\00e\00y")
 (data $113 (i32.const 5564) "\1c")
 (data $113.1 (i32.const 5576) "\02\00\00\00\02\00\00\00,")
 (data $114 (i32.const 5596) "\1c")
 (data $114.1 (i32.const 5608) "\02\00\00\00\02\00\00\00+")
 (data $115 (i32.const 5628) "\1c")
 (data $115.1 (i32.const 5640) "\02\00\00\00\08\00\00\00t\00e\00l\00:")
 (data $116 (i32.const 5660) "\1c")
 (data $116.1 (i32.const 5672) "\02\00\00\00\02\00\00\00 ")
 (data $117 (i32.const 5692) "\1c")
 (data $117.1 (i32.const 5704) "\02\00\00\00\02\00\00\00(")
 (data $118 (i32.const 5724) "\1c")
 (data $118.1 (i32.const 5736) "\02\00\00\00\04\00\00\00)\00 ")
 (data $119 (i32.const 5756) "\1c")
 (data $119.1 (i32.const 5768) "\02\00\00\00\02\00\00\00-")
 (data $120 (i32.const 5788) "<")
 (data $120.1 (i32.const 5800) "\02\00\00\00$\00\00\00~\00l\00i\00b\00/\00t\00y\00p\00e\00d\00a\00r\00r\00a\00y\00.\00t\00s")
 (data $121 (i32.const 5852) "<")
 (data $121.1 (i32.const 5864) "\02\00\00\00*\00\00\00O\00b\00j\00e\00c\00t\00 \00a\00l\00r\00e\00a\00d\00y\00 \00p\00i\00n\00n\00e\00d")
 (data $122 (i32.const 5916) "<")
 (data $122.1 (i32.const 5928) "\02\00\00\00(\00\00\00O\00b\00j\00e\00c\00t\00 \00i\00s\00 \00n\00o\00t\00 \00p\00i\00n\00n\00e\00d")
 (data $123 (i32.const 5984) "\r\00\00\00 \00\00\00 \00\00\00 ")
 (data $123.1 (i32.const 6008) "\02\t\00\00\02A\00\00\10A\82\00\10A\12\00\00\00\00\00\01\t")
 (export "NumberType.FIXED_LINE" (global $assembly/index/NumberType.FIXED_LINE))
 (export "NumberType.MOBILE" (global $assembly/index/NumberType.MOBILE))
 (export "NumberType.FIXED_LINE_OR_MOBILE" (global $assembly/index/NumberType.FIXED_LINE_OR_MOBILE))
 (export "NumberType.UNKNOWN" (global $assembly/index/NumberType.UNKNOWN))
 (export "PhoneNumberFormat.E164" (global $assembly/index/PhoneNumberFormat.E164))
 (export "PhoneNumberFormat.INTERNATIONAL" (global $assembly/index/PhoneNumberFormat.INTERNATIONAL))
 (export "PhoneNumberFormat.NATIONAL" (global $assembly/index/PhoneNumberFormat.NATIONAL))
 (export "PhoneNumberFormat.RFC3966" (global $assembly/index/PhoneNumberFormat.RFC3966))
 (export "getRegionCodeForCountryCode" (func $assembly/index/getRegionCodeForCountryCode))
 (export "getSupportedRegions" (func $assembly/index/getSupportedRegions))
 (export "__new" (func $~lib/rt/itcms/__new))
 (export "__pin" (func $~lib/rt/itcms/__pin))
 (export "__unpin" (func $~lib/rt/itcms/__unpin))
 (export "__collect" (func $~lib/rt/itcms/__collect))
 (export "__rtti_base" (global $~lib/rt/__rtti_base))
 (export "memory" (memory $0))
 (export "getCountryCodeForRegion" (func $export:assembly/index/getCountryCodeForRegion))
 (export "getRegionCodeForNumber" (func $export:assembly/index/getRegionCodeForNumber))
 (export "getNationalSignificantNumber" (func $export:assembly/index/getNationalSignificantNumber))
 (export "isPossibleNumber" (func $export:assembly/index/isPossibleNumber))
 (export "isValidNumber" (func $export:assembly/index/isValidNumber))
 (export "isValidNumberForRegion" (func $export:assembly/index/isValidNumberForRegion))
 (export "getExampleNumber" (func $export:assembly/index/getExampleNumber))
 (export "getNumberType" (func $export:assembly/index/getNumberType))
 (export "format" (func $export:assembly/index/format))
 (export "formatAsYouType" (func $export:assembly/index/formatAsYouType))
 (export "reTest" (func $export:assembly/regex/reTest))
 (export "reCaptures" (func $export:assembly/regex/reCaptures))
 (start $~start)
 (func $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 6040
  i32.lt_s
  if
   i32.const 38832
   i32.const 38880
   i32.const 1
   i32.const 1
   call $~lib/builtins/abort
   unreachable
  end
 )
 (func $~lib/rt/__newArray (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.const 2
  i32.shl
  local.tee $4
  i32.const 1
  call $~lib/rt/itcms/__new
  local.set $3
  local.get $2
  if
   local.get $3
   local.get $2
   local.get $4
   memory.copy
  end
  local.get $3
  i32.store
  i32.const 16
  local.get $1
  call $~lib/rt/itcms/__new
  local.tee $1
  local.get $3
  i32.store
  local.get $1
  local.get $3
  i32.const 0
  call $~lib/rt/itcms/__link
  local.get $1
  local.get $3
  i32.store offset=4
  local.get $1
  local.get $4
  i32.store offset=8
  local.get $1
  local.get $0
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $1
 )
 (func $~lib/string/String.__concat (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  local.tee $2
  i32.store
  local.get $0
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.const -2
  i32.and
  local.set $3
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store
  block $__inlined_func$~lib/string/String#concat$188
   local.get $1
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const -2
   i32.and
   local.tee $4
   local.get $3
   i32.add
   local.tee $0
   i32.eqz
   if
    i32.const 5072
    local.set $0
    br $__inlined_func$~lib/string/String#concat$188
   end
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.const 2
   call $~lib/rt/itcms/__new
   local.tee $0
   i32.store offset=4
   local.get $0
   local.get $2
   local.get $3
   memory.copy
   local.get $0
   local.get $3
   i32.add
   local.get $1
   local.get $4
   memory.copy
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
 )
 (func $~lib/rt/itcms/__visit (param $0 i32)
  local.get $0
  i32.eqz
  if
   return
  end
  global.get $~lib/rt/itcms/white
  local.get $0
  i32.const 20
  i32.sub
  local.tee $0
  i32.load offset=4
  i32.const 3
  i32.and
  i32.eq
  if
   local.get $0
   call $~lib/rt/itcms/Object#makeGray
   global.get $~lib/rt/itcms/visitCount
   i32.const 1
   i32.add
   global.set $~lib/rt/itcms/visitCount
  end
 )
 (func $~lib/rt/itcms/__new (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  local.get $0
  i32.const 1073741804
  i32.ge_u
  if
   i32.const 1056
   i32.const 1120
   i32.const 261
   i32.const 31
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/rt/itcms/total
  global.get $~lib/rt/itcms/threshold
  i32.ge_u
  if
   block $__inlined_func$~lib/rt/itcms/interrupt$68
    i32.const 2048
    local.set $2
    loop $do-loop|0
     local.get $2
     call $~lib/rt/itcms/step
     i32.sub
     local.set $2
     global.get $~lib/rt/itcms/state
     i32.eqz
     if
      global.get $~lib/rt/itcms/total
      i32.const 1
      i32.shl
      i32.const 1024
      i32.add
      global.set $~lib/rt/itcms/threshold
      br $__inlined_func$~lib/rt/itcms/interrupt$68
     end
     local.get $2
     i32.const 0
     i32.gt_s
     br_if $do-loop|0
    end
    global.get $~lib/rt/itcms/total
    global.get $~lib/rt/itcms/total
    global.get $~lib/rt/itcms/threshold
    i32.sub
    i32.const 1024
    i32.lt_u
    i32.const 10
    i32.shl
    i32.add
    global.set $~lib/rt/itcms/threshold
   end
  end
  global.get $~lib/rt/tlsf/ROOT
  i32.eqz
  if
   call $~lib/rt/tlsf/initialize
  end
  global.get $~lib/rt/tlsf/ROOT
  local.get $0
  i32.const 16
  i32.add
  call $~lib/rt/tlsf/allocateBlock
  local.tee $2
  local.get $1
  i32.store offset=12
  local.get $2
  local.get $0
  i32.store offset=16
  local.get $2
  global.get $~lib/rt/itcms/fromSpace
  global.get $~lib/rt/itcms/white
  call $~lib/rt/itcms/Object#linkTo
  global.get $~lib/rt/itcms/total
  local.get $2
  i32.load
  i32.const -4
  i32.and
  i32.const 4
  i32.add
  i32.add
  global.set $~lib/rt/itcms/total
  local.get $2
  i32.const 20
  i32.add
  local.tee $1
  i32.const 0
  local.get $0
  memory.fill
  local.get $1
 )
 (func $~lib/rt/itcms/__link (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  local.get $1
  i32.eqz
  if
   return
  end
  local.get $0
  i32.eqz
  if
   i32.const 0
   i32.const 1120
   i32.const 295
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/rt/itcms/white
  local.get $1
  i32.const 20
  i32.sub
  local.tee $1
  i32.load offset=4
  i32.const 3
  i32.and
  i32.eq
  if
   local.get $0
   i32.const 20
   i32.sub
   local.tee $0
   i32.load offset=4
   i32.const 3
   i32.and
   local.tee $3
   global.get $~lib/rt/itcms/white
   i32.eqz
   i32.eq
   if
    local.get $0
    local.get $1
    local.get $2
    select
    call $~lib/rt/itcms/Object#makeGray
   else
    global.get $~lib/rt/itcms/state
    i32.const 1
    i32.eq
    local.get $3
    i32.const 3
    i32.eq
    i32.and
    if
     local.get $1
     call $~lib/rt/itcms/Object#makeGray
    end
   end
  end
 )
 (func $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:buckets" (param $0 i32) (param $1 i32)
  local.get $0
  local.get $1
  i32.store
  local.get $0
  local.get $1
  i32.const 0
  call $~lib/rt/itcms/__link
 )
 (func $~lib/string/String#substring (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  (local $3 i32)
  (local $4 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $1
  i32.const 0
  local.get $1
  i32.const 0
  i32.gt_s
  select
  local.tee $3
  local.get $0
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.const 1
  i32.shr_u
  local.tee $1
  local.get $1
  local.get $3
  i32.gt_s
  select
  local.tee $3
  local.get $2
  i32.const 0
  local.get $2
  i32.const 0
  i32.gt_s
  select
  local.tee $2
  local.get $1
  local.get $1
  local.get $2
  i32.gt_s
  select
  local.tee $2
  local.get $2
  local.get $3
  i32.gt_s
  select
  i32.const 1
  i32.shl
  local.set $4
  block $folding-inner0
   local.get $3
   local.get $2
   local.get $2
   local.get $3
   i32.lt_s
   select
   i32.const 1
   i32.shl
   local.tee $2
   local.get $4
   i32.sub
   local.tee $3
   i32.eqz
   if
    i32.const 5072
    local.set $0
    br $folding-inner0
   end
   local.get $4
   i32.eqz
   local.get $2
   local.get $1
   i32.const 1
   i32.shl
   i32.eq
   i32.and
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.const 2
   call $~lib/rt/itcms/__new
   local.tee $1
   i32.store offset=4
   local.get $1
   local.get $0
   local.get $4
   i32.add
   local.get $3
   memory.copy
   local.get $1
   local.set $0
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
 )
 (func $assembly/metadata/register (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store offset=8
  global.get $~lib/memory/__stack_pointer
  global.get $assembly/metadata/REGION_METADATA
  local.tee $2
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.load
  local.tee $3
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=8
  local.get $2
  local.get $3
  local.get $0
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set"
  global.get $~lib/memory/__stack_pointer
  global.get $assembly/metadata/REGION_LIST
  local.tee $2
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.load
  local.tee $4
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.store
  local.get $2
  local.get $2
  i32.load offset=12
  local.tee $5
  i32.const 1
  i32.add
  local.tee $3
  call $~lib/array/ensureCapacity
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.store
  local.get $2
  i32.load offset=4
  local.get $5
  i32.const 2
  i32.shl
  i32.add
  local.get $4
  i32.store
  local.get $2
  local.get $4
  i32.const 1
  call $~lib/rt/itcms/__link
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.store
  local.get $2
  local.get $3
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $1
  if
   global.get $~lib/memory/__stack_pointer
   global.get $assembly/metadata/CODE_TO_REGION
   local.tee $1
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=8
   local.get $0
   i32.load offset=4
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=8
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.load
   local.tee $0
   i32.store offset=4
   local.get $1
   local.get $2
   local.get $0
   call $"~lib/map/Map<i32,~lib/string/String>#set"
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $assembly/metadata/PhoneMetadata#constructor (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32) (param $5 i32) (param $6 i32) (param $7 i32) (param $8 i32) (result i32)
  (local $9 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  i32.const 36
  i32.const 4
  call $~lib/rt/itcms/__new
  local.tee $9
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $9
  i32.store offset=4
  local.get $9
  i32.const 0
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:buckets"
  global.get $~lib/memory/__stack_pointer
  local.get $9
  i32.store offset=4
  local.get $9
  i32.const 0
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $9
  i32.store offset=4
  local.get $9
  i32.const 0
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:entries"
  global.get $~lib/memory/__stack_pointer
  local.get $9
  i32.store offset=4
  local.get $9
  i32.const 0
  call $assembly/metadata/PhoneMetadata#set:possibleLengths
  global.get $~lib/memory/__stack_pointer
  local.get $9
  i32.store offset=4
  local.get $9
  i32.const 0
  call $assembly/metadata/PhoneMetadata#set:mobileLeading
  global.get $~lib/memory/__stack_pointer
  local.get $9
  i32.store offset=4
  local.get $9
  i32.const 0
  call $assembly/metadata/PhoneMetadata#set:fixedLeading
  global.get $~lib/memory/__stack_pointer
  local.get $9
  i32.store offset=4
  local.get $9
  i32.const 0
  call $assembly/metadata/PhoneMetadata#set:nationalFormatGroups
  global.get $~lib/memory/__stack_pointer
  local.get $9
  i32.store offset=4
  local.get $9
  i32.const 0
  call $assembly/metadata/PhoneMetadata#set:internationalGroups
  global.get $~lib/memory/__stack_pointer
  local.get $9
  i32.store offset=4
  local.get $9
  i32.const 0
  call $assembly/metadata/PhoneMetadata#set:exampleNsn
  global.get $~lib/memory/__stack_pointer
  local.get $9
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=8
  local.get $9
  local.get $0
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:buckets"
  global.get $~lib/memory/__stack_pointer
  local.get $9
  i32.store offset=4
  local.get $9
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $9
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.store offset=8
  local.get $9
  local.get $2
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:entries"
  global.get $~lib/memory/__stack_pointer
  local.get $9
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=8
  local.get $9
  local.get $3
  call $assembly/metadata/PhoneMetadata#set:possibleLengths
  global.get $~lib/memory/__stack_pointer
  local.get $9
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=8
  local.get $9
  local.get $4
  call $assembly/metadata/PhoneMetadata#set:mobileLeading
  global.get $~lib/memory/__stack_pointer
  local.get $9
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $5
  i32.store offset=8
  local.get $9
  local.get $5
  call $assembly/metadata/PhoneMetadata#set:fixedLeading
  global.get $~lib/memory/__stack_pointer
  local.get $9
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $6
  i32.store offset=8
  local.get $9
  local.get $6
  call $assembly/metadata/PhoneMetadata#set:nationalFormatGroups
  global.get $~lib/memory/__stack_pointer
  local.get $9
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $7
  i32.store offset=8
  local.get $9
  local.get $7
  call $assembly/metadata/PhoneMetadata#set:internationalGroups
  global.get $~lib/memory/__stack_pointer
  local.get $9
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $8
  i32.store offset=8
  local.get $9
  local.get $8
  call $assembly/metadata/PhoneMetadata#set:exampleNsn
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $9
 )
 (func $~lib/string/String#substring@varargs (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  block $1of1
   block $0of1
    block $outOfRange
     global.get $~argumentsLength
     i32.const 1
     i32.sub
     br_table $0of1 $1of1 $outOfRange
    end
    unreachable
   end
   i32.const 2147483647
   local.set $2
  end
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  local.get $1
  local.get $2
  call $~lib/string/String#substring
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:entries" (param $0 i32) (param $1 i32)
  local.get $0
  local.get $1
  i32.store offset=8
  local.get $0
  local.get $1
  i32.const 0
  call $~lib/rt/itcms/__link
 )
 (func $~lib/typedarray/Int32Array#__get (param $0 i32) (param $1 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $1
  local.get $0
  i32.load offset=8
  i32.const 2
  i32.shr_u
  i32.ge_u
  if
   i32.const 1248
   i32.const 5808
   i32.const 736
   i32.const 64
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const 2
  i32.shl
  i32.add
  i32.load
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $~lib/arraybuffer/ArrayBuffer#constructor (param $0 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  local.get $0
  i32.const 1073741820
  i32.gt_u
  if
   i32.const 1456
   i32.const 1504
   i32.const 52
   i32.const 43
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.const 1
  call $~lib/rt/itcms/__new
  local.tee $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
 )
 (func $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#get" (param $0 i32) (param $1 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  local.get $0
  local.get $1
  local.get $1
  call $~lib/util/hash/HASH<~lib/string/String>
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#find"
  local.tee $0
  i32.eqz
  if
   i32.const 4960
   i32.const 5024
   i32.const 105
   i32.const 17
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.load offset=4
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $~lib/string/String#startsWith (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.const 1
  i32.shr_u
  i32.const 0
  local.set $2
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store
  local.get $2
  local.get $1
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.const 1
  i32.shr_u
  local.tee $3
  i32.add
  i32.lt_s
  if (result i32)
   i32.const 0
  else
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $0
   local.get $2
   local.get $1
   local.get $3
   call $~lib/util/string/compareImpl
   i32.eqz
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $~lib/array/Array<i32>#get:length (param $0 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.load offset=12
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $assembly/index/parse (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 36
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.const 36
  memory.fill
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  block $folding-inner1 (result i32)
   block $folding-inner0
    local.get $0
    i32.const 20
    i32.sub
    i32.load offset=16
    i32.const 1
    i32.shr_u
    i32.eqz
    br_if $folding-inner0
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $0
    call $assembly/index/digitsOnly
    local.tee $2
    i32.store offset=4
    global.get $~lib/memory/__stack_pointer
    local.get $2
    i32.store
    local.get $2
    i32.const 20
    i32.sub
    i32.load offset=16
    i32.const 1
    i32.shr_u
    i32.eqz
    br_if $folding-inner0
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store
    local.get $0
    call $assembly/index/hasPlusPrefix
    local.set $0
    local.get $2
    local.set $3
    global.get $~lib/memory/__stack_pointer
    local.get $2
    i32.store offset=8
    local.get $0
    if (result i32)
     local.get $0
    else
     global.get $~lib/memory/__stack_pointer
     local.get $2
     i32.store
     local.get $2
     i32.const 5104
     call $~lib/string/String#startsWith
     if (result i32)
      global.get $~lib/memory/__stack_pointer
      local.get $2
      i32.store
      i32.const 1
      global.set $~argumentsLength
      global.get $~lib/memory/__stack_pointer
      local.get $2
      i32.const 3
      call $~lib/string/String#substring@varargs
      local.tee $3
      i32.store offset=8
      i32.const 1
     else
      global.get $~lib/memory/__stack_pointer
      local.get $2
      i32.store
      local.get $2
      i32.const 5136
      call $~lib/string/String#startsWith
      if (result i32)
       global.get $~lib/memory/__stack_pointer
       local.get $2
       i32.store
       i32.const 1
       global.set $~argumentsLength
       global.get $~lib/memory/__stack_pointer
       local.get $2
       i32.const 2
       call $~lib/string/String#substring@varargs
       local.tee $3
       i32.store offset=8
       i32.const 1
      else
       local.get $0
      end
     end
    end
    if
     global.get $~lib/memory/__stack_pointer
     local.get $3
     i32.store
     global.get $~lib/memory/__stack_pointer
     i32.const 8
     i32.sub
     global.set $~lib/memory/__stack_pointer
     call $~stack_check
     global.get $~lib/memory/__stack_pointer
     i64.const 0
     i64.store
     i32.const 3
     local.set $1
     block $folding-inner00
      loop $for-loop|0
       local.get $1
       i32.const 0
       i32.gt_s
       if
        global.get $~lib/memory/__stack_pointer
        local.get $3
        i32.store
        local.get $1
        local.get $3
        i32.const 20
        i32.sub
        i32.load offset=16
        i32.const 1
        i32.shr_u
        i32.lt_s
        if
         global.get $~lib/memory/__stack_pointer
         local.get $3
         i32.store offset=4
         local.get $3
         i32.const 0
         local.get $1
         call $~lib/string/String#substring
         local.set $0
         global.get $~lib/memory/__stack_pointer
         local.get $0
         i32.store
         global.get $~lib/memory/__stack_pointer
         i32.const 4
         i32.sub
         global.set $~lib/memory/__stack_pointer
         call $~stack_check
         global.get $~lib/memory/__stack_pointer
         i32.const 0
         i32.store
         global.get $~lib/memory/__stack_pointer
         local.get $0
         i32.store
         local.get $0
         call $~lib/util/string/strtol<i32>
         local.set $0
         global.get $~lib/memory/__stack_pointer
         i32.const 4
         i32.add
         global.set $~lib/memory/__stack_pointer
         global.get $~lib/memory/__stack_pointer
         global.get $assembly/metadata/CODE_TO_REGION
         local.tee $2
         i32.store
         local.get $2
         local.get $0
         call $"~lib/map/Map<i32,~lib/string/String>#has"
         br_if $folding-inner00
        end
        local.get $1
        i32.const 1
        i32.sub
        local.set $1
        br $for-loop|0
       end
      end
      i32.const 0
      local.set $0
     end
     global.get $~lib/memory/__stack_pointer
     i32.const 8
     i32.add
     global.set $~lib/memory/__stack_pointer
     local.get $0
     i32.eqz
     br_if $folding-inner0
     global.get $~lib/memory/__stack_pointer
     global.get $assembly/metadata/CODE_TO_REGION
     local.tee $1
     i32.store
     global.get $~lib/memory/__stack_pointer
     local.get $1
     local.get $0
     call $"~lib/map/Map<i32,~lib/string/String>#get"
     local.tee $2
     i32.store offset=12
     local.get $0
     call $~lib/util/number/itoa32
     local.set $1
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.store
     local.get $1
     i32.const 20
     i32.sub
     i32.load offset=16
     i32.const 1
     i32.shr_u
     local.set $1
     global.get $~lib/memory/__stack_pointer
     local.get $3
     i32.store
     i32.const 1
     global.set $~argumentsLength
     global.get $~lib/memory/__stack_pointer
     local.get $3
     local.get $1
     call $~lib/string/String#substring@varargs
     local.tee $1
     i32.store offset=16
     global.get $~lib/memory/__stack_pointer
     local.get $2
     i32.store
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.store offset=20
     i32.const 1
     local.get $0
     local.get $2
     local.get $1
     call $assembly/index/ParseResult#constructor
     br $folding-inner1
    end
    global.get $~lib/memory/__stack_pointer
    global.get $assembly/metadata/REGION_METADATA
    local.tee $0
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store offset=20
    local.get $0
    local.get $1
    call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#has"
    i32.eqz
    br_if $folding-inner0
    global.get $~lib/memory/__stack_pointer
    global.get $assembly/metadata/REGION_METADATA
    local.tee $0
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store offset=20
    global.get $~lib/memory/__stack_pointer
    local.get $0
    local.get $1
    call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#get"
    local.tee $0
    i32.store offset=24
    global.get $~lib/memory/__stack_pointer
    local.get $2
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=20
    global.get $~lib/memory/__stack_pointer
    local.get $2
    local.get $0
    call $assembly/index/stripNationalPrefix
    local.tee $2
    i32.store offset=28
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=32
    local.get $0
    i32.load offset=4
    local.set $1
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=32
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.load
    local.tee $0
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $2
    i32.store offset=20
    i32.const 1
    local.get $1
    local.get $0
    local.get $2
    call $assembly/index/ParseResult#constructor
    br $folding-inner1
   end
   i32.const 0
   i32.const 0
   i32.const 5072
   i32.const 5072
   call $assembly/index/ParseResult#constructor
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 36
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $~lib/util/hash/HASH<~lib/string/String> (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  if (result i32)
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=4
   local.get $0
   local.tee $1
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const -2
   i32.and
   local.tee $3
   i32.const 16
   i32.ge_u
   if (result i32)
    i32.const 606290984
    local.set $2
    i32.const -2048144777
    local.set $4
    i32.const 1640531535
    local.set $5
    local.get $1
    local.get $3
    i32.add
    i32.const 16
    i32.sub
    local.set $7
    loop $while-continue|0
     local.get $1
     local.get $7
     i32.le_u
     if
      local.get $2
      local.get $1
      i32.load
      i32.const -2048144777
      i32.mul
      i32.add
      i32.const 13
      i32.rotl
      i32.const -1640531535
      i32.mul
      local.set $2
      local.get $4
      local.get $1
      i32.load offset=4
      i32.const -2048144777
      i32.mul
      i32.add
      i32.const 13
      i32.rotl
      i32.const -1640531535
      i32.mul
      local.set $4
      local.get $6
      local.get $1
      i32.load offset=8
      i32.const -2048144777
      i32.mul
      i32.add
      i32.const 13
      i32.rotl
      i32.const -1640531535
      i32.mul
      local.set $6
      local.get $5
      local.get $1
      i32.load offset=12
      i32.const -2048144777
      i32.mul
      i32.add
      i32.const 13
      i32.rotl
      i32.const -1640531535
      i32.mul
      local.set $5
      local.get $1
      i32.const 16
      i32.add
      local.set $1
      br $while-continue|0
     end
    end
    local.get $3
    local.get $2
    i32.const 1
    i32.rotl
    local.get $4
    i32.const 7
    i32.rotl
    i32.add
    local.get $6
    i32.const 12
    i32.rotl
    i32.add
    local.get $5
    i32.const 18
    i32.rotl
    i32.add
    i32.add
   else
    local.get $3
    i32.const 374761393
    i32.add
   end
   local.set $2
   local.get $0
   local.get $3
   i32.add
   i32.const 4
   i32.sub
   local.set $4
   loop $while-continue|1
    local.get $1
    local.get $4
    i32.le_u
    if
     local.get $2
     local.get $1
     i32.load
     i32.const -1028477379
     i32.mul
     i32.add
     i32.const 17
     i32.rotl
     i32.const 668265263
     i32.mul
     local.set $2
     local.get $1
     i32.const 4
     i32.add
     local.set $1
     br $while-continue|1
    end
   end
   local.get $0
   local.get $3
   i32.add
   local.set $0
   loop $while-continue|2
    local.get $0
    local.get $1
    i32.gt_u
    if
     local.get $2
     local.get $1
     i32.load8_u
     i32.const 374761393
     i32.mul
     i32.add
     i32.const 11
     i32.rotl
     i32.const -1640531535
     i32.mul
     local.set $2
     local.get $1
     i32.const 1
     i32.add
     local.set $1
     br $while-continue|2
    end
   end
   local.get $2
   local.get $2
   i32.const 15
   i32.shr_u
   i32.xor
   i32.const -2048144777
   i32.mul
   local.tee $0
   i32.const 13
   i32.shr_u
   local.get $0
   i32.xor
   i32.const -1028477379
   i32.mul
   local.tee $0
   i32.const 16
   i32.shr_u
   local.get $0
   i32.xor
  else
   i32.const 0
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $~lib/util/hash/HASH<i32> (param $0 i32) (result i32)
  local.get $0
  i32.const -1028477379
  i32.mul
  i32.const 374761397
  i32.add
  i32.const 17
  i32.rotl
  i32.const 668265263
  i32.mul
  local.tee $0
  i32.const 15
  i32.shr_u
  local.get $0
  i32.xor
  i32.const -2048144777
  i32.mul
  local.tee $0
  i32.const 13
  i32.shr_u
  local.get $0
  i32.xor
  i32.const -1028477379
  i32.mul
  local.tee $0
  i32.const 16
  i32.shr_u
  local.get $0
  i32.xor
 )
 (func $~lib/typedarray/Int32Array#__set (param $0 i32) (param $1 i32) (param $2 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $1
  local.get $0
  i32.load offset=8
  i32.const 2
  i32.shr_u
  i32.ge_u
  if
   i32.const 1248
   i32.const 5808
   i32.const 747
   i32.const 64
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const 2
  i32.shl
  i32.add
  local.get $2
  i32.store
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $~lib/string/String#charCodeAt (param $0 i32) (param $1 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $1
  local.get $0
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.const 1
  i32.shr_u
  i32.ge_u
  if (result i32)
   i32.const -1
  else
   local.get $0
   local.get $1
   i32.const 1
   i32.shl
   i32.add
   i32.load16_u
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $~lib/rt/itcms/step (result i32)
  (local $0 i32)
  (local $1 i32)
  (local $2 i32)
  block $break|0
   block $case2|0
    block $case1|0
     block $case0|0
      global.get $~lib/rt/itcms/state
      br_table $case0|0 $case1|0 $case2|0 $break|0
     end
     i32.const 1
     global.set $~lib/rt/itcms/state
     i32.const 0
     global.set $~lib/rt/itcms/visitCount
     call $~lib/rt/itcms/visitRoots
     global.get $~lib/rt/itcms/toSpace
     global.set $~lib/rt/itcms/iter
     global.get $~lib/rt/itcms/visitCount
     return
    end
    global.get $~lib/rt/itcms/white
    i32.eqz
    local.set $1
    global.get $~lib/rt/itcms/iter
    i32.load offset=4
    i32.const -4
    i32.and
    local.set $0
    loop $while-continue|1
     local.get $0
     global.get $~lib/rt/itcms/toSpace
     i32.ne
     if
      local.get $0
      global.set $~lib/rt/itcms/iter
      local.get $1
      local.get $0
      i32.load offset=4
      i32.const 3
      i32.and
      i32.ne
      if
       local.get $0
       local.get $1
       call $~lib/rt/itcms/Object#set:color
       i32.const 0
       global.set $~lib/rt/itcms/visitCount
       local.get $0
       i32.const 20
       i32.add
       call $~lib/rt/__visit_members
       global.get $~lib/rt/itcms/visitCount
       return
      end
      local.get $0
      i32.load offset=4
      i32.const -4
      i32.and
      local.set $0
      br $while-continue|1
     end
    end
    i32.const 0
    global.set $~lib/rt/itcms/visitCount
    call $~lib/rt/itcms/visitRoots
    global.get $~lib/rt/itcms/toSpace
    global.get $~lib/rt/itcms/iter
    i32.load offset=4
    i32.const -4
    i32.and
    i32.eq
    if
     global.get $~lib/memory/__stack_pointer
     local.set $0
     loop $while-continue|0
      local.get $0
      i32.const 38808
      i32.lt_u
      if
       local.get $0
       i32.load
       call $~lib/rt/itcms/__visit
       local.get $0
       i32.const 4
       i32.add
       local.set $0
       br $while-continue|0
      end
     end
     global.get $~lib/rt/itcms/iter
     i32.load offset=4
     i32.const -4
     i32.and
     local.set $0
     loop $while-continue|2
      local.get $0
      global.get $~lib/rt/itcms/toSpace
      i32.ne
      if
       local.get $1
       local.get $0
       i32.load offset=4
       i32.const 3
       i32.and
       i32.ne
       if
        local.get $0
        local.get $1
        call $~lib/rt/itcms/Object#set:color
        local.get $0
        i32.const 20
        i32.add
        call $~lib/rt/__visit_members
       end
       local.get $0
       i32.load offset=4
       i32.const -4
       i32.and
       local.set $0
       br $while-continue|2
      end
     end
     global.get $~lib/rt/itcms/fromSpace
     local.set $0
     global.get $~lib/rt/itcms/toSpace
     global.set $~lib/rt/itcms/fromSpace
     local.get $0
     global.set $~lib/rt/itcms/toSpace
     local.get $1
     global.set $~lib/rt/itcms/white
     local.get $0
     i32.load offset=4
     i32.const -4
     i32.and
     global.set $~lib/rt/itcms/iter
     i32.const 2
     global.set $~lib/rt/itcms/state
    end
    global.get $~lib/rt/itcms/visitCount
    return
   end
   global.get $~lib/rt/itcms/iter
   local.tee $0
   global.get $~lib/rt/itcms/toSpace
   i32.ne
   if
    local.get $0
    i32.load offset=4
    i32.const -4
    i32.and
    global.set $~lib/rt/itcms/iter
    global.get $~lib/rt/itcms/white
    i32.eqz
    local.get $0
    i32.load offset=4
    i32.const 3
    i32.and
    i32.ne
    if
     i32.const 0
     i32.const 1120
     i32.const 229
     i32.const 20
     call $~lib/builtins/abort
     unreachable
    end
    local.get $0
    i32.const 38808
    i32.lt_u
    if
     local.get $0
     i32.const 0
     i32.store offset=4
     local.get $0
     i32.const 0
     i32.store offset=8
    else
     global.get $~lib/rt/itcms/total
     local.get $0
     i32.load
     i32.const -4
     i32.and
     i32.const 4
     i32.add
     i32.sub
     global.set $~lib/rt/itcms/total
     local.get $0
     i32.const 4
     i32.add
     local.tee $1
     i32.const 38808
     i32.ge_u
     if
      global.get $~lib/rt/tlsf/ROOT
      i32.eqz
      if
       call $~lib/rt/tlsf/initialize
      end
      global.get $~lib/rt/tlsf/ROOT
      local.get $1
      i32.const 4
      i32.sub
      local.set $0
      local.get $1
      i32.const 15
      i32.and
      i32.const 1
      local.get $1
      select
      if (result i32)
       i32.const 1
      else
       local.get $0
       i32.load
       i32.const 1
       i32.and
      end
      if
       i32.const 0
       i32.const 1392
       i32.const 562
       i32.const 3
       call $~lib/builtins/abort
       unreachable
      end
      local.get $0
      local.get $0
      i32.load
      i32.const 1
      i32.or
      i32.store
      local.get $0
      call $~lib/rt/tlsf/insertBlock
     end
    end
    i32.const 10
    return
   end
   global.get $~lib/rt/itcms/toSpace
   global.get $~lib/rt/itcms/toSpace
   i32.store offset=4
   global.get $~lib/rt/itcms/toSpace
   global.get $~lib/rt/itcms/toSpace
   i32.store offset=8
   i32.const 0
   global.set $~lib/rt/itcms/state
  end
  i32.const 0
 )
 (func $~lib/rt/itcms/Object#makeGray (param $0 i32)
  (local $1 i32)
  (local $2 i32)
  local.get $0
  global.get $~lib/rt/itcms/iter
  i32.eq
  if
   local.get $0
   i32.load offset=8
   local.tee $1
   i32.eqz
   if
    i32.const 0
    i32.const 1120
    i32.const 148
    i32.const 30
    call $~lib/builtins/abort
    unreachable
   end
   local.get $1
   global.set $~lib/rt/itcms/iter
  end
  local.get $0
  call $~lib/rt/itcms/Object#unlink
  global.get $~lib/rt/itcms/toSpace
  local.set $1
  local.get $0
  i32.load offset=12
  local.tee $2
  i32.const 2
  i32.le_u
  if (result i32)
   i32.const 1
  else
   local.get $2
   i32.const 5984
   i32.load
   i32.gt_u
   if
    i32.const 1248
    i32.const 1312
    i32.const 21
    i32.const 28
    call $~lib/builtins/abort
    unreachable
   end
   local.get $2
   i32.const 2
   i32.shl
   i32.const 5988
   i32.add
   i32.load
   i32.const 32
   i32.and
  end
  local.set $2
  local.get $0
  local.get $1
  global.get $~lib/rt/itcms/white
  i32.eqz
  i32.const 2
  local.get $2
  select
  call $~lib/rt/itcms/Object#linkTo
 )
 (func $~lib/rt/itcms/Object#linkTo (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  local.get $1
  i32.load offset=8
  local.set $3
  local.get $0
  local.get $1
  local.get $2
  i32.or
  i32.store offset=4
  local.get $0
  local.get $3
  i32.store offset=8
  local.get $3
  local.get $0
  call $~lib/rt/itcms/Object#set:next
  local.get $1
  local.get $0
  i32.store offset=8
 )
 (func $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#has" (param $0 i32) (param $1 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  local.get $0
  local.get $1
  local.get $1
  call $~lib/util/hash/HASH<~lib/string/String>
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#find"
  i32.const 0
  i32.ne
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $assembly/regex/Program#set:classes (param $0 i32) (param $1 i32)
  local.get $0
  local.get $1
  i32.store offset=4
  local.get $0
  local.get $1
  i32.const 0
  call $~lib/rt/itcms/__link
 )
 (func $assembly/metadata/PhoneMetadata#set:possibleLengths (param $0 i32) (param $1 i32)
  local.get $0
  local.get $1
  i32.store offset=12
  local.get $0
  local.get $1
  i32.const 0
  call $~lib/rt/itcms/__link
 )
 (func $~lib/util/number/itoa32 (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  block $folding-inner0
   local.get $0
   i32.eqz
   if
    i32.const 2160
    local.set $1
    br $folding-inner0
   end
   global.get $~lib/memory/__stack_pointer
   i32.const 0
   local.get $0
   i32.sub
   local.get $0
   local.get $0
   i32.const 31
   i32.shr_u
   i32.const 1
   i32.shl
   local.tee $2
   select
   local.tee $0
   i32.const 100000
   i32.lt_u
   if (result i32)
    local.get $0
    i32.const 10
    i32.ge_u
    i32.const 1
    i32.add
    local.get $0
    i32.const 10000
    i32.ge_u
    i32.const 3
    i32.add
    local.get $0
    i32.const 1000
    i32.ge_u
    i32.add
    local.get $0
    i32.const 100
    i32.lt_u
    select
   else
    local.get $0
    i32.const 1000000
    i32.ge_u
    i32.const 6
    i32.add
    local.get $0
    i32.const 1000000000
    i32.ge_u
    i32.const 8
    i32.add
    local.get $0
    i32.const 100000000
    i32.ge_u
    i32.add
    local.get $0
    i32.const 10000000
    i32.lt_u
    select
   end
   local.tee $3
   i32.const 1
   i32.shl
   local.get $2
   i32.add
   i32.const 2
   call $~lib/rt/itcms/__new
   local.tee $1
   i32.store
   local.get $1
   local.get $2
   i32.add
   local.set $4
   loop $do-loop|0
    local.get $4
    local.get $3
    i32.const 1
    i32.sub
    local.tee $3
    i32.const 1
    i32.shl
    i32.add
    local.get $0
    i32.const 10
    i32.rem_u
    i32.const 48
    i32.add
    i32.store16
    local.get $0
    i32.const 10
    i32.div_u
    local.tee $0
    br_if $do-loop|0
   end
   local.get $2
   if
    local.get $1
    i32.const 45
    i32.store16
   end
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $1
 )
 (func $~lib/typedarray/Int32Array#constructor (param $0 i32) (result i32)
  (local $1 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.const 10
  call $~lib/rt/itcms/__new
  local.tee $1
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  local.get $0
  call $~lib/arraybuffer/ArrayBufferView#constructor
  local.tee $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
 )
 (func $~lib/rt/tlsf/removeBlock (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  local.get $1
  i32.load
  local.tee $3
  i32.const 1
  i32.and
  i32.eqz
  if
   i32.const 0
   i32.const 1392
   i32.const 268
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $3
  i32.const -4
  i32.and
  local.tee $3
  i32.const 12
  i32.lt_u
  if
   i32.const 0
   i32.const 1392
   i32.const 270
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $3
  i32.const 256
  i32.lt_u
  if (result i32)
   local.get $3
   i32.const 4
   i32.shr_u
  else
   i32.const 31
   i32.const 1073741820
   local.get $3
   local.get $3
   i32.const 1073741820
   i32.ge_u
   select
   local.tee $3
   i32.clz
   i32.sub
   local.tee $4
   i32.const 7
   i32.sub
   local.set $2
   local.get $3
   local.get $4
   i32.const 4
   i32.sub
   i32.shr_u
   i32.const 16
   i32.xor
  end
  local.tee $3
  i32.const 16
  i32.lt_u
  local.get $2
  i32.const 23
  i32.lt_u
  i32.and
  i32.eqz
  if
   i32.const 0
   i32.const 1392
   i32.const 284
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $1
  i32.load offset=8
  local.set $5
  local.get $1
  i32.load offset=4
  local.tee $4
  if
   local.get $4
   local.get $5
   i32.store offset=8
  end
  local.get $5
  if
   local.get $5
   local.get $4
   i32.store offset=4
  end
  local.get $1
  local.get $0
  local.get $2
  i32.const 4
  i32.shl
  local.get $3
  i32.add
  i32.const 2
  i32.shl
  i32.add
  local.tee $1
  i32.load offset=96
  i32.eq
  if
   local.get $1
   local.get $5
   i32.store offset=96
   local.get $5
   i32.eqz
   if
    local.get $0
    local.get $2
    i32.const 2
    i32.shl
    i32.add
    local.tee $1
    i32.load offset=4
    i32.const -2
    local.get $3
    i32.rotl
    i32.and
    local.set $3
    local.get $1
    local.get $3
    i32.store offset=4
    local.get $3
    i32.eqz
    if
     local.get $0
     local.get $0
     i32.load
     i32.const -2
     local.get $2
     i32.rotl
     i32.and
     i32.store
    end
   end
  end
 )
 (func $~lib/rt/tlsf/insertBlock (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  local.get $1
  i32.eqz
  if
   i32.const 0
   i32.const 1392
   i32.const 201
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $1
  i32.load
  local.tee $3
  i32.const 1
  i32.and
  i32.eqz
  if
   i32.const 0
   i32.const 1392
   i32.const 203
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $1
  i32.const 4
  i32.add
  local.get $1
  i32.load
  i32.const -4
  i32.and
  i32.add
  local.tee $4
  i32.load
  local.tee $2
  i32.const 1
  i32.and
  if
   local.get $0
   local.get $4
   call $~lib/rt/tlsf/removeBlock
   local.get $1
   local.get $3
   i32.const 4
   i32.add
   local.get $2
   i32.const -4
   i32.and
   i32.add
   local.tee $3
   i32.store
   local.get $1
   i32.const 4
   i32.add
   local.get $1
   i32.load
   i32.const -4
   i32.and
   i32.add
   local.tee $4
   i32.load
   local.set $2
  end
  local.get $3
  i32.const 2
  i32.and
  if
   local.get $1
   i32.const 4
   i32.sub
   i32.load
   local.tee $1
   i32.load
   local.tee $6
   i32.const 1
   i32.and
   i32.eqz
   if
    i32.const 0
    i32.const 1392
    i32.const 221
    i32.const 16
    call $~lib/builtins/abort
    unreachable
   end
   local.get $0
   local.get $1
   call $~lib/rt/tlsf/removeBlock
   local.get $1
   local.get $6
   i32.const 4
   i32.add
   local.get $3
   i32.const -4
   i32.and
   i32.add
   local.tee $3
   i32.store
  end
  local.get $4
  local.get $2
  i32.const 2
  i32.or
  i32.store
  local.get $3
  i32.const -4
  i32.and
  local.tee $2
  i32.const 12
  i32.lt_u
  if
   i32.const 0
   i32.const 1392
   i32.const 233
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $4
  local.get $1
  i32.const 4
  i32.add
  local.get $2
  i32.add
  i32.ne
  if
   i32.const 0
   i32.const 1392
   i32.const 234
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $4
  i32.const 4
  i32.sub
  local.get $1
  i32.store
  local.get $2
  i32.const 256
  i32.lt_u
  if (result i32)
   local.get $2
   i32.const 4
   i32.shr_u
  else
   i32.const 31
   i32.const 1073741820
   local.get $2
   local.get $2
   i32.const 1073741820
   i32.ge_u
   select
   local.tee $2
   i32.clz
   i32.sub
   local.tee $3
   i32.const 7
   i32.sub
   local.set $5
   local.get $2
   local.get $3
   i32.const 4
   i32.sub
   i32.shr_u
   i32.const 16
   i32.xor
  end
  local.tee $2
  i32.const 16
  i32.lt_u
  local.get $5
  i32.const 23
  i32.lt_u
  i32.and
  i32.eqz
  if
   i32.const 0
   i32.const 1392
   i32.const 251
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  local.get $5
  i32.const 4
  i32.shl
  local.get $2
  i32.add
  i32.const 2
  i32.shl
  i32.add
  i32.load offset=96
  local.set $3
  local.get $1
  i32.const 0
  i32.store offset=4
  local.get $1
  local.get $3
  i32.store offset=8
  local.get $3
  if
   local.get $3
   local.get $1
   i32.store offset=4
  end
  local.get $0
  local.get $5
  i32.const 4
  i32.shl
  local.get $2
  i32.add
  i32.const 2
  i32.shl
  i32.add
  local.get $1
  i32.store offset=96
  local.get $0
  local.get $0
  i32.load
  i32.const 1
  local.get $5
  i32.shl
  i32.or
  i32.store
  local.get $0
  local.get $5
  i32.const 2
  i32.shl
  i32.add
  local.tee $0
  local.get $0
  i32.load offset=4
  i32.const 1
  local.get $2
  i32.shl
  i32.or
  i32.store offset=4
 )
 (func $~lib/rt/itcms/initLazy (param $0 i32) (result i32)
  local.get $0
  local.get $0
  i32.store offset=4
  local.get $0
  local.get $0
  i32.store offset=8
  local.get $0
 )
 (func $~lib/rt/itcms/Object#unlink (param $0 i32)
  (local $1 i32)
  local.get $0
  i32.load offset=4
  i32.const -4
  i32.and
  local.tee $1
  i32.eqz
  if
   local.get $0
   i32.load offset=8
   i32.eqz
   local.get $0
   i32.const 38808
   i32.lt_u
   i32.and
   i32.eqz
   if
    i32.const 0
    i32.const 1120
    i32.const 128
    i32.const 18
    call $~lib/builtins/abort
    unreachable
   end
   return
  end
  local.get $0
  i32.load offset=8
  local.tee $0
  i32.eqz
  if
   i32.const 0
   i32.const 1120
   i32.const 132
   i32.const 16
   call $~lib/builtins/abort
   unreachable
  end
  local.get $1
  local.get $0
  i32.store offset=8
  local.get $0
  local.get $1
  call $~lib/rt/itcms/Object#set:next
 )
 (func $~lib/rt/__visit_members (param $0 i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  block $folding-inner1
   block $folding-inner0
    block $invalid
     block $assembly/regex/Runner
      block $assembly/regex/Program
       block $~lib/typedarray/Int32Array
        block $assembly/index/ParseResult
         block $"~lib/map/Map<i32,~lib/string/String>"
          block $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>"
           block $~lib/array/Array<~lib/string/String>
            block $~lib/array/Array<i32>
             block $assembly/metadata/PhoneMetadata
              block $~lib/arraybuffer/ArrayBufferView
               block $~lib/string/String
                block $~lib/arraybuffer/ArrayBuffer
                 block $~lib/object/Object
                  local.get $0
                  i32.const 8
                  i32.sub
                  i32.load
                  br_table $~lib/object/Object $~lib/arraybuffer/ArrayBuffer $~lib/string/String $~lib/arraybuffer/ArrayBufferView $assembly/metadata/PhoneMetadata $~lib/array/Array<i32> $~lib/array/Array<~lib/string/String> $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>" $"~lib/map/Map<i32,~lib/string/String>" $assembly/index/ParseResult $~lib/typedarray/Int32Array $assembly/regex/Program $assembly/regex/Runner $invalid
                 end
                 return
                end
                return
               end
               return
              end
              local.get $0
              i32.load
              call $~lib/rt/itcms/__visit
              return
             end
             local.get $0
             i32.load
             call $~lib/rt/itcms/__visit
             local.get $0
             i32.load offset=8
             call $~lib/rt/itcms/__visit
             local.get $0
             i32.load offset=12
             call $~lib/rt/itcms/__visit
             local.get $0
             i32.load offset=16
             call $~lib/rt/itcms/__visit
             local.get $0
             i32.load offset=20
             call $~lib/rt/itcms/__visit
             local.get $0
             i32.load offset=24
             call $~lib/rt/itcms/__visit
             local.get $0
             i32.load offset=28
             call $~lib/rt/itcms/__visit
             local.get $0
             i32.load offset=32
             call $~lib/rt/itcms/__visit
             return
            end
            global.get $~lib/memory/__stack_pointer
            i32.const 4
            i32.sub
            global.set $~lib/memory/__stack_pointer
            call $~stack_check
            global.get $~lib/memory/__stack_pointer
            i32.const 0
            i32.store
            br $folding-inner0
           end
           global.get $~lib/memory/__stack_pointer
           i32.const 4
           i32.sub
           global.set $~lib/memory/__stack_pointer
           call $~stack_check
           global.get $~lib/memory/__stack_pointer
           i32.const 0
           i32.store
           global.get $~lib/memory/__stack_pointer
           local.get $0
           i32.store
           local.get $0
           i32.load offset=4
           local.set $1
           global.get $~lib/memory/__stack_pointer
           local.get $0
           i32.store
           local.get $1
           local.get $0
           i32.load offset=12
           i32.const 2
           i32.shl
           i32.add
           local.set $3
           loop $while-continue|0
            local.get $1
            local.get $3
            i32.lt_u
            if
             local.get $1
             i32.load
             local.tee $2
             if
              local.get $2
              call $~lib/rt/itcms/__visit
             end
             local.get $1
             i32.const 4
             i32.add
             local.set $1
             br $while-continue|0
            end
           end
           br $folding-inner0
          end
          global.get $~lib/memory/__stack_pointer
          i32.const 4
          i32.sub
          global.set $~lib/memory/__stack_pointer
          call $~stack_check
          global.get $~lib/memory/__stack_pointer
          i32.const 0
          i32.store
          global.get $~lib/memory/__stack_pointer
          local.get $0
          i32.store
          local.get $0
          i32.load
          call $~lib/rt/itcms/__visit
          global.get $~lib/memory/__stack_pointer
          local.get $0
          i32.store
          local.get $0
          i32.load offset=8
          local.tee $2
          local.set $1
          global.get $~lib/memory/__stack_pointer
          local.get $0
          i32.store
          local.get $1
          local.get $0
          i32.load offset=16
          i32.const 12
          i32.mul
          i32.add
          local.set $0
          loop $while-continue|00
           local.get $0
           local.get $1
           i32.gt_u
           if
            local.get $1
            i32.load offset=8
            i32.const 1
            i32.and
            i32.eqz
            if
             local.get $1
             i32.load
             call $~lib/rt/itcms/__visit
             local.get $1
             i32.load offset=4
             call $~lib/rt/itcms/__visit
            end
            local.get $1
            i32.const 12
            i32.add
            local.set $1
            br $while-continue|00
           end
          end
          br $folding-inner1
         end
         global.get $~lib/memory/__stack_pointer
         i32.const 4
         i32.sub
         global.set $~lib/memory/__stack_pointer
         call $~stack_check
         global.get $~lib/memory/__stack_pointer
         i32.const 0
         i32.store
         global.get $~lib/memory/__stack_pointer
         local.get $0
         i32.store
         local.get $0
         i32.load
         call $~lib/rt/itcms/__visit
         global.get $~lib/memory/__stack_pointer
         local.get $0
         i32.store
         local.get $0
         i32.load offset=8
         local.tee $2
         local.set $1
         global.get $~lib/memory/__stack_pointer
         local.get $0
         i32.store
         local.get $1
         local.get $0
         i32.load offset=16
         i32.const 12
         i32.mul
         i32.add
         local.set $0
         loop $while-continue|01
          local.get $0
          local.get $1
          i32.gt_u
          if
           local.get $1
           i32.load offset=8
           i32.const 1
           i32.and
           i32.eqz
           if
            local.get $1
            i32.load offset=4
            call $~lib/rt/itcms/__visit
           end
           local.get $1
           i32.const 12
           i32.add
           local.set $1
           br $while-continue|01
          end
         end
         br $folding-inner1
        end
        local.get $0
        i32.load offset=8
        call $~lib/rt/itcms/__visit
        local.get $0
        i32.load offset=12
        call $~lib/rt/itcms/__visit
        return
       end
       local.get $0
       i32.load
       call $~lib/rt/itcms/__visit
       return
      end
      local.get $0
      i32.load
      call $~lib/rt/itcms/__visit
      local.get $0
      i32.load offset=4
      call $~lib/rt/itcms/__visit
      return
     end
     local.get $0
     i32.load
     call $~lib/rt/itcms/__visit
     local.get $0
     i32.load offset=4
     call $~lib/rt/itcms/__visit
     local.get $0
     i32.load offset=8
     call $~lib/rt/itcms/__visit
     return
    end
    unreachable
   end
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $0
   i32.load
   call $~lib/rt/itcms/__visit
   global.get $~lib/memory/__stack_pointer
   i32.const 4
   i32.add
   global.set $~lib/memory/__stack_pointer
   return
  end
  local.get $2
  call $~lib/rt/itcms/__visit
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#find" (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  (local $3 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.load
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $2
  local.get $0
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  i32.load
  local.set $0
  block $folding-inner0
   loop $while-continue|0
    local.get $0
    if
     local.get $0
     i32.load offset=8
     local.tee $2
     i32.const 1
     i32.and
     if (result i32)
      i32.const 0
     else
      global.get $~lib/memory/__stack_pointer
      local.get $0
      i32.load
      local.tee $3
      i32.store
      global.get $~lib/memory/__stack_pointer
      local.get $1
      i32.store offset=4
      local.get $3
      local.get $1
      call $~lib/string/String.__eq
     end
     br_if $folding-inner0
     local.get $2
     i32.const -2
     i32.and
     local.set $0
     br $while-continue|0
    end
   end
   i32.const 0
   local.set $0
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
 )
 (func $"~lib/map/Map<i32,~lib/string/String>#find" (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  (local $3 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.load
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $2
  local.get $0
  i32.load offset=4
  i32.and
  i32.const 2
  i32.shl
  i32.add
  i32.load
  local.set $0
  block $folding-inner0
   loop $while-continue|0
    local.get $0
    if
     local.get $0
     i32.load offset=8
     local.tee $2
     i32.const 1
     i32.and
     if (result i32)
      i32.const 0
     else
      local.get $0
      i32.load
      local.get $1
      i32.eq
     end
     br_if $folding-inner0
     local.get $2
     i32.const -2
     i32.and
     local.set $0
     br $while-continue|0
    end
   end
   i32.const 0
   local.set $0
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
 )
 (func $assembly/index/isPossibleLength (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load offset=12
  local.tee $1
  i32.store offset=4
  block $folding-inner0 (result i32)
   loop $for-loop|0
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store
    local.get $1
    call $~lib/array/Array<i32>#get:length
    local.get $2
    i32.gt_s
    if
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.store
     i32.const 1
     local.get $1
     local.get $2
     call $~lib/array/Array<i32>#__get
     local.get $0
     i32.eq
     br_if $folding-inner0
     drop
     local.get $2
     i32.const 1
     i32.add
     local.set $2
     br $for-loop|0
    end
   end
   i32.const 0
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $assembly/index/groupDigits (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store offset=8
  i32.const 5072
  local.set $4
  global.get $~lib/memory/__stack_pointer
  i32.const 5072
  i32.store
  loop $for-loop|0
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $1
   call $~lib/array/Array<i32>#get:length
   local.get $5
   i32.gt_s
   if (result i32)
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=4
    local.get $3
    local.get $0
    i32.const 20
    i32.sub
    i32.load offset=16
    i32.const 1
    i32.shr_u
    i32.lt_s
   else
    i32.const 0
   end
   if
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store offset=4
    local.get $1
    local.get $5
    call $~lib/array/Array<i32>#__get
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=4
    local.get $3
    i32.add
    local.tee $2
    local.get $0
    i32.const 20
    i32.sub
    i32.load offset=16
    i32.const 1
    i32.shr_u
    i32.gt_s
    if
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store offset=4
     local.get $0
     i32.const 20
     i32.sub
     i32.load offset=16
     i32.const 1
     i32.shr_u
     local.set $2
    end
    global.get $~lib/memory/__stack_pointer
    local.get $4
    i32.store offset=4
    local.get $4
    i32.const 20
    i32.sub
    i32.load offset=16
    i32.const 1
    i32.shr_u
    if
     global.get $~lib/memory/__stack_pointer
     local.get $4
     i32.store offset=4
     global.get $~lib/memory/__stack_pointer
     local.get $4
     i32.const 5680
     call $~lib/string/String.__concat
     local.tee $4
     i32.store
    end
    global.get $~lib/memory/__stack_pointer
    global.get $~lib/memory/__stack_pointer
    local.get $4
    i32.store offset=4
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=12
    local.get $0
    local.get $3
    local.get $2
    call $~lib/string/String#substring
    local.set $3
    global.get $~lib/memory/__stack_pointer
    local.get $3
    i32.store offset=8
    local.get $4
    local.get $3
    call $~lib/string/String.__concat
    local.tee $4
    i32.store
    local.get $2
    local.set $3
    local.get $5
    i32.const 1
    i32.add
    local.set $5
    br $for-loop|0
   end
  end
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $3
  local.get $0
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.const 1
  i32.shr_u
  i32.lt_s
  if
   global.get $~lib/memory/__stack_pointer
   local.get $4
   i32.store offset=4
   local.get $4
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const 1
   i32.shr_u
   if
    global.get $~lib/memory/__stack_pointer
    local.get $4
    i32.store offset=4
    global.get $~lib/memory/__stack_pointer
    local.get $4
    i32.const 5680
    call $~lib/string/String.__concat
    local.tee $4
    i32.store
   end
   global.get $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   local.get $4
   i32.store offset=4
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=12
   i32.const 1
   global.set $~argumentsLength
   local.get $0
   local.get $3
   call $~lib/string/String#substring@varargs
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=8
   local.get $4
   local.get $0
   call $~lib/string/String.__concat
   local.tee $4
   i32.store
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $4
 )
 (func $assembly/index/ParseResult#constructor (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (result i32)
  (local $4 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.const 9
  call $~lib/rt/itcms/__new
  local.tee $4
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=4
  local.get $4
  i32.const 0
  i32.store8
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=4
  local.get $4
  i32.const 0
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=4
  local.get $4
  i32.const 0
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:entries"
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=4
  local.get $4
  i32.const 0
  call $assembly/metadata/PhoneMetadata#set:possibleLengths
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=4
  local.get $4
  local.get $0
  i32.store8
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=4
  local.get $4
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.store offset=8
  local.get $4
  local.get $2
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:entries"
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=8
  local.get $4
  local.get $3
  call $assembly/metadata/PhoneMetadata#set:possibleLengths
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $4
 )
 (func $~lib/util/string/compareImpl (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (result i32)
  (local $4 i32)
  local.get $0
  local.get $1
  i32.const 1
  i32.shl
  i32.add
  local.tee $1
  i32.const 7
  i32.and
  local.get $2
  i32.const 7
  i32.and
  i32.or
  i32.eqz
  local.get $3
  i32.const 4
  i32.ge_u
  i32.and
  if
   loop $do-loop|0
    local.get $1
    i64.load
    local.get $2
    i64.load
    i64.eq
    if
     local.get $1
     i32.const 8
     i32.add
     local.set $1
     local.get $2
     i32.const 8
     i32.add
     local.set $2
     local.get $3
     i32.const 4
     i32.sub
     local.tee $3
     i32.const 4
     i32.ge_u
     br_if $do-loop|0
    end
   end
  end
  loop $while-continue|1
   local.get $3
   local.tee $0
   i32.const 1
   i32.sub
   local.set $3
   local.get $0
   if
    local.get $1
    i32.load16_u
    local.tee $0
    local.get $2
    i32.load16_u
    local.tee $4
    i32.ne
    if
     local.get $0
     local.get $4
     i32.sub
     return
    end
    local.get $1
    i32.const 2
    i32.add
    local.set $1
    local.get $2
    i32.const 2
    i32.add
    local.set $2
    br $while-continue|1
   end
  end
  i32.const 0
 )
 (func $~lib/string/String.__eq (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  block $folding-inner0
   local.get $0
   local.get $1
   i32.eq
   if
    i32.const 1
    local.set $2
    br $folding-inner0
   end
   local.get $1
   i32.eqz
   local.get $0
   i32.eqz
   i32.or
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $0
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const 1
   i32.shr_u
   local.set $3
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store
   local.get $3
   local.get $1
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const 1
   i32.shr_u
   i32.ne
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=4
   local.get $0
   i32.const 0
   local.get $1
   local.get $3
   call $~lib/util/string/compareImpl
   i32.eqz
   local.set $2
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $2
 )
 (func $~lib/rt/tlsf/searchBlock (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  local.get $1
  i32.const 256
  i32.lt_u
  if (result i32)
   local.get $1
   i32.const 4
   i32.shr_u
  else
   i32.const 31
   local.get $1
   call $~lib/rt/tlsf/roundSize
   local.tee $1
   i32.clz
   i32.sub
   local.tee $3
   i32.const 7
   i32.sub
   local.set $2
   local.get $1
   local.get $3
   i32.const 4
   i32.sub
   i32.shr_u
   i32.const 16
   i32.xor
  end
  local.tee $1
  i32.const 16
  i32.lt_u
  local.get $2
  i32.const 23
  i32.lt_u
  i32.and
  i32.eqz
  if
   i32.const 0
   i32.const 1392
   i32.const 334
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  local.get $2
  i32.const 2
  i32.shl
  i32.add
  i32.load offset=4
  i32.const -1
  local.get $1
  i32.shl
  i32.and
  local.tee $1
  if (result i32)
   local.get $0
   local.get $1
   i32.ctz
   local.get $2
   i32.const 4
   i32.shl
   i32.add
   i32.const 2
   i32.shl
   i32.add
   i32.load offset=96
  else
   local.get $0
   i32.load
   i32.const -1
   local.get $2
   i32.const 1
   i32.add
   i32.shl
   i32.and
   local.tee $1
   if (result i32)
    local.get $0
    local.get $1
    i32.ctz
    local.tee $1
    i32.const 2
    i32.shl
    i32.add
    i32.load offset=4
    local.tee $2
    i32.eqz
    if
     i32.const 0
     i32.const 1392
     i32.const 347
     i32.const 18
     call $~lib/builtins/abort
     unreachable
    end
    local.get $0
    local.get $2
    i32.ctz
    local.get $1
    i32.const 4
    i32.shl
    i32.add
    i32.const 2
    i32.shl
    i32.add
    i32.load offset=96
   else
    i32.const 0
   end
  end
 )
 (func $~lib/rt/tlsf/roundSize (param $0 i32) (result i32)
  local.get $0
  i32.const 536870910
  i32.lt_u
  if (result i32)
   local.get $0
   i32.const 1
   i32.const 27
   local.get $0
   i32.clz
   i32.sub
   i32.shl
   i32.add
   i32.const 1
   i32.sub
  else
   local.get $0
  end
 )
 (func $~lib/rt/tlsf/initialize
  (local $0 i32)
  (local $1 i32)
  memory.size
  local.tee $1
  i32.const 0
  i32.le_s
  if (result i32)
   i32.const 1
   local.get $1
   i32.sub
   memory.grow
   i32.const 0
   i32.lt_s
  else
   i32.const 0
  end
  if
   unreachable
  end
  i32.const 38816
  i32.const 0
  i32.store
  i32.const 40384
  i32.const 0
  i32.store
  loop $for-loop|0
   local.get $0
   i32.const 23
   i32.lt_u
   if
    local.get $0
    i32.const 2
    i32.shl
    i32.const 38816
    i32.add
    i32.const 0
    i32.store offset=4
    i32.const 0
    local.set $1
    loop $for-loop|1
     local.get $1
     i32.const 16
     i32.lt_u
     if
      local.get $0
      i32.const 4
      i32.shl
      local.get $1
      i32.add
      i32.const 2
      i32.shl
      i32.const 38816
      i32.add
      i32.const 0
      i32.store offset=96
      local.get $1
      i32.const 1
      i32.add
      local.set $1
      br $for-loop|1
     end
    end
    local.get $0
    i32.const 1
    i32.add
    local.set $0
    br $for-loop|0
   end
  end
  i32.const 38816
  i32.const 40388
  memory.size
  i64.extend_i32_s
  i64.const 16
  i64.shl
  call $~lib/rt/tlsf/addMemory
  i32.const 38816
  global.set $~lib/rt/tlsf/ROOT
 )
 (func $~lib/rt/tlsf/addMemory (param $0 i32) (param $1 i32) (param $2 i64)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  local.get $2
  local.get $1
  i64.extend_i32_u
  i64.lt_u
  if
   i32.const 0
   i32.const 1392
   i32.const 382
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $1
  i32.const 19
  i32.add
  i32.const -16
  i32.and
  i32.const 4
  i32.sub
  local.set $1
  local.get $0
  i32.load offset=1568
  local.tee $3
  if
   local.get $3
   i32.const 4
   i32.add
   local.get $1
   i32.gt_u
   if
    i32.const 0
    i32.const 1392
    i32.const 389
    i32.const 16
    call $~lib/builtins/abort
    unreachable
   end
   local.get $3
   local.get $1
   i32.const 16
   i32.sub
   local.tee $5
   i32.eq
   if
    local.get $3
    i32.load
    local.set $4
    local.get $5
    local.set $1
   end
  else
   local.get $0
   i32.const 1572
   i32.add
   local.get $1
   i32.gt_u
   if
    i32.const 0
    i32.const 1392
    i32.const 402
    i32.const 5
    call $~lib/builtins/abort
    unreachable
   end
  end
  local.get $2
  i32.wrap_i64
  i32.const -16
  i32.and
  local.get $1
  i32.sub
  local.tee $3
  i32.const 20
  i32.lt_u
  if
   return
  end
  local.get $1
  local.get $4
  i32.const 2
  i32.and
  local.get $3
  i32.const 8
  i32.sub
  local.tee $3
  i32.const 1
  i32.or
  i32.or
  i32.store
  local.get $1
  i32.const 0
  i32.store offset=4
  local.get $1
  i32.const 0
  i32.store offset=8
  local.get $1
  i32.const 4
  i32.add
  local.get $3
  i32.add
  local.tee $3
  i32.const 2
  i32.store
  local.get $0
  local.get $3
  i32.store offset=1568
  local.get $0
  local.get $1
  call $~lib/rt/tlsf/insertBlock
 )
 (func $~lib/rt/itcms/visitRoots
  (local $0 i32)
  (local $1 i32)
  i32.const 1248
  call $~lib/rt/itcms/__visit
  i32.const 1456
  call $~lib/rt/itcms/__visit
  i32.const 5456
  call $~lib/rt/itcms/__visit
  i32.const 4960
  call $~lib/rt/itcms/__visit
  i32.const 1056
  call $~lib/rt/itcms/__visit
  i32.const 5872
  call $~lib/rt/itcms/__visit
  i32.const 5936
  call $~lib/rt/itcms/__visit
  i32.const 5360
  call $~lib/rt/itcms/__visit
  global.get $assembly/metadata/REGION_METADATA
  local.tee $0
  if
   local.get $0
   call $~lib/rt/itcms/__visit
  end
  global.get $assembly/metadata/CODE_TO_REGION
  local.tee $0
  if
   local.get $0
   call $~lib/rt/itcms/__visit
  end
  global.get $assembly/metadata/REGION_LIST
  local.tee $0
  if
   local.get $0
   call $~lib/rt/itcms/__visit
  end
  global.get $~lib/rt/itcms/pinSpace
  local.tee $1
  i32.load offset=4
  i32.const -4
  i32.and
  local.set $0
  loop $while-continue|0
   local.get $0
   local.get $1
   i32.ne
   if
    local.get $0
    i32.load offset=4
    i32.const 3
    i32.and
    i32.const 3
    i32.ne
    if
     i32.const 0
     i32.const 1120
     i32.const 160
     i32.const 16
     call $~lib/builtins/abort
     unreachable
    end
    local.get $0
    i32.const 20
    i32.add
    call $~lib/rt/__visit_members
    local.get $0
    i32.load offset=4
    i32.const -4
    i32.and
    local.set $0
    br $while-continue|0
   end
  end
 )
 (func $~lib/rt/itcms/Object#set:next (param $0 i32) (param $1 i32)
  local.get $0
  local.get $1
  local.get $0
  i32.load offset=4
  i32.const 3
  i32.and
  i32.or
  i32.store offset=4
 )
 (func $~lib/rt/itcms/Object#set:color (param $0 i32) (param $1 i32)
  local.get $0
  local.get $0
  i32.load offset=4
  i32.const -4
  i32.and
  local.get $1
  i32.or
  i32.store offset=4
 )
 (func $"~lib/map/Map<i32,~lib/string/String>#has" (param $0 i32) (param $1 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  local.get $1
  local.get $1
  call $~lib/util/hash/HASH<i32>
  call $"~lib/map/Map<i32,~lib/string/String>#find"
  i32.const 0
  i32.ne
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $"~lib/map/Map<i32,~lib/string/String>#get" (param $0 i32) (param $1 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  local.get $1
  local.get $1
  call $~lib/util/hash/HASH<i32>
  call $"~lib/map/Map<i32,~lib/string/String>#find"
  local.tee $0
  i32.eqz
  if
   i32.const 4960
   i32.const 5024
   i32.const 105
   i32.const 17
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.load offset=4
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $~lib/array/Array<~lib/string/String>#__get (param $0 i32) (param $1 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $1
  local.get $0
  i32.load offset=12
  i32.ge_u
  if
   i32.const 1248
   i32.const 1568
   i32.const 114
   i32.const 42
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const 2
  i32.shl
  i32.add
  i32.load
  local.tee $0
  i32.store offset=4
  local.get $0
  i32.eqz
  if
   i32.const 5456
   i32.const 1568
   i32.const 118
   i32.const 40
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
 )
 (func $~lib/array/Array<i32>#__get (param $0 i32) (param $1 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $1
  local.get $0
  i32.load offset=12
  i32.ge_u
  if
   i32.const 1248
   i32.const 1568
   i32.const 114
   i32.const 42
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.load offset=4
  local.get $1
  i32.const 2
  i32.shl
  i32.add
  i32.load
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $assembly/regex/matchProgram (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (result i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store offset=8
  global.get $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.load offset=8
  i32.const 1
  i32.add
  i32.const 1
  i32.shl
  local.set $5
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  local.get $5
  call $~lib/typedarray/Int32Array#constructor
  local.tee $7
  i32.store offset=4
  loop $for-loop|0
   local.get $4
   local.get $5
   i32.lt_s
   if
    global.get $~lib/memory/__stack_pointer
    local.get $7
    i32.store
    local.get $7
    local.get $4
    i32.const -1
    call $~lib/typedarray/Int32Array#__set
    local.get $4
    i32.const 1
    i32.add
    local.set $4
    br $for-loop|0
   end
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $7
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  local.get $1
  local.get $3
  call $assembly/regex/Runner#constructor
  local.tee $0
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $7
  i32.store offset=8
  local.get $7
  i32.const 0
  local.get $0
  i32.const 0
  local.get $2
  local.get $7
  call $assembly/regex/Runner#run
  select
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $assembly/regex/Runner#run (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (result i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  (local $10 i32)
  (local $11 i32)
  (local $12 i32)
  (local $13 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 20
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.const 20
  memory.fill
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.load
  local.tee $6
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.load offset=8
  local.tee $8
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.load offset=16
  local.set $7
  loop $for-loop|0
   block $folding-inner0
    global.get $~lib/memory/__stack_pointer
    local.get $6
    i32.store
    local.get $6
    local.get $1
    i32.const 3
    i32.mul
    local.tee $4
    call $~lib/typedarray/Int32Array#__get
    local.set $5
    global.get $~lib/memory/__stack_pointer
    local.get $6
    i32.store
    local.get $6
    local.get $4
    i32.const 1
    i32.add
    call $~lib/typedarray/Int32Array#__get
    local.set $13
    global.get $~lib/memory/__stack_pointer
    local.get $6
    i32.store
    local.get $6
    local.get $4
    i32.const 2
    i32.add
    call $~lib/typedarray/Int32Array#__get
    local.set $11
    local.get $5
    if
     local.get $5
     i32.const 1
     i32.eq
     if (result i32)
      local.get $2
      local.get $7
      i32.lt_s
      if (result i32)
       global.get $~lib/memory/__stack_pointer
       local.get $8
       i32.store
       local.get $8
       local.get $2
       call $~lib/string/String#charCodeAt
       local.get $13
       i32.eq
      else
       i32.const 0
      end
      if
       local.get $1
       i32.const 1
       i32.add
       local.set $1
       local.get $2
       i32.const 1
       i32.add
       local.set $2
       br $for-loop|0
      end
      br $folding-inner0
     else
      local.get $5
      i32.const 2
      i32.eq
      if (result i32)
       local.get $2
       local.get $7
       i32.lt_s
       if
        local.get $1
        i32.const 1
        i32.add
        local.set $1
        local.get $2
        i32.const 1
        i32.add
        local.set $2
        br $for-loop|0
       end
       br $folding-inner0
      else
       local.get $5
       i32.const 3
       i32.eq
       if (result i32)
        local.get $2
        local.get $7
        i32.ge_s
        br_if $folding-inner0
        global.get $~lib/memory/__stack_pointer
        local.get $0
        i32.store offset=12
        global.get $~lib/memory/__stack_pointer
        local.get $0
        i32.load offset=4
        local.tee $12
        i32.store
        global.get $~lib/memory/__stack_pointer
        local.get $8
        i32.store offset=12
        local.get $8
        local.get $2
        call $~lib/string/String#charCodeAt
        local.set $9
        i32.const 0
        local.set $5
        global.get $~lib/memory/__stack_pointer
        i32.const 4
        i32.sub
        global.set $~lib/memory/__stack_pointer
        call $~stack_check
        global.get $~lib/memory/__stack_pointer
        i32.const 0
        i32.store
        global.get $~lib/memory/__stack_pointer
        local.get $12
        i32.store
        local.get $12
        local.get $13
        call $~lib/typedarray/Int32Array#__get
        local.set $10
        local.get $13
        i32.const 1
        i32.add
        local.set $4
        block $folding-inner00 (result i32)
         loop $for-loop|01
          local.get $5
          local.get $10
          i32.lt_s
          if
           global.get $~lib/memory/__stack_pointer
           local.get $12
           i32.store
           local.get $12
           local.get $4
           call $~lib/typedarray/Int32Array#__get
           local.set $13
           global.get $~lib/memory/__stack_pointer
           local.get $12
           i32.store
           i32.const 1
           local.get $12
           local.get $4
           i32.const 1
           i32.add
           call $~lib/typedarray/Int32Array#__get
           local.get $9
           i32.ge_s
           local.get $9
           local.get $13
           i32.ge_s
           i32.and
           br_if $folding-inner00
           drop
           local.get $4
           i32.const 2
           i32.add
           local.set $4
           local.get $5
           i32.const 1
           i32.add
           local.set $5
           br $for-loop|01
          end
         end
         i32.const 0
        end
        local.set $4
        global.get $~lib/memory/__stack_pointer
        i32.const 4
        i32.add
        global.set $~lib/memory/__stack_pointer
        local.get $11
        i32.eqz
        local.get $4
        i32.eq
        if
         local.get $1
         i32.const 1
         i32.add
         local.set $1
         local.get $2
         i32.const 1
         i32.add
         local.set $2
         br $for-loop|0
        end
        br $folding-inner0
       else
        local.get $5
        i32.const 7
        i32.eq
        if (result i32)
         local.get $2
         i32.eqz
         if
          local.get $1
          i32.const 1
          i32.add
          local.set $1
          br $for-loop|0
         end
         br $folding-inner0
        else
         local.get $5
         i32.const 8
         i32.eq
         if (result i32)
          local.get $2
          local.get $7
          i32.eq
          if
           local.get $1
           i32.const 1
           i32.add
           local.set $1
           br $for-loop|0
          end
          br $folding-inner0
         else
          local.get $5
          i32.const 6
          i32.eq
          if (result i32)
           global.get $~lib/memory/__stack_pointer
           local.get $3
           i32.store
           local.get $3
           local.get $13
           local.get $2
           call $~lib/typedarray/Int32Array#__set
           local.get $1
           i32.const 1
           i32.add
          else
           local.get $5
           i32.const 5
           i32.eq
           if (result i32)
            local.get $13
           else
            local.get $5
            i32.const 4
            i32.ne
            br_if $folding-inner0
            global.get $~lib/memory/__stack_pointer
            local.get $3
            i32.store
            global.get $~lib/memory/__stack_pointer
            i32.const 4
            i32.sub
            global.set $~lib/memory/__stack_pointer
            call $~stack_check
            global.get $~lib/memory/__stack_pointer
            i32.const 0
            i32.store
            global.get $~lib/memory/__stack_pointer
            local.get $3
            i32.store
            local.get $3
            i32.load offset=8
            i32.const 2
            i32.shr_u
            local.set $4
            global.get $~lib/memory/__stack_pointer
            i32.const 4
            i32.add
            global.set $~lib/memory/__stack_pointer
            global.get $~lib/memory/__stack_pointer
            local.get $4
            call $~lib/typedarray/Int32Array#constructor
            local.tee $5
            i32.store offset=16
            i32.const 0
            local.set $1
            loop $for-loop|1
             local.get $1
             local.get $4
             i32.lt_s
             if
              global.get $~lib/memory/__stack_pointer
              local.get $5
              i32.store
              global.get $~lib/memory/__stack_pointer
              local.get $3
              i32.store offset=12
              local.get $5
              local.get $1
              local.get $3
              local.get $1
              call $~lib/typedarray/Int32Array#__get
              call $~lib/typedarray/Int32Array#__set
              local.get $1
              i32.const 1
              i32.add
              local.set $1
              br $for-loop|1
             end
            end
            global.get $~lib/memory/__stack_pointer
            local.get $0
            i32.store
            global.get $~lib/memory/__stack_pointer
            local.get $3
            i32.store offset=12
            local.get $0
            local.get $13
            local.get $2
            local.get $3
            call $assembly/regex/Runner#run
            if
             global.get $~lib/memory/__stack_pointer
             i32.const 20
             i32.add
             global.set $~lib/memory/__stack_pointer
             i32.const 1
             return
            end
            i32.const 0
            local.set $1
            loop $for-loop|2
             local.get $1
             local.get $4
             i32.lt_s
             if
              global.get $~lib/memory/__stack_pointer
              local.get $3
              i32.store
              global.get $~lib/memory/__stack_pointer
              local.get $5
              i32.store offset=12
              local.get $3
              local.get $1
              local.get $5
              local.get $1
              call $~lib/typedarray/Int32Array#__get
              call $~lib/typedarray/Int32Array#__set
              local.get $1
              i32.const 1
              i32.add
              local.set $1
              br $for-loop|2
             end
            end
            local.get $11
           end
          end
         end
        end
       end
      end
     end
     local.set $1
     br $for-loop|0
    else
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store
     local.get $2
     local.get $7
     i32.eq
     i32.const 1
     local.get $0
     i32.load8_u offset=12
     select
     global.get $~lib/memory/__stack_pointer
     i32.const 20
     i32.add
     global.set $~lib/memory/__stack_pointer
     return
    end
    unreachable
   end
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 20
  i32.add
  global.set $~lib/memory/__stack_pointer
  i32.const 0
 )
 (func $assembly/regex/Program#constructor (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  (local $3 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.const 11
  call $~lib/rt/itcms/__new
  local.tee $3
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=4
  local.get $3
  i32.const 0
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:buckets"
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=4
  local.get $3
  i32.const 0
  call $assembly/regex/Program#set:classes
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=4
  local.get $3
  i32.const 0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=8
  local.get $3
  local.get $0
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:buckets"
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  local.get $3
  local.get $1
  call $assembly/regex/Program#set:classes
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=4
  local.get $3
  local.get $2
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $3
 )
 (func $assembly/metadata/PhoneMetadata#set:nationalFormatGroups (param $0 i32) (param $1 i32)
  local.get $0
  local.get $1
  i32.store offset=24
  local.get $0
  local.get $1
  i32.const 0
  call $~lib/rt/itcms/__link
 )
 (func $assembly/metadata/PhoneMetadata#set:mobileLeading (param $0 i32) (param $1 i32)
  local.get $0
  local.get $1
  i32.store offset=16
  local.get $0
  local.get $1
  i32.const 0
  call $~lib/rt/itcms/__link
 )
 (func $assembly/metadata/PhoneMetadata#set:internationalGroups (param $0 i32) (param $1 i32)
  local.get $0
  local.get $1
  i32.store offset=28
  local.get $0
  local.get $1
  i32.const 0
  call $~lib/rt/itcms/__link
 )
 (func $assembly/metadata/PhoneMetadata#set:fixedLeading (param $0 i32) (param $1 i32)
  local.get $0
  local.get $1
  i32.store offset=20
  local.get $0
  local.get $1
  i32.const 0
  call $~lib/rt/itcms/__link
 )
 (func $assembly/metadata/PhoneMetadata#set:exampleNsn (param $0 i32) (param $1 i32)
  local.get $0
  local.get $1
  i32.store offset=32
  local.get $0
  local.get $1
  i32.const 0
  call $~lib/rt/itcms/__link
 )
 (func $assembly/index/matchesAnyPrefix (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store offset=8
  block $folding-inner0 (result i32)
   loop $for-loop|0
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store
    local.get $1
    call $~lib/array/Array<i32>#get:length
    local.get $2
    i32.gt_s
    if
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.store offset=8
     local.get $1
     local.get $2
     call $~lib/array/Array<~lib/string/String>#__get
     local.set $3
     global.get $~lib/memory/__stack_pointer
     local.get $3
     i32.store offset=4
     i32.const 1
     local.get $0
     local.get $3
     call $~lib/string/String#startsWith
     br_if $folding-inner0
     drop
     local.get $2
     i32.const 1
     i32.add
     local.set $2
     br $for-loop|0
    end
   end
   i32.const 0
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $assembly/index/isValidNumber (param $0 i32) (param $1 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $0
  local.get $1
  call $assembly/index/getNumberType
  i32.const -1
  i32.ne
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $assembly/index/isDigit (param $0 i32) (result i32)
  local.get $0
  i32.const 57
  i32.le_s
  local.get $0
  i32.const 48
  i32.ge_s
  i32.and
 )
 (func $assembly/index/hasPlusPrefix (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  block $folding-inner1 (result i32)
   loop $for-loop|0
    block $folding-inner0
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store
     local.get $1
     local.get $0
     i32.const 20
     i32.sub
     i32.load offset=16
     i32.const 1
     i32.shr_u
     i32.lt_s
     if
      global.get $~lib/memory/__stack_pointer
      local.get $0
      i32.store
      i32.const 1
      local.get $0
      local.get $1
      call $~lib/string/String#charCodeAt
      local.tee $2
      i32.const 43
      i32.eq
      br_if $folding-inner1
      drop
      local.get $2
      call $assembly/index/isDigit
      br_if $folding-inner0
      local.get $1
      i32.const 1
      i32.add
      local.set $1
      br $for-loop|0
     end
    end
   end
   i32.const 0
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $assembly/index/getNumberType (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 24
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.const 24
  memory.fill
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  local.get $1
  call $assembly/index/parse
  local.tee $0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  block $folding-inner2 (result i32)
   block $folding-inner1
    block $folding-inner0
     local.get $0
     i32.load8_u
     i32.eqz
     br_if $folding-inner0
     global.get $~lib/memory/__stack_pointer
     global.get $assembly/metadata/REGION_METADATA
     local.tee $1
     i32.store
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store offset=12
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.load offset=8
     local.tee $2
     i32.store offset=4
     global.get $~lib/memory/__stack_pointer
     local.get $1
     local.get $2
     call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#get"
     local.tee $1
     i32.store offset=16
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.load offset=12
     local.tee $0
     i32.store offset=20
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store offset=4
     local.get $0
     i32.const 20
     i32.sub
     i32.load offset=16
     i32.const 1
     i32.shr_u
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.store
     local.get $1
     call $assembly/index/isPossibleLength
     i32.eqz
     br_if $folding-inner0
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.store offset=4
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.load offset=16
     local.tee $2
     i32.store
     local.get $2
     call $~lib/array/Array<i32>#get:length
     i32.const 0
     i32.gt_s
     local.set $2
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.store offset=4
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.load offset=20
     local.tee $3
     i32.store
     i32.const 2
     local.get $2
     local.get $3
     call $~lib/array/Array<i32>#get:length
     i32.const 0
     i32.gt_s
     local.tee $3
     i32.or
     i32.eqz
     br_if $folding-inner2
     drop
     i32.const 1
     local.get $2
     if (result i32)
      global.get $~lib/memory/__stack_pointer
      local.get $0
      i32.store
      global.get $~lib/memory/__stack_pointer
      local.get $1
      i32.store offset=12
      global.get $~lib/memory/__stack_pointer
      local.get $1
      i32.load offset=16
      local.tee $2
      i32.store offset=4
      local.get $0
      local.get $2
      call $assembly/index/matchesAnyPrefix
     else
      i32.const 0
     end
     br_if $folding-inner2
     drop
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.store offset=12
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.load offset=20
     local.tee $1
     i32.store offset=4
     local.get $0
     local.get $1
     call $assembly/index/matchesAnyPrefix
     local.get $3
     i32.eqz
     i32.or
     br_if $folding-inner1
    end
    i32.const -1
    br $folding-inner2
   end
   i32.const 0
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 24
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $assembly/index/digitsOnly (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store offset=8
  i32.const 5072
  local.set $2
  global.get $~lib/memory/__stack_pointer
  i32.const 5072
  i32.store
  loop $for-loop|0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=4
   local.get $1
   local.get $0
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const 1
   i32.shr_u
   i32.lt_s
   if
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=4
    local.get $0
    local.get $1
    call $~lib/string/String#charCodeAt
    call $assembly/index/isDigit
    if
     global.get $~lib/memory/__stack_pointer
     global.get $~lib/memory/__stack_pointer
     local.get $2
     i32.store offset=4
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store offset=12
     global.get $~lib/memory/__stack_pointer
     i32.const 8
     i32.sub
     global.set $~lib/memory/__stack_pointer
     call $~stack_check
     global.get $~lib/memory/__stack_pointer
     i64.const 0
     i64.store
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store
     block $__inlined_func$~lib/string/String#charAt$189
      local.get $1
      local.get $0
      i32.const 20
      i32.sub
      i32.load offset=16
      i32.const 1
      i32.shr_u
      i32.ge_u
      if
       i32.const 5072
       local.set $3
       br $__inlined_func$~lib/string/String#charAt$189
      end
      global.get $~lib/memory/__stack_pointer
      i32.const 2
      i32.const 2
      call $~lib/rt/itcms/__new
      local.tee $3
      i32.store offset=4
      local.get $3
      local.get $0
      local.get $1
      i32.const 1
      i32.shl
      i32.add
      i32.load16_u
      i32.store16
     end
     global.get $~lib/memory/__stack_pointer
     i32.const 8
     i32.add
     global.set $~lib/memory/__stack_pointer
     global.get $~lib/memory/__stack_pointer
     local.get $3
     i32.store offset=8
     local.get $2
     local.get $3
     call $~lib/string/String.__concat
     local.tee $2
     i32.store
    end
    local.get $1
    i32.const 1
    i32.add
    local.set $1
    br $for-loop|0
   end
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $2
 )
 (func $~start
  call $start:assembly/metadata
 )
 (func $~lib/util/string/strtol<i32> (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  block $folding-inner1 (result i32)
   block $folding-inner0
    local.get $0
    i32.const 20
    i32.sub
    i32.load offset=16
    i32.const 1
    i32.shr_u
    local.tee $1
    i32.eqz
    br_if $folding-inner0
    local.get $0
    local.tee $2
    i32.load16_u
    local.set $0
    loop $while-continue|0
     block $__inlined_func$~lib/util/string/isSpace$190 (result i32)
      local.get $0
      i32.const 128
      i32.or
      i32.const 160
      i32.eq
      local.get $0
      i32.const 9
      i32.sub
      i32.const 4
      i32.le_u
      i32.or
      local.get $0
      i32.const 5760
      i32.lt_u
      br_if $__inlined_func$~lib/util/string/isSpace$190
      drop
      i32.const 1
      local.get $0
      i32.const -8192
      i32.add
      i32.const 10
      i32.le_u
      br_if $__inlined_func$~lib/util/string/isSpace$190
      drop
      i32.const 1
      local.get $0
      i32.const 5760
      i32.eq
      local.get $0
      i32.const 8232
      i32.eq
      i32.or
      local.get $0
      i32.const 8233
      i32.eq
      local.get $0
      i32.const 8239
      i32.eq
      i32.or
      i32.or
      local.get $0
      i32.const 8287
      i32.eq
      local.get $0
      i32.const 12288
      i32.eq
      i32.or
      local.get $0
      i32.const 65279
      i32.eq
      i32.or
      i32.or
      br_if $__inlined_func$~lib/util/string/isSpace$190
      drop
      i32.const 0
     end
     if
      local.get $2
      i32.const 2
      i32.add
      local.tee $2
      i32.load16_u
      local.set $0
      local.get $1
      i32.const 1
      i32.sub
      local.set $1
      br $while-continue|0
     end
    end
    i32.const 1
    local.set $4
    local.get $0
    i32.const 45
    i32.eq
    local.tee $6
    local.get $0
    i32.const 43
    i32.eq
    i32.or
    if (result i32)
     local.get $1
     i32.const 1
     i32.sub
     local.tee $1
     i32.eqz
     br_if $folding-inner0
     i32.const -1
     i32.const 1
     local.get $6
     select
     local.set $4
     local.get $2
     i32.const 2
     i32.add
     local.tee $2
     i32.load16_u
    else
     local.get $0
    end
    i32.const 48
    i32.eq
    local.get $1
    i32.const 2
    i32.gt_s
    i32.and
    if
     block $break|1
      block $case2|1
       block $case1|1
        local.get $2
        i32.load16_u offset=2
        i32.const 32
        i32.or
        local.tee $0
        i32.const 98
        i32.ne
        if
         local.get $0
         i32.const 111
         i32.eq
         br_if $case1|1
         local.get $0
         i32.const 120
         i32.eq
         br_if $case2|1
         br $break|1
        end
        local.get $2
        i32.const 4
        i32.add
        local.set $2
        local.get $1
        i32.const 2
        i32.sub
        local.set $1
        i32.const 2
        local.set $3
        br $break|1
       end
       local.get $2
       i32.const 4
       i32.add
       local.set $2
       local.get $1
       i32.const 2
       i32.sub
       local.set $1
       i32.const 8
       local.set $3
       br $break|1
      end
      local.get $2
      i32.const 4
      i32.add
      local.set $2
      local.get $1
      i32.const 2
      i32.sub
      local.set $1
      i32.const 16
      local.set $3
     end
    end
    local.get $3
    i32.const 10
    local.get $3
    select
    local.set $6
    local.get $1
    i32.const 1
    i32.sub
    local.set $7
    loop $while-continue|2
     local.get $1
     local.tee $0
     i32.const 1
     i32.sub
     local.set $1
     local.get $0
     if
      block $while-break|2
       local.get $2
       i32.load16_u
       local.tee $3
       i32.const 48
       i32.sub
       local.tee $0
       i32.const 10
       i32.ge_u
       if
        local.get $3
        i32.const 55
        i32.sub
        local.get $3
        i32.const 87
        i32.sub
        local.get $3
        local.get $3
        i32.const 97
        i32.sub
        i32.const 25
        i32.le_u
        select
        local.get $3
        i32.const 65
        i32.sub
        i32.const 25
        i32.le_u
        select
        local.set $0
       end
       local.get $0
       local.get $6
       i32.ge_u
       if
        local.get $1
        local.get $7
        i32.eq
        br_if $folding-inner0
        br $while-break|2
       end
       local.get $5
       local.get $6
       i32.mul
       local.get $0
       i32.add
       local.set $5
       local.get $2
       i32.const 2
       i32.add
       local.set $2
       br $while-continue|2
      end
     end
    end
    local.get $4
    local.get $5
    i32.mul
    br $folding-inner1
   end
   i32.const 0
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $~lib/rt/tlsf/allocateBlock (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  local.get $1
  i32.const 1073741820
  i32.gt_u
  if
   i32.const 1056
   i32.const 1392
   i32.const 461
   i32.const 29
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  i32.const 12
  local.get $1
  i32.const 19
  i32.add
  i32.const -16
  i32.and
  i32.const 4
  i32.sub
  local.get $1
  i32.const 12
  i32.le_u
  select
  local.tee $3
  call $~lib/rt/tlsf/searchBlock
  local.tee $1
  i32.eqz
  if
   local.get $3
   i32.const 256
   i32.ge_u
   if (result i32)
    local.get $3
    call $~lib/rt/tlsf/roundSize
   else
    local.get $3
   end
   i32.const 4
   local.get $0
   i32.load offset=1568
   memory.size
   local.tee $1
   i32.const 16
   i32.shl
   i32.const 4
   i32.sub
   i32.ne
   i32.shl
   i32.add
   i32.const 65535
   i32.add
   i32.const -65536
   i32.and
   i32.const 16
   i32.shr_u
   local.set $2
   local.get $1
   local.get $2
   local.get $1
   local.get $2
   i32.gt_s
   select
   memory.grow
   i32.const 0
   i32.lt_s
   if
    local.get $2
    memory.grow
    i32.const 0
    i32.lt_s
    if
     unreachable
    end
   end
   local.get $0
   local.get $1
   i32.const 16
   i32.shl
   memory.size
   i64.extend_i32_s
   i64.const 16
   i64.shl
   call $~lib/rt/tlsf/addMemory
   local.get $0
   local.get $3
   call $~lib/rt/tlsf/searchBlock
   local.tee $1
   i32.eqz
   if
    i32.const 0
    i32.const 1392
    i32.const 499
    i32.const 16
    call $~lib/builtins/abort
    unreachable
   end
  end
  local.get $3
  local.get $1
  i32.load
  i32.const -4
  i32.and
  i32.gt_u
  if
   i32.const 0
   i32.const 1392
   i32.const 501
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $0
  local.get $1
  call $~lib/rt/tlsf/removeBlock
  local.get $1
  i32.load
  local.set $4
  local.get $3
  i32.const 4
  i32.add
  i32.const 15
  i32.and
  if
   i32.const 0
   i32.const 1392
   i32.const 361
   i32.const 14
   call $~lib/builtins/abort
   unreachable
  end
  local.get $4
  i32.const -4
  i32.and
  local.get $3
  i32.sub
  local.tee $2
  i32.const 16
  i32.ge_u
  if
   local.get $1
   local.get $3
   local.get $4
   i32.const 2
   i32.and
   i32.or
   i32.store
   local.get $1
   i32.const 4
   i32.add
   local.get $3
   i32.add
   local.tee $3
   local.get $2
   i32.const 4
   i32.sub
   i32.const 1
   i32.or
   i32.store
   local.get $0
   local.get $3
   call $~lib/rt/tlsf/insertBlock
  else
   local.get $1
   local.get $4
   i32.const -2
   i32.and
   i32.store
   local.get $1
   i32.const 4
   i32.add
   local.get $1
   i32.load
   i32.const -4
   i32.and
   i32.add
   local.tee $0
   local.get $0
   i32.load
   i32.const -3
   i32.and
   i32.store
  end
  local.get $1
 )
 (func $~lib/rt/itcms/__unpin (param $0 i32)
  local.get $0
  i32.eqz
  if
   return
  end
  local.get $0
  i32.const 20
  i32.sub
  local.tee $0
  i32.load offset=4
  i32.const 3
  i32.and
  i32.const 3
  i32.ne
  if
   i32.const 5936
   i32.const 1120
   i32.const 352
   i32.const 5
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/rt/itcms/state
  i32.const 1
  i32.eq
  if
   local.get $0
   call $~lib/rt/itcms/Object#makeGray
  else
   local.get $0
   call $~lib/rt/itcms/Object#unlink
   local.get $0
   global.get $~lib/rt/itcms/fromSpace
   global.get $~lib/rt/itcms/white
   call $~lib/rt/itcms/Object#linkTo
  end
 )
 (func $~lib/rt/itcms/__pin (param $0 i32) (result i32)
  (local $1 i32)
  local.get $0
  if
   local.get $0
   i32.const 20
   i32.sub
   local.tee $1
   i32.load offset=4
   i32.const 3
   i32.and
   i32.const 3
   i32.eq
   if
    i32.const 5872
    i32.const 1120
    i32.const 338
    i32.const 7
    call $~lib/builtins/abort
    unreachable
   end
   local.get $1
   call $~lib/rt/itcms/Object#unlink
   local.get $1
   global.get $~lib/rt/itcms/pinSpace
   i32.const 3
   call $~lib/rt/itcms/Object#linkTo
  end
  local.get $0
 )
 (func $~lib/rt/itcms/__collect
  global.get $~lib/rt/itcms/state
  i32.const 0
  i32.gt_s
  if
   loop $while-continue|0
    global.get $~lib/rt/itcms/state
    if
     call $~lib/rt/itcms/step
     drop
     br $while-continue|0
    end
   end
  end
  call $~lib/rt/itcms/step
  drop
  loop $while-continue|1
   global.get $~lib/rt/itcms/state
   if
    call $~lib/rt/itcms/step
    drop
    br $while-continue|1
   end
  end
  global.get $~lib/rt/itcms/total
  i64.extend_i32_u
  i64.const 200
  i64.mul
  i64.const 100
  i64.div_u
  i32.wrap_i64
  i32.const 1024
  i32.add
  global.set $~lib/rt/itcms/threshold
 )
 (func $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set" (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store
  local.get $1
  call $~lib/util/hash/HASH<~lib/string/String>
  local.set $3
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $0
  local.get $1
  local.get $3
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#find"
  local.tee $4
  if
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store
   local.get $4
   local.get $2
   i32.store offset=4
   local.get $0
   local.get $2
   i32.const 1
   call $~lib/rt/itcms/__link
  else
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $0
   i32.load offset=16
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $0
   i32.load offset=12
   i32.eq
   if
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=4
    local.get $0
    i32.load offset=20
    local.set $4
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=4
    local.get $0
    local.get $4
    local.get $0
    i32.load offset=12
    i32.const 3
    i32.mul
    i32.const 4
    i32.div_s
    i32.lt_s
    if (result i32)
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store offset=4
     local.get $0
     i32.load offset=4
    else
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store offset=4
     local.get $0
     i32.load offset=4
     i32.const 1
     i32.shl
     i32.const 1
     i32.or
    end
    call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#rehash"
   end
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.load offset=8
   local.tee $4
   i32.store offset=8
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=4
   local.get $0
   local.get $0
   i32.load offset=16
   local.tee $5
   i32.const 1
   i32.add
   i32.store offset=16
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store
   local.get $4
   local.get $5
   i32.const 12
   i32.mul
   i32.add
   local.tee $4
   local.get $1
   i32.store
   local.get $0
   local.get $1
   i32.const 1
   call $~lib/rt/itcms/__link
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store
   local.get $4
   local.get $2
   i32.store offset=4
   local.get $0
   local.get $2
   i32.const 1
   call $~lib/rt/itcms/__link
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=4
   local.get $0
   local.get $0
   i32.load offset=20
   i32.const 1
   i32.add
   i32.store offset=20
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $0
   i32.load
   local.set $1
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $4
   local.get $1
   local.get $3
   local.get $0
   i32.load offset=4
   i32.and
   i32.const 2
   i32.shl
   i32.add
   local.tee $0
   i32.load
   i32.store offset=8
   local.get $0
   local.get $4
   i32.store
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#rehash" (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 20
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.const 20
  memory.fill
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.const 1
  i32.add
  local.tee $2
  i32.const 2
  i32.shl
  call $~lib/arraybuffer/ArrayBuffer#constructor
  local.tee $7
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.const 3
  i32.shl
  i32.const 3
  i32.div_s
  local.tee $6
  i32.const 12
  i32.mul
  call $~lib/arraybuffer/ArrayBuffer#constructor
  local.tee $3
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=8
  local.get $0
  i32.load offset=8
  local.set $8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=8
  local.get $8
  local.get $0
  i32.load offset=16
  i32.const 12
  i32.mul
  i32.add
  local.set $5
  local.get $3
  local.set $2
  loop $while-continue|0
   local.get $5
   local.get $8
   i32.ne
   if
    local.get $8
    i32.load offset=8
    i32.const 1
    i32.and
    i32.eqz
    if
     global.get $~lib/memory/__stack_pointer
     local.get $8
     i32.load
     local.tee $9
     i32.store offset=12
     global.get $~lib/memory/__stack_pointer
     local.get $9
     i32.store offset=8
     local.get $2
     local.get $9
     i32.store
     global.get $~lib/memory/__stack_pointer
     local.get $8
     i32.load offset=4
     local.tee $4
     i32.store offset=8
     local.get $2
     local.get $4
     i32.store offset=4
     global.get $~lib/memory/__stack_pointer
     local.get $9
     i32.store offset=8
     local.get $2
     local.get $7
     local.get $9
     call $~lib/util/hash/HASH<~lib/string/String>
     local.get $1
     i32.and
     i32.const 2
     i32.shl
     i32.add
     local.tee $4
     i32.load
     i32.store offset=8
     local.get $4
     local.get $2
     i32.store
     local.get $2
     i32.const 12
     i32.add
     local.set $2
    end
    local.get $8
    i32.const 12
    i32.add
    local.set $8
    br $while-continue|0
   end
  end
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $7
  i32.store offset=16
  local.get $0
  local.get $7
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:buckets"
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=8
  local.get $0
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=16
  local.get $0
  local.get $3
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:entries"
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=8
  local.get $0
  local.get $6
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=16
  local.get $0
  local.get $0
  i32.load offset=20
  i32.store offset=16
  global.get $~lib/memory/__stack_pointer
  i32.const 20
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $"~lib/map/Map<i32,~lib/string/String>#set" (param $0 i32) (param $1 i32) (param $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  local.get $1
  local.get $1
  call $~lib/util/hash/HASH<i32>
  local.tee $3
  call $"~lib/map/Map<i32,~lib/string/String>#find"
  local.tee $4
  if
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store
   local.get $4
   local.get $2
   i32.store offset=4
   local.get $0
   local.get $2
   i32.const 1
   call $~lib/rt/itcms/__link
  else
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $0
   i32.load offset=16
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $0
   i32.load offset=12
   i32.eq
   if
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=4
    local.get $0
    i32.load offset=20
    local.set $4
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=4
    local.get $0
    local.get $4
    local.get $0
    i32.load offset=12
    i32.const 3
    i32.mul
    i32.const 4
    i32.div_s
    i32.lt_s
    if (result i32)
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store offset=4
     local.get $0
     i32.load offset=4
    else
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store offset=4
     local.get $0
     i32.load offset=4
     i32.const 1
     i32.shl
     i32.const 1
     i32.or
    end
    call $"~lib/map/Map<i32,~lib/string/String>#rehash"
   end
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.load offset=8
   local.tee $4
   i32.store offset=8
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=4
   local.get $0
   local.get $0
   i32.load offset=16
   local.tee $5
   i32.const 1
   i32.add
   i32.store offset=16
   local.get $4
   local.get $5
   i32.const 12
   i32.mul
   i32.add
   local.tee $4
   local.get $1
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store
   local.get $4
   local.get $2
   i32.store offset=4
   local.get $0
   local.get $2
   i32.const 1
   call $~lib/rt/itcms/__link
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=4
   local.get $0
   local.get $0
   i32.load offset=20
   i32.const 1
   i32.add
   i32.store offset=20
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $0
   i32.load
   local.set $1
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $4
   local.get $1
   local.get $3
   local.get $0
   i32.load offset=4
   i32.and
   i32.const 2
   i32.shl
   i32.add
   local.tee $0
   i32.load
   i32.store offset=8
   local.get $0
   local.get $4
   i32.store
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $"~lib/map/Map<i32,~lib/string/String>#rehash" (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  (local $7 i32)
  (local $8 i32)
  (local $9 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.const 1
  i32.add
  local.tee $2
  i32.const 2
  i32.shl
  call $~lib/arraybuffer/ArrayBuffer#constructor
  local.tee $7
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.const 3
  i32.shl
  i32.const 3
  i32.div_s
  local.tee $6
  i32.const 12
  i32.mul
  call $~lib/arraybuffer/ArrayBuffer#constructor
  local.tee $3
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=8
  local.get $0
  i32.load offset=8
  local.set $8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=8
  local.get $8
  local.get $0
  i32.load offset=16
  i32.const 12
  i32.mul
  i32.add
  local.set $5
  local.get $3
  local.set $2
  loop $while-continue|0
   local.get $5
   local.get $8
   i32.ne
   if
    local.get $8
    i32.load offset=8
    i32.const 1
    i32.and
    i32.eqz
    if
     local.get $2
     local.get $8
     i32.load
     local.tee $9
     i32.store
     global.get $~lib/memory/__stack_pointer
     local.get $8
     i32.load offset=4
     local.tee $4
     i32.store offset=8
     local.get $2
     local.get $4
     i32.store offset=4
     local.get $2
     local.get $7
     local.get $9
     call $~lib/util/hash/HASH<i32>
     local.get $1
     i32.and
     i32.const 2
     i32.shl
     i32.add
     local.tee $4
     i32.load
     i32.store offset=8
     local.get $4
     local.get $2
     i32.store
     local.get $2
     i32.const 12
     i32.add
     local.set $2
    end
    local.get $8
    i32.const 12
    i32.add
    local.set $8
    br $while-continue|0
   end
  end
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $7
  i32.store offset=12
  local.get $0
  local.get $7
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:buckets"
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=8
  local.get $0
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=12
  local.get $0
  local.get $3
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:entries"
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=8
  local.get $0
  local.get $6
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=12
  local.get $0
  local.get $0
  i32.load offset=20
  i32.store offset=16
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $~lib/arraybuffer/ArrayBufferView#constructor (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store offset=8
  local.get $0
  i32.eqz
  if
   global.get $~lib/memory/__stack_pointer
   i32.const 12
   i32.const 3
   call $~lib/rt/itcms/__new
   local.tee $0
   i32.store
  end
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  i32.const 0
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:buckets"
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=8
  local.get $1
  i32.const 268435455
  i32.gt_u
  if
   i32.const 1456
   i32.const 1504
   i32.const 19
   i32.const 57
   call $~lib/builtins/abort
   unreachable
  end
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.const 2
  i32.shl
  local.tee $2
  i32.const 1
  call $~lib/rt/itcms/__new
  local.tee $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=12
  local.get $0
  local.get $1
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:buckets"
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  local.get $2
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
 )
 (func $~lib/array/ensureCapacity (param $0 i32) (param $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $1
  local.get $0
  i32.load offset=8
  local.tee $2
  i32.const 2
  i32.shr_u
  i32.gt_u
  if
   local.get $1
   i32.const 268435455
   i32.gt_u
   if
    i32.const 1456
    i32.const 1568
    i32.const 19
    i32.const 48
    call $~lib/builtins/abort
    unreachable
   end
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   block $__inlined_func$~lib/rt/itcms/__renew$294
    i32.const 1073741820
    local.get $2
    i32.const 1
    i32.shl
    local.tee $2
    local.get $2
    i32.const 1073741820
    i32.ge_u
    select
    local.tee $2
    i32.const 8
    local.get $1
    local.get $1
    i32.const 8
    i32.le_u
    select
    i32.const 2
    i32.shl
    local.tee $1
    local.get $1
    local.get $2
    i32.lt_u
    select
    local.tee $3
    local.get $0
    i32.load
    local.tee $2
    i32.const 20
    i32.sub
    local.tee $4
    i32.load
    i32.const -4
    i32.and
    i32.const 16
    i32.sub
    i32.le_u
    if
     local.get $4
     local.get $3
     i32.store offset=16
     local.get $2
     local.set $1
     br $__inlined_func$~lib/rt/itcms/__renew$294
    end
    local.get $3
    local.get $4
    i32.load offset=12
    call $~lib/rt/itcms/__new
    local.tee $1
    local.get $2
    local.get $3
    local.get $4
    i32.load offset=16
    local.tee $4
    local.get $3
    local.get $4
    i32.lt_u
    select
    memory.copy
   end
   local.get $1
   local.get $2
   i32.ne
   if
    local.get $0
    local.get $1
    i32.store
    local.get $0
    local.get $1
    i32.store offset=4
    local.get $0
    local.get $1
    i32.const 0
    call $~lib/rt/itcms/__link
   end
   local.get $0
   local.get $3
   i32.store offset=8
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $start:assembly/metadata
  (local $0 i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  (local $4 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 24
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.const 24
  memory.fill
  memory.size
  i32.const 16
  i32.shl
  i32.const 38808
  i32.sub
  i32.const 1
  i32.shr_u
  global.set $~lib/rt/itcms/threshold
  i32.const 1168
  call $~lib/rt/itcms/initLazy
  global.set $~lib/rt/itcms/pinSpace
  i32.const 1200
  call $~lib/rt/itcms/initLazy
  global.set $~lib/rt/itcms/toSpace
  i32.const 1344
  call $~lib/rt/itcms/initLazy
  global.set $~lib/rt/itcms/fromSpace
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  i32.const 24
  i32.const 7
  call $~lib/rt/itcms/__new
  local.tee $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  i32.const 16
  call $~lib/arraybuffer/ArrayBuffer#constructor
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  local.get $0
  local.get $1
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:buckets"
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  i32.const 3
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  i32.const 48
  call $~lib/arraybuffer/ArrayBuffer#constructor
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  local.get $0
  local.get $1
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:entries"
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  i32.const 4
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=16
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=20
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
  global.set $assembly/metadata/REGION_METADATA
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  i32.const 24
  i32.const 8
  call $~lib/rt/itcms/__new
  local.tee $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  i32.const 16
  call $~lib/arraybuffer/ArrayBuffer#constructor
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  local.get $0
  local.get $1
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:buckets"
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  i32.const 3
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  i32.const 48
  call $~lib/arraybuffer/ArrayBuffer#constructor
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  local.get $0
  local.get $1
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:entries"
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  i32.const 4
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=16
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=20
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
  global.set $assembly/metadata/CODE_TO_REGION
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store offset=8
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.const 6
  call $~lib/rt/itcms/__new
  local.tee $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  i32.const 0
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:buckets"
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  i32.const 32
  i32.const 1
  call $~lib/rt/itcms/__new
  local.tee $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=12
  local.get $0
  local.get $1
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:buckets"
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  i32.const 32
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $0
  i32.const 0
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
  global.set $assembly/metadata/REGION_LIST
  i32.const 1
  i32.const 5
  i32.const 1680
  call $~lib/rt/__newArray
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  i32.const 0
  i32.const 6
  i32.const 1712
  call $~lib/rt/__newArray
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  i32.const 0
  i32.const 6
  i32.const 1744
  call $~lib/rt/__newArray
  local.set $2
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.store offset=12
  i32.const 3
  i32.const 5
  i32.const 1776
  call $~lib/rt/__newArray
  local.set $3
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=16
  i32.const 3
  i32.const 5
  i32.const 1808
  call $~lib/rt/__newArray
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=20
  i32.const 1616
  i32.const 1
  i32.const 1648
  local.get $0
  local.get $1
  local.get $2
  local.get $3
  local.get $4
  i32.const 1840
  call $assembly/metadata/PhoneMetadata#constructor
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.const 1
  call $assembly/metadata/register
  i32.const 1
  i32.const 5
  i32.const 1920
  call $~lib/rt/__newArray
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  i32.const 0
  i32.const 6
  i32.const 1952
  call $~lib/rt/__newArray
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  i32.const 0
  i32.const 6
  i32.const 1984
  call $~lib/rt/__newArray
  local.set $2
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.store offset=12
  i32.const 3
  i32.const 5
  i32.const 2016
  call $~lib/rt/__newArray
  local.set $3
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=16
  i32.const 3
  i32.const 5
  i32.const 2048
  call $~lib/rt/__newArray
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=20
  i32.const 1888
  i32.const 1
  i32.const 1648
  local.get $0
  local.get $1
  local.get $2
  local.get $3
  local.get $4
  i32.const 2080
  call $assembly/metadata/PhoneMetadata#constructor
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.const 0
  call $assembly/metadata/register
  i32.const 2
  i32.const 5
  i32.const 2192
  call $~lib/rt/__newArray
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  i32.const 1
  i32.const 6
  i32.const 2256
  call $~lib/rt/__newArray
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  i32.const 4
  i32.const 6
  i32.const 2384
  call $~lib/rt/__newArray
  local.set $2
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.store offset=12
  i32.const 2
  i32.const 5
  i32.const 2432
  call $~lib/rt/__newArray
  local.set $3
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=16
  i32.const 2
  i32.const 5
  i32.const 2464
  call $~lib/rt/__newArray
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=20
  i32.const 2128
  i32.const 44
  i32.const 2160
  local.get $0
  local.get $1
  local.get $2
  local.get $3
  local.get $4
  i32.const 2496
  call $assembly/metadata/PhoneMetadata#constructor
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.const 1
  call $assembly/metadata/register
  i32.const 1
  i32.const 5
  i32.const 2576
  call $~lib/rt/__newArray
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  i32.const 2
  i32.const 6
  i32.const 2640
  call $~lib/rt/__newArray
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  i32.const 7
  i32.const 6
  i32.const 2768
  call $~lib/rt/__newArray
  local.set $2
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.store offset=12
  i32.const 5
  i32.const 5
  i32.const 2816
  call $~lib/rt/__newArray
  local.set $3
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=16
  i32.const 5
  i32.const 5
  i32.const 2864
  call $~lib/rt/__newArray
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=20
  i32.const 2544
  i32.const 33
  i32.const 2160
  local.get $0
  local.get $1
  local.get $2
  local.get $3
  local.get $4
  i32.const 2912
  call $assembly/metadata/PhoneMetadata#constructor
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.const 1
  call $assembly/metadata/register
  i32.const 5
  i32.const 5
  i32.const 2992
  call $~lib/rt/__newArray
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  i32.const 3
  i32.const 6
  i32.const 3136
  call $~lib/rt/__newArray
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  i32.const 0
  i32.const 6
  i32.const 3168
  call $~lib/rt/__newArray
  local.set $2
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.store offset=12
  i32.const 2
  i32.const 5
  i32.const 3200
  call $~lib/rt/__newArray
  local.set $3
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=16
  i32.const 2
  i32.const 5
  i32.const 3232
  call $~lib/rt/__newArray
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=20
  i32.const 2960
  i32.const 49
  i32.const 2160
  local.get $0
  local.get $1
  local.get $2
  local.get $3
  local.get $4
  i32.const 3264
  call $assembly/metadata/PhoneMetadata#constructor
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.const 1
  call $assembly/metadata/register
  i32.const 1
  i32.const 5
  i32.const 3344
  call $~lib/rt/__newArray
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  i32.const 1
  i32.const 6
  i32.const 3376
  call $~lib/rt/__newArray
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  i32.const 4
  i32.const 6
  i32.const 3408
  call $~lib/rt/__newArray
  local.set $2
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.store offset=12
  i32.const 3
  i32.const 5
  i32.const 3456
  call $~lib/rt/__newArray
  local.set $3
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=16
  i32.const 3
  i32.const 5
  i32.const 3488
  call $~lib/rt/__newArray
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=20
  i32.const 3312
  i32.const 61
  i32.const 2160
  local.get $0
  local.get $1
  local.get $2
  local.get $3
  local.get $4
  i32.const 3520
  call $assembly/metadata/PhoneMetadata#constructor
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.const 1
  call $assembly/metadata/register
  i32.const 1
  i32.const 5
  i32.const 3600
  call $~lib/rt/__newArray
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  i32.const 4
  i32.const 6
  i32.const 3632
  call $~lib/rt/__newArray
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  i32.const 5
  i32.const 6
  i32.const 3680
  call $~lib/rt/__newArray
  local.set $2
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.store offset=12
  i32.const 2
  i32.const 5
  i32.const 3728
  call $~lib/rt/__newArray
  local.set $3
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=16
  i32.const 2
  i32.const 5
  i32.const 3760
  call $~lib/rt/__newArray
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=20
  i32.const 3568
  i32.const 91
  i32.const 2160
  local.get $0
  local.get $1
  local.get $2
  local.get $3
  local.get $4
  i32.const 3792
  call $assembly/metadata/PhoneMetadata#constructor
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.const 1
  call $assembly/metadata/register
  i32.const 2
  i32.const 5
  i32.const 3872
  call $~lib/rt/__newArray
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  i32.const 3
  i32.const 6
  i32.const 4000
  call $~lib/rt/__newArray
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  i32.const 2
  i32.const 6
  i32.const 4032
  call $~lib/rt/__newArray
  local.set $2
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.store offset=12
  i32.const 3
  i32.const 5
  i32.const 4064
  call $~lib/rt/__newArray
  local.set $3
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=16
  i32.const 3
  i32.const 5
  i32.const 4096
  call $~lib/rt/__newArray
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=20
  i32.const 3840
  i32.const 81
  i32.const 2160
  local.get $0
  local.get $1
  local.get $2
  local.get $3
  local.get $4
  i32.const 4128
  call $assembly/metadata/PhoneMetadata#constructor
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.const 1
  call $assembly/metadata/register
  i32.const 2
  i32.const 5
  i32.const 4208
  call $~lib/rt/__newArray
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  i32.const 4
  i32.const 6
  i32.const 4240
  call $~lib/rt/__newArray
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  i32.const 4
  i32.const 6
  i32.const 4288
  call $~lib/rt/__newArray
  local.set $2
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.store offset=12
  i32.const 3
  i32.const 5
  i32.const 4336
  call $~lib/rt/__newArray
  local.set $3
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=16
  i32.const 3
  i32.const 5
  i32.const 4368
  call $~lib/rt/__newArray
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=20
  i32.const 4176
  i32.const 55
  i32.const 2160
  local.get $0
  local.get $1
  local.get $2
  local.get $3
  local.get $4
  i32.const 4400
  call $assembly/metadata/PhoneMetadata#constructor
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.const 1
  call $assembly/metadata/register
  i32.const 1
  i32.const 5
  i32.const 4480
  call $~lib/rt/__newArray
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  i32.const 1
  i32.const 6
  i32.const 4512
  call $~lib/rt/__newArray
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  i32.const 0
  i32.const 6
  i32.const 4544
  call $~lib/rt/__newArray
  local.set $2
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.store offset=12
  i32.const 3
  i32.const 5
  i32.const 4576
  call $~lib/rt/__newArray
  local.set $3
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=16
  i32.const 3
  i32.const 5
  i32.const 4608
  call $~lib/rt/__newArray
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=20
  i32.const 4448
  i32.const 86
  i32.const 2160
  local.get $0
  local.get $1
  local.get $2
  local.get $3
  local.get $4
  i32.const 4640
  call $assembly/metadata/PhoneMetadata#constructor
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.const 1
  call $assembly/metadata/register
  i32.const 1
  i32.const 5
  i32.const 4720
  call $~lib/rt/__newArray
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  i32.const 1
  i32.const 6
  i32.const 4752
  call $~lib/rt/__newArray
  local.set $1
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  i32.const 3
  i32.const 6
  i32.const 4784
  call $~lib/rt/__newArray
  local.set $2
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.store offset=12
  i32.const 4
  i32.const 5
  i32.const 4816
  call $~lib/rt/__newArray
  local.set $3
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=16
  i32.const 4
  i32.const 5
  i32.const 4864
  call $~lib/rt/__newArray
  local.set $4
  global.get $~lib/memory/__stack_pointer
  local.get $4
  i32.store offset=20
  i32.const 4688
  i32.const 7
  i32.const 2352
  local.get $0
  local.get $1
  local.get $2
  local.get $3
  local.get $4
  i32.const 4912
  call $assembly/metadata/PhoneMetadata#constructor
  local.set $0
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.const 1
  call $assembly/metadata/register
  global.get $~lib/memory/__stack_pointer
  i32.const 24
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $export:assembly/regex/reTest (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  local.get $1
  local.get $2
  call $assembly/regex/Program#constructor
  local.tee $0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=4
  local.get $0
  local.get $3
  i32.const 0
  local.get $4
  call $assembly/regex/matchProgram
  i32.eqz
  i32.eqz
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.add
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $export:assembly/regex/reCaptures (param $0 i32) (param $1 i32) (param $2 i32) (param $3 i32) (param $4 i32) (param $5 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  local.get $1
  local.get $2
  call $assembly/regex/Program#constructor
  local.tee $0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  local.get $3
  local.get $4
  local.get $5
  call $assembly/regex/matchProgram
  local.tee $0
  i32.store offset=12
  local.get $0
  i32.eqz
  if
   i32.const 0
   call $~lib/typedarray/Int32Array#constructor
   local.set $0
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.add
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
 )
 (func $export:assembly/index/isValidNumberForRegion (param $0 i32) (param $1 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $0
  local.get $1
  call $assembly/index/isValidNumberForRegion
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $export:assembly/index/isValidNumber (param $0 i32) (param $1 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $0
  local.get $1
  call $assembly/index/isValidNumber
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $export:assembly/index/isPossibleNumber (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  i32.const 20
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.const 20
  memory.fill
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  local.get $1
  call $assembly/index/parse
  local.tee $1
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store
  local.get $1
  i32.load8_u
  if (result i32)
   global.get $~lib/memory/__stack_pointer
   global.get $assembly/metadata/REGION_METADATA
   local.tee $0
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=12
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.load offset=8
   local.tee $2
   i32.store offset=4
   global.get $~lib/memory/__stack_pointer
   local.get $0
   local.get $2
   call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#get"
   local.tee $0
   i32.store offset=16
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=12
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.load offset=12
   local.tee $1
   i32.store offset=4
   local.get $1
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const 1
   i32.shr_u
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $0
   call $assembly/index/isPossibleLength
  else
   i32.const 0
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 20
  i32.add
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $export:assembly/index/getRegionCodeForNumber (param $0 i32) (param $1 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  local.get $1
  call $assembly/index/parse
  local.tee $0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.load8_u
  if (result i32)
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $0
   i32.load offset=8
  else
   i32.const 5072
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.add
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $export:assembly/index/getNumberType (param $0 i32) (param $1 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $0
  local.get $1
  call $assembly/index/getNumberType
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $export:assembly/index/getNationalSignificantNumber (param $0 i32) (param $1 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  local.get $1
  call $assembly/index/parse
  local.tee $0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  i32.load8_u
  if (result i32)
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $0
   i32.load offset=12
  else
   i32.const 5072
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.add
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $export:assembly/index/getExampleNumber (param $0 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  local.get $0
  call $assembly/index/getExampleNumber
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $export:assembly/index/getCountryCodeForRegion (param $0 i32) (result i32)
  (local $1 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  global.get $assembly/metadata/REGION_METADATA
  local.tee $1
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  local.get $1
  local.get $0
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#has"
  if (result i32)
   global.get $~lib/memory/__stack_pointer
   global.get $assembly/metadata/REGION_METADATA
   local.tee $1
   i32.store offset=4
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=8
   local.get $1
   local.get $0
   call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#get"
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $0
   i32.load offset=4
  else
   i32.const 0
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 12
  i32.add
  global.set $~lib/memory/__stack_pointer
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $export:assembly/index/formatAsYouType (param $0 i32) (param $1 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $0
  local.get $1
  call $assembly/index/formatAsYouType
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $export:assembly/index/format (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  local.get $0
  local.get $1
  local.get $2
  call $assembly/index/format
  global.get $~lib/memory/__stack_pointer
  i32.const 8
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $assembly/regex/Runner#constructor (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  (local $3 i32)
  (local $4 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store offset=8
  global.get $~lib/memory/__stack_pointer
  i32.const 20
  i32.const 12
  call $~lib/rt/itcms/__new
  local.tee $3
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=4
  local.get $3
  i32.const 0
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:buckets"
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=4
  local.get $3
  i32.const 0
  call $assembly/regex/Program#set:classes
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=4
  local.get $3
  i32.const 0
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:entries"
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=4
  local.get $3
  i32.const 0
  i32.store8 offset=12
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=4
  local.get $3
  i32.const 0
  i32.store offset=16
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.load
  local.tee $4
  i32.store offset=8
  local.get $3
  local.get $4
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:buckets"
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=12
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.load offset=4
  local.tee $0
  i32.store offset=8
  local.get $3
  local.get $0
  call $assembly/regex/Program#set:classes
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  local.get $3
  local.get $1
  call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#set:entries"
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=4
  local.get $3
  local.get $2
  i32.store8 offset=12
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=8
  local.get $3
  local.get $1
  i32.const 20
  i32.sub
  i32.load offset=16
  i32.const 1
  i32.shr_u
  i32.store offset=16
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $3
 )
 (func $assembly/index/stripNationalPrefix (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.load offset=8
  local.tee $2
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.store
  block $folding-inner1
   local.get $2
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const 1
   i32.shr_u
   i32.eqz
   br_if $folding-inner1
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=8
   local.get $0
   local.get $2
   call $~lib/string/String#startsWith
   i32.eqz
   br_if $folding-inner1
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=8
   local.get $2
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const 1
   i32.shr_u
   local.set $2
   i32.const 1
   global.set $~argumentsLength
   global.get $~lib/memory/__stack_pointer
   local.get $0
   local.get $2
   call $~lib/string/String#substring@varargs
   local.tee $2
   i32.store offset=12
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=8
   local.get $2
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const 1
   i32.shr_u
   local.set $3
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store
   local.get $2
   local.get $0
   local.get $3
   local.get $1
   call $assembly/index/isPossibleLength
   select
   local.set $0
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
 )
 (func $assembly/index/isValidNumberForRegion (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  local.get $1
  call $assembly/index/parse
  local.tee $2
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.store
  block $folding-inner1 (result i32)
   block $folding-inner0
    local.get $2
    i32.load8_u
    i32.eqz
    br_if $folding-inner0
    global.get $~lib/memory/__stack_pointer
    local.get $2
    i32.store offset=12
    global.get $~lib/memory/__stack_pointer
    local.get $2
    i32.load offset=8
    local.tee $2
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store offset=4
    global.get $~lib/memory/__stack_pointer
    i32.const 8
    i32.sub
    global.set $~lib/memory/__stack_pointer
    call $~stack_check
    global.get $~lib/memory/__stack_pointer
    i64.const 0
    i64.store
    global.get $~lib/memory/__stack_pointer
    local.get $2
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store offset=4
    local.get $2
    local.get $1
    call $~lib/string/String.__eq
    i32.eqz
    global.get $~lib/memory/__stack_pointer
    i32.const 8
    i32.add
    global.set $~lib/memory/__stack_pointer
    br_if $folding-inner0
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store offset=4
    local.get $0
    local.get $1
    call $assembly/index/isValidNumber
    br $folding-inner1
   end
   i32.const 0
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $assembly/index/getSupportedRegions (result i32)
  (local $0 i32)
  (local $1 i32)
  (local $2 i32)
  (local $3 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store
  global.get $~lib/memory/__stack_pointer
  i64.const 0
  i64.store offset=8
  i32.const 5072
  local.set $0
  global.get $~lib/memory/__stack_pointer
  i32.const 5072
  i32.store
  loop $for-loop|0
   global.get $~lib/memory/__stack_pointer
   global.get $assembly/metadata/REGION_LIST
   local.tee $2
   i32.store offset=4
   local.get $2
   call $~lib/array/Array<i32>#get:length
   local.get $1
   i32.gt_s
   if
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=4
    local.get $0
    i32.const 20
    i32.sub
    i32.load offset=16
    i32.const 1
    i32.shr_u
    if
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store offset=4
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.const 5584
     call $~lib/string/String.__concat
     local.tee $0
     i32.store
    end
    global.get $~lib/memory/__stack_pointer
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=4
    global.get $~lib/memory/__stack_pointer
    global.get $assembly/metadata/REGION_LIST
    local.tee $3
    i32.store offset=12
    local.get $3
    local.get $1
    call $~lib/array/Array<~lib/string/String>#__get
    local.set $3
    global.get $~lib/memory/__stack_pointer
    local.get $3
    i32.store offset=8
    local.get $0
    local.get $3
    call $~lib/string/String.__concat
    local.tee $0
    i32.store
    local.get $1
    i32.const 1
    i32.add
    local.set $1
    br $for-loop|0
   end
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 16
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
 )
 (func $assembly/index/getRegionCodeForCountryCode (param $0 i32) (result i32)
  (local $1 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.store
  global.get $~lib/memory/__stack_pointer
  global.get $assembly/metadata/CODE_TO_REGION
  local.tee $1
  i32.store
  local.get $1
  local.get $0
  call $"~lib/map/Map<i32,~lib/string/String>#has"
  if (result i32)
   global.get $~lib/memory/__stack_pointer
   global.get $assembly/metadata/CODE_TO_REGION
   local.tee $1
   i32.store
   local.get $1
   local.get $0
   call $"~lib/map/Map<i32,~lib/string/String>#get"
  else
   i32.const 5072
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 4
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $assembly/index/getExampleNumber (param $0 i32) (result i32)
  (local $1 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 20
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.const 20
  memory.fill
  global.get $~lib/memory/__stack_pointer
  global.get $assembly/metadata/REGION_METADATA
  local.tee $1
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store offset=4
  block $folding-inner1 (result i32)
   block $folding-inner0
    local.get $1
    local.get $0
    call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#has"
    i32.eqz
    br_if $folding-inner0
    global.get $~lib/memory/__stack_pointer
    global.get $assembly/metadata/REGION_METADATA
    local.tee $1
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=4
    global.get $~lib/memory/__stack_pointer
    local.get $1
    local.get $0
    call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#get"
    local.tee $0
    i32.store offset=8
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=4
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.load offset=32
    local.tee $1
    i32.store
    local.get $1
    i32.const 20
    i32.sub
    i32.load offset=16
    i32.const 1
    i32.shr_u
    i32.eqz
    br_if $folding-inner0
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=16
    local.get $0
    i32.load offset=4
    call $~lib/util/number/itoa32
    local.set $1
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store offset=12
    i32.const 5616
    local.get $1
    call $~lib/string/String.__concat
    local.set $1
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=12
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.load offset=32
    local.tee $0
    i32.store offset=4
    local.get $1
    local.get $0
    call $~lib/string/String.__concat
    br $folding-inner1
   end
   i32.const 5072
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 20
  i32.add
  global.set $~lib/memory/__stack_pointer
 )
 (func $assembly/index/formatNanpPartial (param $0 i32) (result i32)
  (local $1 i32)
  (local $2 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 40
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.const 40
  memory.fill
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  block $folding-inner0
   local.get $0
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const 1
   i32.shr_u
   local.tee $1
   i32.const 3
   i32.le_u
   br_if $folding-inner0
   local.get $1
   i32.const 6
   i32.le_s
   if
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=16
    local.get $0
    i32.const 0
    i32.const 3
    call $~lib/string/String#substring
    local.set $1
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store offset=12
    i32.const 5712
    local.get $1
    call $~lib/string/String.__concat
    local.set $1
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store offset=8
    local.get $1
    i32.const 5744
    call $~lib/string/String.__concat
    local.set $1
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=8
    i32.const 1
    global.set $~argumentsLength
    local.get $0
    i32.const 3
    call $~lib/string/String#substring@varargs
    local.set $0
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=4
    local.get $1
    local.get $0
    call $~lib/string/String.__concat
    local.set $0
    br $folding-inner0
   end
   local.get $1
   i32.const 10
   i32.le_s
   if
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=28
    local.get $0
    i32.const 0
    i32.const 3
    call $~lib/string/String#substring
    local.set $1
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store offset=24
    i32.const 5712
    local.get $1
    call $~lib/string/String.__concat
    local.set $1
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store offset=20
    local.get $1
    i32.const 5744
    call $~lib/string/String.__concat
    local.set $1
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store offset=12
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=20
    local.get $0
    i32.const 3
    i32.const 6
    call $~lib/string/String#substring
    local.set $2
    global.get $~lib/memory/__stack_pointer
    local.get $2
    i32.store offset=16
    local.get $1
    local.get $2
    call $~lib/string/String.__concat
    local.set $1
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store offset=8
    local.get $1
    i32.const 5776
    call $~lib/string/String.__concat
    local.set $1
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=8
    i32.const 1
    global.set $~argumentsLength
    local.get $0
    i32.const 6
    call $~lib/string/String#substring@varargs
    local.set $0
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=4
    local.get $1
    local.get $0
    call $~lib/string/String.__concat
    local.set $0
    br $folding-inner0
   end
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=36
   local.get $0
   i32.const 0
   i32.const 3
   call $~lib/string/String#substring
   local.set $1
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=32
   i32.const 5712
   local.get $1
   call $~lib/string/String.__concat
   local.set $1
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=28
   local.get $1
   i32.const 5744
   call $~lib/string/String.__concat
   local.set $1
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=20
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=28
   local.get $0
   i32.const 3
   i32.const 6
   call $~lib/string/String#substring
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=24
   local.get $1
   local.get $2
   call $~lib/string/String.__concat
   local.set $1
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=16
   local.get $1
   i32.const 5776
   call $~lib/string/String.__concat
   local.set $1
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=8
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=16
   local.get $0
   i32.const 6
   i32.const 10
   call $~lib/string/String#substring
   local.set $2
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=12
   local.get $1
   local.get $2
   call $~lib/string/String.__concat
   local.set $1
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=8
   i32.const 1
   global.set $~argumentsLength
   local.get $0
   i32.const 10
   call $~lib/string/String#substring@varargs
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=4
   local.get $1
   local.get $0
   call $~lib/string/String.__concat
   local.set $0
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 40
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
 )
 (func $assembly/index/formatAsYouType (param $0 i32) (param $1 i32) (result i32)
  (local $2 i32)
  (local $3 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 36
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.const 36
  memory.fill
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $0
  call $assembly/index/digitsOnly
  local.tee $2
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $2
  i32.store
  block $folding-inner0
   local.get $2
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const 1
   i32.shr_u
   i32.eqz
   if
    i32.const 5072
    local.set $2
    br $folding-inner0
   end
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $0
   call $assembly/index/hasPlusPrefix
   if
    global.get $~lib/memory/__stack_pointer
    local.get $2
    i32.store
    i32.const 5616
    local.get $2
    call $~lib/string/String.__concat
    local.set $2
    br $folding-inner0
   end
   global.get $~lib/memory/__stack_pointer
   global.get $assembly/metadata/REGION_METADATA
   local.tee $0
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=8
   local.get $0
   local.get $1
   call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#has"
   i32.eqz
   br_if $folding-inner0
   global.get $~lib/memory/__stack_pointer
   global.get $assembly/metadata/REGION_METADATA
   local.tee $0
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store offset=8
   global.get $~lib/memory/__stack_pointer
   local.get $0
   local.get $1
   call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#get"
   local.tee $0
   i32.store offset=12
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store
   local.get $0
   i32.load offset=4
   i32.const 1
   i32.eq
   if
    global.get $~lib/memory/__stack_pointer
    local.get $2
    i32.store offset=16
    global.get $~lib/memory/__stack_pointer
    local.get $2
    i32.store
    local.get $2
    i32.const 20
    i32.sub
    i32.load offset=16
    i32.const 1
    i32.shr_u
    i32.const 10
    i32.gt_u
    if (result i32)
     global.get $~lib/memory/__stack_pointer
     local.get $2
     i32.store
     local.get $2
     i32.const 1648
     call $~lib/string/String#startsWith
    else
     i32.const 0
    end
    if
     global.get $~lib/memory/__stack_pointer
     local.get $2
     i32.store
     i32.const 1
     global.set $~argumentsLength
     global.get $~lib/memory/__stack_pointer
     local.get $2
     i32.const 1
     call $~lib/string/String#substring@varargs
     local.tee $2
     i32.store offset=16
    end
    global.get $~lib/memory/__stack_pointer
    local.get $2
    i32.store
    local.get $2
    call $assembly/index/formatNanpPartial
    local.set $2
    br $folding-inner0
   end
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store offset=20
   i32.const 5072
   local.set $1
   global.get $~lib/memory/__stack_pointer
   i32.const 5072
   i32.store offset=24
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=8
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.load offset=8
   local.tee $3
   i32.store
   local.get $3
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const 1
   i32.shr_u
   if (result i32)
    global.get $~lib/memory/__stack_pointer
    local.get $2
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=28
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.load offset=8
    local.tee $3
    i32.store offset=8
    local.get $2
    local.get $3
    call $~lib/string/String#startsWith
   else
    i32.const 0
   end
   if
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.load offset=8
    local.tee $1
    i32.store offset=24
    global.get $~lib/memory/__stack_pointer
    local.get $2
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=28
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.load offset=8
    local.tee $3
    i32.store offset=8
    local.get $3
    i32.const 20
    i32.sub
    i32.load offset=16
    i32.const 1
    i32.shr_u
    local.set $3
    i32.const 1
    global.set $~argumentsLength
    global.get $~lib/memory/__stack_pointer
    local.get $2
    local.get $3
    call $~lib/string/String#substring@varargs
    local.tee $2
    i32.store offset=20
   end
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store
   local.get $2
   i32.const 20
   i32.sub
   i32.load offset=16
   i32.const 1
   i32.shr_u
   i32.eqz
   if
    local.get $1
    local.set $2
    br $folding-inner0
   end
   global.get $~lib/memory/__stack_pointer
   local.get $2
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=28
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.load offset=24
   local.tee $0
   i32.store offset=8
   global.get $~lib/memory/__stack_pointer
   local.get $2
   local.get $0
   call $assembly/index/groupDigits
   local.tee $0
   i32.store offset=32
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=8
   local.get $1
   local.get $0
   call $~lib/string/String.__concat
   local.set $2
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 36
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $2
 )
 (func $assembly/index/format (param $0 i32) (param $1 i32) (param $2 i32) (result i32)
  (local $3 i32)
  (local $4 i32)
  (local $5 i32)
  (local $6 i32)
  global.get $~lib/memory/__stack_pointer
  i32.const 52
  i32.sub
  global.set $~lib/memory/__stack_pointer
  call $~stack_check
  global.get $~lib/memory/__stack_pointer
  i32.const 0
  i32.const 52
  memory.fill
  global.get $~lib/memory/__stack_pointer
  local.get $0
  i32.store
  global.get $~lib/memory/__stack_pointer
  local.get $1
  i32.store offset=4
  global.get $~lib/memory/__stack_pointer
  local.get $0
  local.get $1
  call $assembly/index/parse
  local.tee $3
  i32.store offset=8
  global.get $~lib/memory/__stack_pointer
  local.get $3
  i32.store
  block $folding-inner0
   local.get $3
   i32.load8_u
   i32.eqz
   if
    i32.const 5072
    local.set $0
    br $folding-inner0
   end
   global.get $~lib/memory/__stack_pointer
   global.get $assembly/metadata/REGION_METADATA
   local.tee $0
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.store offset=12
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.load offset=8
   local.tee $1
   i32.store offset=4
   global.get $~lib/memory/__stack_pointer
   local.get $0
   local.get $1
   call $"~lib/map/Map<~lib/string/String,assembly/metadata/PhoneMetadata>#get"
   local.tee $4
   i32.store offset=16
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.load offset=12
   local.tee $0
   i32.store offset=20
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.load offset=4
   call $~lib/util/number/itoa32
   local.tee $5
   i32.store offset=24
   global.get $~lib/memory/__stack_pointer
   global.get $~lib/memory/__stack_pointer
   local.get $5
   i32.store offset=12
   i32.const 5616
   local.get $5
   call $~lib/string/String.__concat
   local.set $1
   global.get $~lib/memory/__stack_pointer
   local.get $1
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=4
   local.get $1
   local.get $0
   call $~lib/string/String.__concat
   local.tee $1
   i32.store offset=28
   local.get $2
   i32.eqz
   if
    local.get $1
    local.set $0
    br $folding-inner0
   end
   local.get $2
   i32.const 3
   i32.eq
   if
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store
    i32.const 5648
    local.get $1
    call $~lib/string/String.__concat
    local.set $0
    br $folding-inner0
   end
   local.get $2
   i32.const 1
   i32.eq
   if
    global.get $~lib/memory/__stack_pointer
    local.get $5
    i32.store offset=32
    i32.const 5616
    local.get $5
    call $~lib/string/String.__concat
    local.set $1
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store offset=12
    local.get $1
    i32.const 5680
    call $~lib/string/String.__concat
    local.set $1
    global.get $~lib/memory/__stack_pointer
    local.get $1
    i32.store
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=12
    global.get $~lib/memory/__stack_pointer
    local.get $4
    i32.store offset=36
    global.get $~lib/memory/__stack_pointer
    local.get $4
    i32.load offset=28
    local.tee $2
    i32.store offset=32
    local.get $0
    local.get $2
    call $assembly/index/groupDigits
    local.set $0
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store offset=4
    local.get $1
    local.get $0
    call $~lib/string/String.__concat
    local.set $0
    br $folding-inner0
   end
   global.get $~lib/memory/__stack_pointer
   local.get $3
   i32.store
   local.get $3
   i32.load offset=4
   i32.const 1
   i32.eq
   if
    global.get $~lib/memory/__stack_pointer
    local.get $0
    i32.store
    local.get $0
    i32.const 20
    i32.sub
    i32.load offset=16
    i32.const 1
    i32.shr_u
    i32.const 10
    i32.eq
    if
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store offset=48
     local.get $0
     i32.const 0
     i32.const 3
     call $~lib/string/String#substring
     local.set $1
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.store offset=44
     i32.const 5712
     local.get $1
     call $~lib/string/String.__concat
     local.set $1
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.store offset=40
     local.get $1
     i32.const 5744
     call $~lib/string/String.__concat
     local.set $1
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.store offset=32
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store offset=40
     local.get $0
     i32.const 3
     i32.const 6
     call $~lib/string/String#substring
     local.set $2
     global.get $~lib/memory/__stack_pointer
     local.get $2
     i32.store offset=36
     local.get $1
     local.get $2
     call $~lib/string/String.__concat
     local.set $1
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.store offset=12
     local.get $1
     i32.const 5776
     call $~lib/string/String.__concat
     local.set $1
     global.get $~lib/memory/__stack_pointer
     local.get $1
     i32.store
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store offset=12
     local.get $0
     i32.const 6
     i32.const 10
     call $~lib/string/String#substring
     local.set $0
     global.get $~lib/memory/__stack_pointer
     local.get $0
     i32.store offset=4
     local.get $1
     local.get $0
     call $~lib/string/String.__concat
     local.set $0
     br $folding-inner0
    end
    br $folding-inner0
   end
   global.get $~lib/memory/__stack_pointer
   local.get $4
   i32.store offset=12
   global.get $~lib/memory/__stack_pointer
   local.get $4
   i32.load offset=8
   local.tee $1
   i32.store
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=12
   global.get $~lib/memory/__stack_pointer
   local.get $4
   i32.store offset=36
   global.get $~lib/memory/__stack_pointer
   local.get $4
   i32.load offset=24
   local.tee $2
   i32.store offset=32
   local.get $0
   local.get $2
   call $assembly/index/groupDigits
   local.set $0
   global.get $~lib/memory/__stack_pointer
   local.get $0
   i32.store offset=4
   local.get $1
   local.get $0
   call $~lib/string/String.__concat
   local.set $0
  end
  global.get $~lib/memory/__stack_pointer
  i32.const 52
  i32.add
  global.set $~lib/memory/__stack_pointer
  local.get $0
 )
)
