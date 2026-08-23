# @mission-platform/phone-number

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/phone-number/docs/index.md: [packages/phone-number/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

`@mission-platform/phone-number`은 핵심을 집중적으로 재구현한 것입니다.
구글 [libphone번호](https://github.com/google/libphonenumber), 다음으로 작성됨
[어셈블리스크립트](https://www.assemblyscript.org/) **WebAssembly**로 컴파일되었습니다. 이는 구문 분석, 검증, 분류 및
국제 전화번호 형식을 지정하고 런타임 종속성이 없는 독립형 ES 모듈로 패키지됩니다.

## 건축학

패키지는 전적으로 **Vite**에 의해 구동되는 AssemblyScript → WebAssembly 빌드 파이프라인을 사용합니다.

1. **AssemblyScript 소스**(`assembly/`)는 선별된 지역별 메타데이터(`metadata.ts`)를 보유하고 있으며
   구문 분석/검증/분류/형식 논리(`index.ts`).
2. **Vite를 통한 WASM 컴파일**: `@mission-platform/vite-plugin-assemblyscript`
   Vite `buildStart` 후크에서 AssemblyScript 컴파일러를 실행하여 생성합니다.
   `build/phone-number.wasm`와 ESM 바인딩.
3. **단일 파일 아티팩트**: 플러그인은 wasm 바이너리를 base64로 인라인하여
   비동기, 메모된 `loadModule()` 팩토리를 노출하는 `@generated` 모듈(`src/generated/phone-number.js`) —
   별도의 `.wasm` 파일 로딩 및 URL 확인을 제거합니다.
4. **유형화된 외관**: `src/index.ts`은 원시 wasm 내보내기에 `PhoneNumberUtil` 클래스를 노출합니다.

### WASM 아티팩트 재구축

AssemblyScript는 Vite에 의해 컴파일됩니다. Docker 또는 기본 도구 체인이 필요하지 않습니다.

```bash
# Full build:
pnpm --filter @mission-platform/phone-number build

# Or just run Vite (recompiles AssemblyScript, regenerates src/generated):
pnpm --filter @mission-platform/phone-number exec vite build
```

## 용법

```ts
import { getPhoneNumberUtil, PhoneNumberFormat, PhoneNumberType } from '@mission-platform/phone-number';

const util = await getPhoneNumberUtil();

// Validation
util.isValidNumber('+14155552671', 'US'); // true
util.isPossibleNumber('12345', 'US'); // false

// Classification
util.getNumberType('07911 123456', 'GB'); // PhoneNumberType.MOBILE
util.getNumberType('+14155552671', 'US'); // PhoneNumberType.FIXED_LINE_OR_MOBILE

// Region lookup
util.getRegionCodeForNumber('+44 20 7946 0958', 'US'); // 'GB'
util.getCountryCodeForRegion('FR'); // 33

// Formatting
util.format('4155552671', 'US', PhoneNumberFormat.NATIONAL); // '(415) 555-2671'
util.format('4155552671', 'US', PhoneNumberFormat.E164); // '+14155552671'
util.format('07911 123456', 'GB', PhoneNumberFormat.INTERNATIONAL); // '+44 7911 123456'
util.format('4155552671', 'US', PhoneNumberFormat.RFC3966); // 'tel:+14155552671'
```

`defaultRegion` 인수(ISO 3166-1 alpha-2)는 입력이 아직 국제 버전이 **아닌** 경우에만 참조됩니다.
형식(`+…`, `00…` 또는 NANP `011…`)
IDD 접두사).

## 가능성 대 타당성

- **`isPossibleNumber`**은 국가 유효 숫자가 해당 지역에 대해 타당한 길이를 가지고 있는지만 확인합니다.
- **`isValidNumber`** 번호는 할당된 유선 또는 모바일 범위(동등)에 속해야 합니다.
  `getNumberType(...) !== UNKNOWN`).

```ts
util.isPossibleNumber('05001234567', 'GB'); // true  (right length)
util.isValidNumber('05001234567', 'GB'); //    false (unassigned range)
```

## 지원되는 지역 및 범위

업스트림 libphonenumber는 모든 ITU 지역에 대해 기계 생성된 포괄적인 메타데이터를 제공합니다. 이 포트는 선별된,
직접 검증된 하위 집합 — **US, CA, GB, FR, DE, AU, IN, JP, BR, CN, RU** — 정기적인 검증 없이 검증을 구현합니다.
길이 및 선행 숫자 규칙을 사용하는 표현식(AssemblyScript에서는 사용할 수 없음) 형식 지정은 지역별 사용
숫자 그룹화이며 업스트림과의 바이트별 패리티가 아닌 그럴듯한 근사치입니다. 새로운 지역을 추가할 수 있습니다.
`assembly/metadata.ts`을 확장하고 wasm을 다시 빌드합니다.
