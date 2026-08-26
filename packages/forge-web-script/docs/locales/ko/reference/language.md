# 포지 웹 스크립트 v1

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/forge-web-script/docs/reference/language.md: [packages/forge-web-script/docs/reference/language.md](../../../reference/language.md)
> 언어: 한국어 (ko)

Forge Web Script(`.fws`)는 WebAssembly를 위한 작은 범용 언어입니다.
작업 부하. 이는 웹 우선, 기능 기반이며 의도적으로 독립되어 있습니다.
Vue, React, DOM 및 Forge 구성 요소 컴파일러. 이 문서는
권위 있는 v1 언어 및 모듈 계약. `@mission-platform/forge-web-script`
구문 분석, 유형 확인, 그래프/링크를 위한 브라우저 안전 호환성 외관입니다.
Vite 어댑터에서 사용하는 해상도, 매니페스트 데이터 및 컴파일러 서비스 API
그리고 LSP. `@mission-platform/forge-web-script-wasm`는 결정적 백엔드입니다.
확인된 IR을 검증된 WebAssembly 및 WAT로 낮추는 것입니다. Node 전용
`@mission-platform/forge-web-script-cli` 패키지는 `forge-web-script`를 제공합니다.
파일이나 소스 그래프를 확인하고 컴파일하는 명령입니다. TypeScript
패키지에는 실행 가능한 적합성 고정 장치도 포함되어 있습니다.

## 상태 및 버전 관리

현재 계약은 **언어 버전 `1.0`** 및 **논리 ABI 버전입니다.
`1.2`**. 언어 버전은 소스와 의미를 설명합니다. ABI 버전
WebAssembly 경계 및 호스트 프로토콜을 설명합니다. 버전이 지정되어 있습니다.
독립적으로. 컴파일러는 생성된 모든 모듈에 두 버전을 모두 작성해야 합니다.
매니페스트와 로더는 인스턴스화하기 전에 둘 다 검증해야 합니다. ABI `1.2`는
메모리 계약의 주요 개정판: `memory` 매니페스트는 선언해야 합니다.
`allocatorExport: "fws_alloc"`, `deallocatorExport: "fws_dealloc"` 및
`reallocatorExport: "fws_realloc"`, `fws_reset`은
모듈 내보내기 세트. 로더는 오래되거나 불완전한 매니페스트 및 모듈을 거부합니다.
누락된 재할당자를 자동으로 가정하는 대신

소스 형식은 확장자가 `.fws`인 UTF-8 텍스트입니다. 소스 파일은
파일 정의 모듈; 해당 ID는 정규화된 Vite 파일 ID에서 파생됩니다.
(또는 작업공간 상대 경로). 컴파일러 입력은 언어 버전을 식별하는 반면
생성된 매니페스트는 로더가 사용하는 지속 버전 표시입니다. 미래
개정판에는 소스 pragma가 추가될 수 있지만 v1에는 소스 pragma가 필요하지 않습니다. v1 컴파일러
추측하기보다는 이해하지 못하는 소스 구성을 거부해야 합니다.
버전.

## 소스 분석 및 출시 정책

핵심 패키지는 컴파일러, 언어에 대한 하나의 분석 계약을 노출합니다.
서비스, CLI 및 MCP 통합. `analyzeForgeWebScript`은 확인된 내용을 수락합니다.
프런트엔드 결과 및 선택적으로 등록된 규칙을 입력한 다음 사실, 결과 및 결과를 반환합니다.
나머지 컴파일러에서 사용되는 것과 동일한 안정적인 진단입니다. 분석 컨텍스트
소스 파일, 선택적 소스 맵 항목, 원시 및 최적화된 IR이 포함됩니다.
ABI 매니페스트, 그래프/링크 메타데이터, 대상 프로필 및 정규화된 정책.

분석 결과는 안정적인 `FWS-ANALYSIS-*` 코드를 사용하고 카테고리를 포함합니다.
심각도, UTF-16 호환 소스 범위, 증거, 해결 힌트 및
선택적 OWASP/CWE 참조. 진단에는 `phase: "analysis"`가 추가되고
기존 `FWS-LEX-*`, `FWS-PARSE-*`,
`FWS-TYPE-*` 또는 `FWS-ABI-*` 진단.

컴파일에서는 기본적으로 strict 프로필을 사용합니다. 엄격 모드에서는 오류 심각도
결과(또는 명시적으로 `blocking`로 표시된 결과)는 Wasm 및 ESM 출력을 방지합니다.
반환된 아티팩트에서는 전체 보고서를 계속 사용할 수 있습니다. 개발
프로필은 편집자 및 조사 워크플로용으로, 결과를 보고합니다.
하지만 이를 릴리스 게이트로 사용하지는 않습니다. 정책에 명시적 기능이 포함되어 있습니다.
발견 항목, 호출 깊이, 루프, 할당, 비동기에 대한 허용 목록 및 제한된 제한
작업 및 정규식 입력.

컴파일러 서비스 캐시 키에는 등록된 정규화된 분석 정책이 포함됩니다.
규칙 식별자 및 소스 맵 입력. 이러한 분석 입력 변경
따라서 다른 정책에 따라 생성된 아티팩트를 재사용할 수 없습니다.

## 예외 없는 결과 및 구조화된 제어 흐름

Forge 웹 스크립트는 표준 라이브러리를 사용하여 복구 가능한 결과를 나타냅니다.
`Option<T>` 및 `Result<T, E>` 열거형입니다. 모든 변형을 처리하려면 `match`를 사용하십시오.
소스 수준 `throw`, `try` 및 `catch`는 실행 가능한 구성이 아닙니다. 는
구조화된 `for`, `while` 및 `do while` 양식은 실행 가능한 v1 제어 흐름입니다.
예외나 반복자 구성이 아닙니다. `Result`는 정확히
변종 `Ok(T)` 및 `Error(E)`.

반복자 함수는 `iter fn`를 사용하고 `Iterator<T>`을 반환하며 `yield`에서 일시 중지됩니다.

```fws
export iter fn forward(source: Iterator<i32>) -> Iterator<i32> {
  loop value = source.next() { yield value; }
}
```

컴파일러는 JavaScript 호환을 통해 반복자 내보내기를 노출합니다.
`next()` 어댑터. 각 호출은 값에 대해 `{ value, done: false }`을 반환하고
완료 시 `{ value: undefined, done: true }`; 후속 통화가 남아 있음
완료. `Iterator<T>.next()`은 `Option<T>`로 입력되므로 체인으로 연결된 반복자
요소 유형과 소유권 계약을 보존해야 합니다.

## 최적화 및 대상 프로필

릴리스 최적화는 검증된 반복자 언롤링, 순수 호출 인라인,
tail-call 분석 및 안전한 조건부 폴딩이 가능합니다. `noinline` 지시문을 사용하십시오.
함수 경계가 계속 표시되어야 하는 경우. 기능 가져오기 및 로깅
관찰 가능한 부작용이며 순서가 변경되지 않습니다. 대상 기능이 선택되어 있습니다.
입력을 컴파일하고 ABI 매니페스트 및 캐시 키에 기록됩니다.

```ts
const artifact = compileForgeWebScript({
  source,
  fileName: 'runtime.fws',
  compilerVersion: '1.0.0',
  optimization: 'release',
  targetFeatures: { simd: true, tailCall: true, memory64: true },
  compilerHints: { iteratorUnrollLimit: 4 },
});
```

`threads` 및 `atomics`은 모두 공유 메모리 원자 출력에 대해 활성화되어야 합니다.
지원되지 않는 조합은 진단을 생성합니다. memory64 매니페스트는 `u64`를 사용합니다.
주소 및 포인터 길이-u64 값. 디버그 모드에서는 구성된 캐시가
결정론적 `<key>.optimized.wat`, `<key>.unoptimized.wat` 유지,
`<key>.optimized.wasm` 및 `<key>.unoptimized.wasm` 아티팩트. 캐시 쓰기
추가적이며 사용할 수 없거나 실패한 캐시는 컴파일에 실패하지 않습니다.

## 프로젝트 간 링크 프로필

FWS는 프로젝트 간 종속성 관리를 위해 두 가지 기본 링크 프로필을 지원합니다.

- `linkProfile: "static"`: 교차 프로젝트 모듈이 단일로 평면화됩니다.
  스캐너 그래프 아티팩트. 이를 통해 공격적인 정적 최적화가 가능해집니다.
  (`static-aggressive` 프로필) 및 런타임 모듈 조회를 제거합니다.
  아티팩트 크기 비용.
- `linkProfile: "dynamic"`: 명시적인 소스 모듈 경계가 유지됩니다.
  `ForgeWebScriptDynamicLinkCache`은 런타임에 디코더 모듈을 확인하는 데 사용됩니다.
  아티팩트 및 매니페스트 ID로 키가 지정된 캐시된 함수 주소를 사용합니다. 이
  더 안전한 `dynamic-conservative` 최적화 프로필을 사용합니다.
  모듈식 배포판.

## 어휘 참조

정식 체크인 문법은 다음과 같습니다.
[`src/grammar/forge-web-script.ebnf`](../../../../src/grammar/forge-web-script.ebnf).
아래의 어휘 및 파서 요약은 공개 v1 계약을 설명합니다. 는
EBNF 아티팩트는 구현 세부 사항이 모호한 경우 신뢰할 수 있습니다.

문자열 내부를 제외하면 공백은 중요하지 않습니다. `//`은 다음과 같은 주석을 시작합니다.
줄 끝까지 달려갑니다. `/*`는 다음에서 끝나는 블록 주석을 시작합니다.
`*/`; 블록 주석은 여러 줄에 걸쳐 있을 수 있습니다. 댓글은 퀴즈이므로 입력하지 마세요.
문법. 식별자는 `A-Z`, `a-z` 또는 `_`으로 시작합니다.
해당 문자나 십진수를 계속 사용하세요. 식별자는
대소문자를 구분합니다. 정수 리터럴은 음수가 아닌 십진수 시퀀스입니다. v1은 그렇습니다
16진수, 8진수 또는 부동 소수점 리터럴 구문을 허용하지 않습니다.
부트스트랩 하위 집합. 문자열은 큰따옴표와 JSON 호환 이스케이프만 사용합니다.
`\\`, `\"`, `\/`, `\b`, `\f`, `\n`, `\r`, `\t` 및 `\uXXXX`
4개의 16진수 숫자. 원시 줄 종결자와 유효하지 않은 이스케이프는 어휘적입니다.
오류; 대신 `\n` 또는 `\r`을 사용하세요. 문자열 값은 UTF-8 값입니다.

예약어는 `as`, `capability`, `case`, `catch`, `class`,
`constructor`, `default`, `do`, `else`, `enum`, `extends`, `export`, `for`,
`fn`, `if`, `impl`, `import`, `inline`, `interface`, `iter`, `let`, `likely`,
`loop`, `match`, `module`, `new`, `noinline`, `return`, `struct`, `switch`,
`throw`, `trait`, `try`, `unlikely`, `while` 및 `yield`. `true` 및 `false`
부울 리터럴입니다. 구두점은
`{ } ( ) [ ] : ; , | .`; 운영자는
`! % * + - / < <= == != > >= && || = -> => ::`.

모든 진단 범위는 반 오픈 소스 오프셋 범위 `[start, end)`입니다.
원본 UTF-16 TypeScript 문자열(오프셋 개수 UTF-16 코드 단위)
1 기반 라인 및 열 필드. 그만큼
부트스트랩 구현은 오프셋과 줄/열 데이터를 함께 보고하므로
Vite 어댑터는 재분석 없이 소스 매핑된 진단을 생성할 수 있습니다.

스캐너는 주석을 `comment` 토큰으로 유지하므로 문서 주석은 다음과 같습니다.
함수에 연결되는 반면 파서 결정은 모든 퀴즈를 건너뜁니다. 연산자
공유 접두사가 있는 항목은 가장 긴 일치 항목으로 선택됩니다. 잘못된 입력 시
스캐너는 경계 영역을 소비하고 안정적인 `FWS-LEX-*` 진단을 내보냅니다.
단일 EOF 토큰으로 계속됩니다. 이 복구 동작은 문법의 일부입니다.
계약. TypeScript 프런트엔드는 UTF-16 코드 단위로 모든 오프셋을 측정합니다.
자체 호스팅 바이트 단계는 게시하기 전에 UTF-8 바이트 범위를 변환해야 합니다.
공유 토큰 계약.

### 함수 문서화 주석

여는 구분 기호가 `/**`인 블록 주석은 문서 ​​주석입니다.
다음 최상위 레벨 `fn` 또는 `export fn` 선언에 첨부됩니다.
공백과 일반 주석은 주석과 선언 사이에 나타납니다.

```fws
/**
 * Adds one to a value.
 *
 * @param value The value to increment.
 * @return The incremented value.
 * @deprecated Use `increment` in new code.
 */
export fn add(value: i32) -> i32 {
  return value + 1;
}
```

기능 가져오기, 소스 가져오기, 구조체 이전의 문서 주석
열거형, 인터페이스 또는 기타 비함수 선언은 삭제됩니다. 그들은 그렇습니다
이후 기능으로 이월되지 않습니다. 여러 문서 주석이 발생하는 경우
선언하기 전에 가장 가까운(마지막) 문서 주석이 사용됩니다.
일반 `//` 및 `/* ... */` 주석은 이를 대체하지 않습니다. 문서는
최상위 수준에서만 인식됩니다. 함수 본문 내부의 주석은 그렇지 않습니다.
함수 메타데이터. 끝나지 않은 블록 주석은 안정적인 어휘를 생성합니다.
진단 `FWS-LEX-003` 및 파서 복구는 나머지 부분에 대해 계속 사용 가능합니다.
소스.

정규화된 AST 메타데이터의 형태는 다음과 같습니다.

```ts
interface ForgeWebScriptDocumentation {
  readonly description: string;
  readonly tags: readonly ForgeWebScriptDocumentationTag[];
}

interface ForgeWebScriptDocumentationTag {
  readonly name: string;
  readonly subject?: string;
  readonly text: string;
}
```

노멀라이저는 `/**` 및 `*/` 구분 기호, 선행 공백,
각 줄의 선택적 `*` 장식과 주변 공백. 실행
공백이 하나의 공백으로 축소됩니다. 첫 번째 태그 앞의 설명 줄
단락으로 그룹화되어 있습니다. 빈 줄은 단락 구분으로 유지됩니다. 태그가 시작됩니다
`@`으로 시작하는 줄에서 비어 있지 않은 다음 줄은
이전 태그. 태그 순서와 중복 태그는 유지됩니다.

일반적으로 사용되는 태그 형식은 다음과 같습니다.

| 태그 양식                                                 | 구조화된 필드                                   |
| --------------------------------------------------------- | ----------------------------------------------- |
| `@param name text`, `@arg`, `@argument` 또는 `@parameter` | `name`는 `subject`입니다. 나머지는 `text`입니다 |
| `@typeparam name text`                                    | `name`은 `subject`입니다. 나머지는 `text`입니다 |
| `@throws type text` 또는 `@exception type text`           | `type`은 `subject`입니다. 나머지는 `text`입니다 |
| `@return text` 또는 `@returns text`                       | `text` 전용                                     |
| `@deprecated text`                                        | `text` 전용                                     |

다른 `@name` 양식은 주문된 태그가 아닌 주문된 태그로 허용되고 유지됩니다.
진단명으로 보고됩니다. 추론된 주제가 없습니다. 남은 텍스트
보존됩니다. 태그 이름은 대소문자를 구분합니다.

편집기 소비자의 경우 동일한 메타데이터가
설명 뒤에 소스 순서대로 각 태그가 오고, 사이에는 빈 줄이 있습니다.
부품. 태그 이름과 해당 텍스트 사이에 제목이 표시됩니다. 예를 들면 다음과 같습니다.

```text
Adds one to a value.

@param value The value to increment.

@return The incremented value.

@deprecated Use `increment` in new code.
```

문서는 실행 가능한 언어 의미가 아닌 분석 메타데이터입니다. 그럴 수도 있다
언어 서비스 소비자를 위해 AST 및 IR에 보존되지만 그렇지 않습니다.
선언 구문 분석, 유형 검사, 낮추기 또는 런타임 동작에 영향을 줍니다.
문서는 ABI 서명 및 매니페스트에서 제외되고 생성됩니다.
선언 및 로더 아티팩트, Wasm/WAT, 실행 가능한 콘텐츠 해시 및
능력 요구 사항. 따라서 문서 주석만 변경하면
모듈의 ABI 또는 생성된 실행 가능 계약을 변경하지 마세요.

## 소스 문법

위에 링크된 체크인 EBNF 아티팩트는 전체 어휘를 설명합니다.
부트스트랩, 확장 집계 및 복구 계약. 다음 발췌
전체 파일이 필요하지 않은 독자를 위한 v1 부트스트랩 표면을 설명합니다.
문법은 일반적인 EBNF 의미에서 `*` 및 `?`을 사용합니다.

```ebnf
module       = { import | function } ;
import       = "import", "capability", string, "as", identifier,
               "(", [ parameters ], ")", "->", type, ";" ;
sourceImport = "import", string, "as", identifier, ";" ;
function     = [ "export" ], "fn", identifier, "(", [ parameters ], ")",
               "->", type, block ;
parameters   = parameter, { ",", parameter } ;
parameter    = identifier, ":", type ;
block        = "{", { statement }, "}" ;
statement    = "let", identifier, ":", type, "=", expression, ";"
             | "return", [ expression ], ";"
             | "if", expression, block, [ "else", block ]
             | "while", expression, block
             | "for", "(", [ for-clause ], ";", expression, ";",
               [ for-clause ], ")", block
             | "do", block, "while", expression, ";"
             | identifier, "=", expression, ";"
             | expression, ";" ;
for-clause   = "let", identifier, ":", type, "=", expression
             | identifier, "=", expression
             | expression ;
type         = "bool" | "bytes" | "f32" | "f64" | "i32" | "i64"
             | "string" | "u32" | "u64" | "unit" ;
expression   = literal | identifier | call | unary | binary ;
call         = identifier, "(", [ expression, { ",", expression } ], ")" ;
unary        = ( "!" | "-" ), expression ;
literal      = integer | string | "true" | "false" ;
```

이항 연산자는 가장 강한 것부터 가장 약한 것까지 다음과 같은 우선 순위 수준을 따릅니다.
`* / %`, `+ -`, 순서화된 비교, 동등성, `&&` 및 `||`. 운영자는
왼쪽 연관. 괄호 안에 있는 표현식은 다음 부트스트랩을 위해 예약되어 있습니다.
개정; 컴파일러는 자동이 아닌 구문 분석 진단을 발행해야 합니다.
오늘 받아요.

이 발췌문은 **부트스트랩** 문법입니다. 파일 정의 모듈,
기능/소스 가져오기, 기본 서명, 호출, 로컬 값,
표현식, 구조화된 `if`/`else`, `while`, C 스타일 `for`, `do while` 및
`return`. 루프 형식은 실행 가능한 부트스트랩 계약의 일부입니다. 만
예약된 예외 단어 `throw`, `try` 및 `catch`는 다음과 같이 거부됩니다.
실행 가능한 구성. 아래의 집계 선언 및 값은
**확장** 계약이며 대체 철자로 처리되어서는 안 됩니다.
부트스트랩 문법.

### 확장된 집계 문법

확장 계약은 불변 구조체, 태그가 지정된 열거형, 일반 유형을 추가합니다.
인터페이스, 함수 값, 컬렉션 리터럴, 인덱싱 및 `match`.
핵심 소스 형식은 다음과 같습니다.

```ebnf
aggregate    = struct | enum | interface ;
struct       = "struct", identifier, [ generic_parameters ], "{",
               { identifier, ":", type, ";" }, "}" ;
enum         = [ "export" ], "enum", identifier, [ generic_parameters ], "{",
               variant, { ",", variant }, [ "," ], "}" ;
variant      = identifier, [ "(", [ parameters ], ")" ] ;
generic_parameters = "<", generic_parameter, { ",", generic_parameter }, ">" ;
generic_parameter  = identifier, [ ":", identifier ] ;
type         = primitive | identifier, [ "<", type, { ",", type }, ">" ]
             | "[", type, ";", integer, "]"
             | "Fn", "<", type, ",", type, ">" ;
constructor  = identifier, "::", identifier, "(", [ expression ], ")" ;
match        = "match", expression, "{", match_arm, { ",", match_arm }, "}" ;
match_arm    = pattern, "=>", expression ;
pattern      = "_" | identifier, [ "(", [ identifier, { ",", identifier } ], ")" ] ;
```

`Result::Ok(value)` 및
`Result::Error(message)`은 집계에 대해 해결하고 변형을 검증합니다.
arity 및 필드 유형. 표준 `Result<T, E>` 변형은 정확히
`Ok(T)` 및 `Error(E)`; `Option<T>`는 `Some(T)` 및 `None`로 유지됩니다. 기능
값은 `fn name` 및 선언된 `Fn<parameter, result>` 유형을 사용합니다. 예를 들어
`let callback: Fn<i32, i32> = fn increment;`. 함수 값은 다음을 통해 확인됩니다.
참조된 함수 시그니처이며 일치하는 소수점으로만 호출할 수 있습니다.
및 인수 유형.

일치 바인딩은 팔에 로컬입니다. `Result::Ok(item) => item` 바인드
`item` 해당 표현식만 확인하는 동안입니다. 바인딩 이름은 바인딩에서 고유해야 합니다.
arm 및 해당 개수는 선택한 변형 필드와 일치해야 합니다. 그들은 새지 않는다
형제 팔이나 주변 기능에.

## 유형 및 의미

V1에는 기본 유형 `bool`, 서명된 `i32`/`i64`, 서명되지 않은 `u32`/`u64`,
`f32`/`f64`, `string`, `bytes` 및 `unit`. 암시적인 숫자가 없습니다.
전환. 산술 피연산자는 동일한 숫자 유형을 가져야 합니다. 비교
`bool`을 생산하고; 논리 연산자에는 `bool`이 필요합니다. 평등에는 평등이 필요하다
유형. 함수에는 선언된 결과 유형이 하나 있고 `unit` 함수가 반환됩니다.
가치 없이.

### 컴파일러 소유 정규식

Forge 웹 스크립트는 결정적 정규식 표준 라이브러리를 제공합니다.
`regex_full_match(pattern, value) -> bool` 호출,
`regex_prefix_match(pattern, value) -> bool` 및
`regex_search(pattern, value, start: i32) -> bool`는 전체 값을 수행합니다.
위치 0 접두사 및 가장 왼쪽 검색 일치. 캡처 범위
해당 `regex_*_capture_start`을 통해 사용할 수 있으며
`regex_*_capture_end` 호출; 그룹 인덱스를 가져와 UTF-16 문자열을 반환합니다.
일치하는 항목이 없거나 그룹이 설정되지 않은 경우 오프셋 또는 `-1`입니다. 검색 캡쳐
호출은 추가로 그룹 인덱스 이전의 시작 오프셋을 사용합니다.

Regex 호출은 컴파일러 소유의 표준 라이브러리 함수입니다. 그들은 다음과 같이 입력됩니다.
IR에 주석이 달린 프런트엔드이며 결코 기능 가져오기가 아닙니다. 사용하는 모듈
따라서 정규식 호출에만 빈 `imports` 배열과 빈
`requiredCapabilities` 어레이. 백엔드 낮추기 및 모듈 내 VM은
별도의 구현 단계; 컴파일러는 이러한 호출을
브라우저 `RegExp`, Node API 또는 암시적 호스트 가져오기.

지원되는 구문은 의도적으로 리터럴, `.`, 문자로 제한됩니다.
클래스 및 범위(`^` 부정 포함), `\d`, `\D`, `\w`, `\W`, `\s`,
`\S`, 이스케이프된 리터럴, 캡처 및 비캡처 그룹, 교대,
`*`, `+`, `?`, 제한된 `{n}`, `{n,}`, `{n,m}` 수량자, 지연 수량자,
및 `^`/`Forge 웹 스크립트는 결정적 정규식 표준 라이브러리를 제공합니다.`regex_full_match(pattern, value) -> bool`호출,`regex_prefix_match(pattern, value) -> bool`및`regex_search(pattern, value, start: i32) -> bool`는 전체 값을 수행합니다.
위치 0 접두사 및 가장 왼쪽 검색 일치. 캡처 범위
해당 `regex___capture_start`을 통해 사용할 수 있으며
`regex___capture_end`호출; 그룹 인덱스를 가져와 UTF-16 문자열을 반환합니다.
일치하는 항목이 없거나 그룹이 설정되지 않은 경우 오프셋 또는`-1`입니다. 검색 캡쳐
호출은 추가로 그룹 인덱스 이전의 시작 오프셋을 사용합니다.

Regex 호출은 컴파일러 소유의 표준 라이브러리 함수입니다. 그들은 다음과 같이 입력됩니다.
IR에 주석이 달린 프런트엔드이며 결코 기능 가져오기가 아닙니다. 사용하는 모듈
따라서 정규식 호출에만 빈 `imports` 배열과 빈
`requiredCapabilities` 어레이. 백엔드 낮추기 및 모듈 내 VM은
별도의 구현 단계; 컴파일러는 이러한 호출을
브라우저 `RegExp`, Node API 또는 암시적 호스트 가져오기.

지원되는 구문은 의도적으로 리터럴, `.`, 문자로 제한됩니다.
클래스 및 범위(`^` 부정 포함), `\d`, `\D`, `\w`, `\W`, `\s`,
`\S`, 이스케이프된 리터럴, 캡처 및 비캡처 그룹, 교대,
`*`, `+`, `?`, 제한된 `{n}`, `{n,}`, `{n,m}` 수량자, 지연 수량자,
및 `^`/ 앵커. 역참조, 둘러보기, 명명된 그룹, 플래그 및
다른 호스트 엔진 확장은 거부됩니다. 지원되지 않는 구문에는 stable
`FWS-REGEX-001` 진단; 잘못된 패턴은 `FWS-REGEX-002`을 사용하며
내부 컴파일러 불변 오류는 `FWS-REGEX-003`을 사용합니다.

공유 패키지 `@mission-platform/forge-web-script-regex`은 안정 패키지를 소유합니다. `$`
바이트코드(`FORGE_REGEX_BYTECODE_VERSION`) 및 빌드타임 컴파일러. 명시적이다
`/reference` 진입점은 TypeScript VM을 적합성 오라클로만 노출합니다.
네이티브 엔진 및 백엔드 차등 테스트용 패키지 루트는 그렇지 않습니다
해당 VM을 노출합니다. 전화별 메타데이터는 전화번호 패키지에 남아 있습니다.
프로덕션 정규식 실행은 Forge 웹 스크립트 백엔드에 속하며
생성된 WASM 모듈은 TypeScript 런타임 레이어 또는 호스트 기능에 적용되지 않습니다.

`string` 및 `bytes`은 v1 집계 값입니다. 문자열은 불변이다
ABI 경계에서 UTF-8로 표현되는 유니코드 스칼라 값의 시퀀스입니다.
바이트는 불변의 옥텟 시퀀스이며 다음의 값을 포함할 수 있습니다.
`0x00`부터 `0xff`까지. 소스 수준 작업은 의도적으로 작습니다.
부트스트랩 하위 집합에서; 호스트 호출 및 이후 표준 라이브러리 모듈은 다음을 제공합니다.
주변 브라우저를 추가하지 않고 인코딩, 슬라이싱 및 수집 작업
언어에 대한 API.

### 컬렉션 서명

확장된 수집 계약은 구조적이며 수신자 기반입니다. 그렇죠
임의의 객체 메서드를 추가하지 마세요. 고정 배열은 `[T; N]`으로 작성되고
벡터는 `Vector<T>`입니다. 지원되는 서명은 다음과 같습니다.

| 수신기      | 방법              | 서명                    |
| ----------- | ----------------- | ----------------------- |
| `Array<T>`  | `length`          | `() -> u32`             |
| `Array<T>`  | `get`             | `(u32) -> Option<T>`    |
| `Array<T>`  | `set`             | `(u32, T) -> Array<T>`  |
| `Array<T>`  | `iter`            | `() -> Iterator<T>`     |
| `Vector<T>` | `length`          | `() -> u32`             |
| `Vector<T>` | `get`             | `(u32) -> Option<T>`    |
| `Vector<T>` | `set`             | `(u32, T) -> Vector<T>` |
| `Vector<T>` | `push` 또는 `add` | `(T) -> Vector<T>`      |
| `Vector<T>` | `pop`             | `() -> Option<T>`       |
| `Vector<T>` | `iter`            | `() -> Iterator<T>`     |

`add` 철자는 의도적으로 벡터에 대한 호환성 별칭입니다.
`push`; 배열 방법이 아닙니다. 인덱스는 `u32`이며 요소 인수는 다음과 같아야 합니다.
`T`와 일치하고 반환 값은 위의 서명과 일치해야 합니다. 잘못된 아리,
인수 유형, 수신자 종류 및 알 수 없는 메소드는 유형 검사 오류입니다.
빈 리터럴에는 상황별 요소 유형이 필요하지만 비어 있지 않은 배열/벡터
리터럴은 요소 유형을 재귀적으로 추론하고 혼합 요소를 거부합니다. 에이
고정 배열 리터럴은 정확히 `N` 요소를 포함해야 합니다.

지역은 함수 범위로 지정되고, 정확히 한 번만 초기화되며, 그 전에는 읽을 수 없습니다.
그들의 선언. 로컬 선언이 기존 이름을 가리지 않음: 중복
이름은 오류입니다. 함수와 기능 별칭은 하나의 모듈 네임스페이스를 공유합니다.
고유해야 합니다. 호출은 선언된 함수의 이름을 지정하거나 가져와야 합니다.
기능 및 해당 개수와 인수 유형이 정확히 일치해야 합니다.

v1 제어 흐름 표면은 `if`/`else`, `while`, C 스타일 `for`,
`do while` 및 초기 `return`. `for` 절은 명시적 명령문이며 다음을 수행합니다.
루프 외부에 클래스, 수신자 또는 암시적 돌연변이를 도입하지 않습니다.
지역적 가치 환경. 암시적인 폴스루 결과는 없습니다.
`unit`이 아닌 함수의 도달 가능한 경로는 선언된 유형을 반환해야 합니다. 는
부트스트랩 검사기는 반환 유형 오류를 보고합니다. 도달가능성 분석은
컴파일러가 v1을 완전히 준수한다고 선언하기 전에 후속 조치가 필요합니다.

FWS는 의도적으로 수업이 없습니다. `class`, `constructor`, `extends`, `impl`,
`new` 및 `trait`은 안정적인 진단으로 예약 및 거부됩니다.
`FWS-PARSE-052`; 불변 구조체, 태그가 지정된 열거형, 인터페이스 및 함수
값은 지원되는 값 지향 대안입니다. 단계적 자체 호스팅
계약은 체크인된 TypeScript 컴파일러를 시드로 유지하는 반면 FWS 컴파일러는
런타임 계약은 점진적으로 부트스트랩됩니다.

## 파일 정의 모듈, 소스 가져오기 및 내보내기

중첩된 `module` 선언이 없습니다. 모든 `.fws` 파일은 모듈이며 해당 파일은
안정적인 이름은 정규화된 파일 ID에서 파생됩니다. 예를 들어,
`/workspace/app` 프로젝트의 `src/time.fws`에는 모듈 ID `src/time`가 있습니다. 중첩됨
`module name { ... }` 구문은 마이그레이션 진단으로 거부됩니다.

소스 모듈 가져오기는 호스트 기능 가져오기와 다릅니다.

```fws
import "./math.fws" as math;
import capability "clock.now" as now() -> i64;
```

Vite 어댑터는 모듈 그래프를 통해 소스 가져오기를 해결합니다. 종속성
하나의 프로젝트 내에서는 기본적으로 정적으로 연결됩니다. 프로젝트 간 가장자리 기본값
동적 로딩으로 명시적으로 `static` 또는 `dynamic`로 구성될 수 있습니다.
프로젝트 루트 링크 구성. 누락된 모듈, 지원되지 않는 사이클
선택된 링크 모드 및 신원 충돌은 그래프 진단입니다.

정적 링크는 연결 가능한 게스트 내보내기를 하나의 아티팩트로 평면화합니다. 충돌 내보내기
결정론적으로 거부됩니다(중복 서명의 경우 `FWS-LINK-003` 및
호환되지 않는 서명의 경우 `FWS-LINK-004`); 링커는 자동으로
네임스페이스를 사용하거나 게스트 기능을 덮어씁니다. 동적 링크는 별도의 모듈로 유지됩니다.
경계이며 ABI 매니페스트에 소스 모듈 가져오기로 기록됩니다.
주변 호스트 기능으로.

`export` 앞에 오는 선언만 공개됩니다. 내보내기 이름은 안정적이며,
대소문자를 구분하는 문자열이며 생성된
명시하다. 비공개 함수는 내보낸 함수에서 사용할 수 있지만 사용할 수는 없습니다.
호스트에게 표시됩니다. 와일드카드 내보내기와 앰비언트 가져오기가 없습니다.

기능 가져오기에는 인용된 호스트 소유 이름과 게스트 로컬 별칭이 있습니다.

```fws
import capability "clock.now" as now() -> i64;

export fn current_time() -> i64 {
  return now();
}
```

인용된 기능 이름, 별칭, 매개변수 이름/유형 및 결과 유형은 다음과 같습니다.
모두 매니페스트에 포함되어 있습니다. 가져오기는 결정적입니다. 별칭이 중복되거나
기능 선언은 거부되고 필수 기능 이름은
중복 제거 및 정렬. 호스트는 기능 이름별로 구현을 제공합니다.
게스트는 해당 기능에 없는 기능을 검색하거나 호출할 수 없습니다.
명시하다.

## 논리적 기능 ABI

Forge 웹 스크립트는 완전한 주장이 아닌 WASI에서 영감을 받은 _논리적_ 경계를 사용합니다.
WASI 호환성. 기능은 다음과 같이 좁고 명시적인 호스트 기능입니다.
`clock.now`, `random.bytes` 또는 `storage.read`. 기능 이름의 소유자는 다음과 같습니다.
플랫폼이며 각 이름에는 별도로 버전이 지정된 서명이 있습니다. DOM 객체,
`window`, `document`, Node 내장, 네트워크 클라이언트 및 기타 브라우저 전역
주변 게스트 종속성이 없습니다.

로더는 인스턴스화 전에 다음 검사를 수행합니다.

1. 매니페스트 형식, 언어 버전, ABI 버전이 지원됩니다.
2. 필요한 모든 기능은 호스트 레지스트리에 있습니다.
3. 제공된 모든 기능에는 정확하게 선언된 서명이 있으며 선언되지 않은 기능은 없습니다.
   게스트 가져오기가 허용됩니다.
4. 메모리, 할당자, 내보내기 및 가져오기 선언은 내부적으로 이루어집니다.
   일관성이 있다.

기능 검색은 명시적인 호스트 작업입니다. 호스트는 다음을 노출할 수 있습니다.
기능 인벤토리를 애플리케이션 코드로 변경하지만 게스트는
해당 모듈에서 선언된 수입품. 누락되거나 거부된 기능은 다음과 같이 실패합니다.
로드 시간 `CapabilityDenied` 트랩; `undefined` 또는
조용한 무작동.

## 가치, 선형 메모리 및 소유권

모듈은 64KiB 페이지와 리틀 엔디안을 갖춘 하나의 WebAssembly 선형 메모리를 사용합니다.
스칼라 값. 스칼라 값은 다음과 같이 매핑됩니다.

| 포지 웹 스크립트  | 웹어셈블리 표현                            |
| ----------------- | ------------------------------------------ |
| `bool`            | `i32`(여기서 `0`는 false이고 `1`은 true임) |
| `i32`, `u32`      | `i32`                                      |
| `i64`, `u64`      | `i64`                                      |
| `f32`, `f64`      | WebAssembly float 일치                     |
| `unit`            | 결과 값 없음                               |
| `string`, `bytes` | 두 개의 `u32` 값: 포인터, 바이트 길이      |

매니페스트는 `valueRepresentations`에서 동일한 매핑을 선언합니다. 에이
포인터 길이 쌍은 읽기 전에 항상 부호 없는 범위로 확인됩니다.
쓰기: `pointer <= memory.byteLength` 및 `length <= byteLength - pointer`.
0 길이는 유효하며 끝을 포함하여 모든 인바운드 포인터를 사용할 수 있습니다.
기억. 실패한 검사는 `MemoryOutOfBounds`로 트랩되고 절대 노출되지 않습니다.
부분적으로 디코딩된 값입니다.

생성된 모듈은 `fws_alloc(size: u32) -> u32`을 내보냅니다.
`fws_dealloc(pointer: u32, size: u32) -> unit` 및
`fws_realloc(pointer: u32, oldSize: u32, newSize: u32) -> u32`를 소유권으로 사용
버퍼의 경계. 서명 속기에서 작업은 다음과 같습니다.
`fws_realloc(pointer, oldSize, newSize) -> pointer`. 버퍼를 할당하는 호출자는 이를 소유하며 반드시 버퍼를 할당해야 합니다.
동일한 모듈과 정확한 현재 크기를 사용하여 할당을 해제하거나 재할당합니다.
재할당자는 현재의 높은 물 할당량을 조정하는 것을 선호합니다.
선형 메모리가 커질 수 있을 때 축소 및 증가하는 것을 포함합니다. 그렇지 않으면
대체 항목을 할당하고 정확히 `min(oldSize, newSize)`바이트를 복사합니다.
대체 포인터를 반환하기 전에 이전 할당을 해제합니다. 에이
크기가 0인 결과는 유효하며 동일한 크기 요청은 원본을 반환합니다.
포인터. 호스트 구현은 게스트 호출 전에 입력 바이트를 복사해야 합니다.
매니페스트가 향후 빌린 버퍼를 명시적으로 도입하지 않는 한 반환됩니다.
계약. 게스트 코드는 호스트 호출 후 호스트 소유 포인터를 유지해서는 안 됩니다.
`MemoryExhausted`을 사용한 할당 또는 성장 실패 트랩; 잘못된 포인터 또는
`MemoryOutOfBounds`을 사용한 크기 범위 트랩; 오래된 포인터, 올바르지 않음
`oldSize`, 이중 해제 또는 `InvalidOwnership`의 유효하지 않은 해제 트랩입니다. 이것들
검사는 변형 이전에 발생하며 실패한 재할당은 원본을 떠납니다.
할당 및 바이트는 변경되지 않습니다.

호스트 예외는 기능 이름과 함께 `HostError`로 변환됩니다.
불투명한 호스트 오류 코드. 게스트 트랩은 일반 리턴으로 변환되지 않습니다.
가치. 호스트는 트랩 세부 정보를 기록할 수 있지만 비밀이나 원시 정보를 노출해서는 안 됩니다.
신뢰할 수 없는 게스트 코드에 대한 브라우저 예외.

### 게스트 소유의 확인된 메모리 작업

상태 저장 게스트 힙을 구현하는 FWS 소스 모듈은 컴파일러 소유의 힙을 사용할 수 있습니다.
`memory_alloc(size: u32) -> u32` 작업,
`memory_dealloc(pointer: u32, size: u32) -> unit`,
`memory_realloc(pointer: u32, oldSize: u32, newSize: u32) -> u32`,
`memory_load_u32(address: u32) -> u32` 및
`memory_store_u32(address: u32, value: u32) -> unit`. 이러한 작업은
모듈 할당자로 직접 낮추거나 WebAssembly 메모리를 확인했습니다.
지침; 호스트 가져오기가 아니며 게스트 상태를 다음에 노출하지 않습니다.
TypeScript.

할당자는 `fws_alloc`와 동일한 소유권 및 트랩 계약을 사용합니다.
`fws_realloc`. 로드 또는 저장에는 전체 4바이트 범위가 필요합니다.
현재 선형 메모리; 이전에 `MemoryOutOfBounds`로 잘못된 범위 트랩이 발생했습니다.
작업이 부분적으로 실행될 수 있습니다. `memory_realloc`은 첫 번째를 보존합니다.
`min(oldSize, newSize)` 바이트를 호출하고 게스트 소유 포인터를 반환하는 반면 호출자는
이후 작업에는 반환된 포인터와 정확한 현재 크기를 사용해야 합니다.
상태 저장 메모리 고정 장치
`packages/forge-web-script/src/fixtures/stateful-memory.fws`은 적합성입니다
이러한 서명, 할당자 재사용, 재귀, 재설정 및 경계에 대한 고정물
함정.

컴파일러 소유 바이트 리더는 게스트에 대해 부호 없는 인덱스 변형도 제공합니다.
핸들로 소스 오프셋을 나타내는 프런트 엔드: `bytes_length_u32(값:
바이트) -> u32` and `bytes_byte_at_u32(값: 바이트, 인덱스: u32) -> u32`. 그들은
서명된 `bytes_length`와 동일한 포인터 길이 범위 검사를 사용하고
`bytes_byte_at` 작업은 호스트 가져오기가 아닙니다. WebLua 프런트 엔드는 다음을 사용합니다.
어휘 분석기 오프셋과 게스트 메모리 주소를 하나로 유지하기 위한 이러한 작업
`u32` 도메인을 확인했습니다.

### 원시 WASM ABI 및 생성된 ESM 계약

위의 표현은 안정적인 원시 WASM ABI입니다. 이는 의도적으로
낮은 수준이며 생성된 JavaScript 파사드가 더 많아지면 변경되지 않습니다.
인체공학적:

```text
raw string value: (pointer: u32, length: u32)
raw bytes value:  (pointer: u32, length: u32)
```

컴파일러에서 생성된 ESM 아티팩트는 ABI를 JavaScript API로 프로젝트합니다.

```ts
type ForgeWebScriptBytes = readonly [pointer: number, length: number];

interface ForgeWebScriptExports {
  readonly memory: WebAssembly.Memory;
  readonly fws_alloc: (size: number) => number;
  readonly fws_dealloc: (pointer: number, size: number) => void;
  readonly fws_realloc: (pointer: number, oldSize: number, newSize: number) => number;
  readonly fws_reset: () => void;
  readonly echo: (value: string) => string;
  readonly processBytes: (value: ForgeWebScriptBytes) => ForgeWebScriptBytes;
}
```

기능 가져오기 및 동적 연결을 포함하여 생성된 모든 선언
내보내기에서는 FWS `string` 값에 `string`을 사용합니다. 생성된 `load` 및
`loadSync` 래퍼는 JavaScript 문자열을 UTF-8로 인코딩하고 포인터 길이를 전달합니다.
변경되지 않은 WASM ABI와 쌍을 이루고 반환된 문자열을 다시 JavaScript로 디코딩합니다.
문자열. 디코딩은 치명적인 UTF-8 디코더를 사용합니다. 잘못된 형식의 게스트 바이트는
대체 문자가 아닌 명시적인 경계 오류입니다.

한 호출에 대한 문자열 인수가 먼저 인코딩되어 하나의 연속된 인수로 압축됩니다.
손님 배정. 이렇게 하면 게스트 한 명을 피하면서 원시 ABI를 변경하지 않고 유지합니다.
인수당 할당 및 JavaScript에서 WASM으로의 복사. 스칼라 인수 유지
직접적인 빠른 경로. `bytes`는 의도적으로 `Uint8Array`로 변환되지 않습니다.
발신자는 계속해서 `ForgeWebScriptBytes`을 전달하고 수신하며 `memory`은
호출자가 모듈의 메모리를 사용하여 원시 바이트 범위를 읽거나 쓸 수 있도록 노출됩니다.
그리고 소유권 규칙.

생성된 어댑터는 문자열 인수용으로 생성된 임시 버퍼를 소유하고
문자열 결과. 결과를 공개하기 전에 디코딩한 다음 각각을 릴리스합니다.
성공 시 `finally` 경로에서 임시 범위가 정확히 한 번, 게스트 트랩, 호스트
예외 및 디코드 실패. 문자열 값이 있는 호스트 기능은 다음을 수신합니다.
JavaScript 문자열이며 JavaScript 문자열을 반환할 수 있습니다. 래퍼는 다음을 수행합니다.
해당 반환 값에 대한 게스트 할당 및 UTF-8 복사본입니다. 호스트 코드는 계속 복사되어야 합니다.
향후 매니페스트가 명시적으로 선언하지 않는 한 반환하기 전에 원시 `bytes` 입력
차입완충계약. `load` 및 `loadSync`은 생성된 동일한 항목을 노출합니다.
계약; 모듈 초기화 스케줄링만 다릅니다.

이 JavaScript 프로젝션을 변경해도 `valueRepresentations`는 변경되지 않습니다.
원시 포인터 길이 ABI, ABI 버전 또는 원시 WASM 콘텐츠 해시입니다.
생성된 아티팩트는 느리게 디코딩된 임베디드 WASM 표현을 하나 유지합니다.
`load`과 `loadSync`은 별도의 페이로드를 구현하지 않고 공유합니다.
사본. 결과적으로 비동기 대 동기화 로더 검사는 동작을 비교해야 합니다.
및 선언, 결정적 콘텐츠 해시 검사는 원시를 해시해야 합니다.
생성된 ESM 소스 크기 또는 로더 구현과 독립적인 WASM 바이트
세부 사항.

## 매니페스트 형식

생성된 각 모듈에는 안정적인 JSON 호환 ABI 매니페스트가 있습니다.
WASM 아티팩트 및 형식화된 ESM 로더:

```json
{
  "format": "forge-web-script-module",
  "languageVersion": "1.0",
  "abiVersion": "1.2",
  "moduleName": "src/clocked",
  "exports": [{ "name": "current_time", "parameters": [], "result": "i64" }],
  "imports": [
    {
      "capability": "clock.now",
      "alias": "now",
      "function": { "name": "now", "parameters": [], "result": "i64" }
    }
  ],
  "sourceImports": [],
  "requiredCapabilities": ["clock.now"],
  "memory": {
    "pageSize": 65536,
    "addressType": "u32",
    "ownership": "caller-owned",
    "stringEncoding": "utf8",
    "byteArrayRepresentation": "pointer-length",
    "allocatorExport": "fws_alloc",
    "deallocatorExport": "fws_dealloc",
    "reallocatorExport": "fws_realloc"
  },
  "valueRepresentations": { "i64": "i64", "string": "pointer-length-u32" },
  "trapModel": "explicit-trap",
  "standardLibrary": { "regexBytecodeVersion": "bytecode-1" }
}
```

실제 매니페스트에는 모든 기본 표현 항목이 포함됩니다.
예제에서 사용된 것입니다. 내보내기, 가져오기 및 기능을 위한 JSON 키는 다음과 같습니다.
반복되는 빌드에서도 안정적입니다. 소스 맵과 콘텐츠 해시는 다음에 의해 방출됩니다.
컴파일러 어댑터이며 ABI 서명 일치의 일부가 아닙니다.

`standardLibrary` 매니페스트 필드는 컴파일러 소유 라이브러리 ID를 기록합니다.
정규식의 경우 `regexBytecodeVersion` 및 선택적 `regexCorpusHash`는 캐시입니다.
그리고 아티팩트 입력. 정규화된 소스, 컴파일러 버전, 최적화
모드, 모듈 그래프, 링크 구성, 표준 라이브러리 ID 및 메타데이터
코퍼스 해시는 캐시 조회 전에 안정적인 순서로 직렬화되어야 합니다. 동일
입력은 동일한 바이트코드 테이블, 매니페스트, 선언, WAT 및
콘텐츠 해시; ID 입력을 변경하면 캐시 누락이 발생합니다. 코퍼스 해시는
말뭉치를 제공하는 패키지가 소유하며 호스트에서 추론해서는 안 됩니다.
런타임 상태.

## 컴파일러 및 CLI 경계

공개 TypeScript 파사드는 프런트엔드 계약과 오케스트레이션을 별도로 유지합니다.
방출에서. 소스 파일이나 해결된 그래프를 받아들이고 구조화된 그래프를 생성합니다.
진단 및 입력된 IR을 수행하고 WebAssembly/WAT 생성을 위임합니다.
`@mission-platform/forge-web-script-wasm`. 백엔드는 이전에 해당 바이트의 유효성을 검사합니다.
반환; 오류는 실행 가능한 출력을 억제합니다. Vite 어댑터 및 LSP 사용
외관은 Node CLI에 의존할 필요가 없습니다.

파일 시스템 워크플로의 경우 `@mission-platform/forge-web-script-cli`을 설치하고
독립형 `forge-web-script` 바이너리를 사용하십시오.

```text
forge-web-script check <entry.fws> [--root <directory>] [--project-root <directory>]
forge-web-script compile <entry.fws> --out-dir <directory>
  [--root <directory>] [--project-root <directory>]
  [--link-mode static|dynamic] [--capability <name>] [--optimization debug|release]
```

`check`은 파일을 작성하지 않고도 소스 및 그래프 입력의 유효성을 검사합니다. 성공적인
`compile`은 정확히 `<entry>.wasm`, `<entry>.wat`, `<entry>.abi.json`를 씁니다.
`<entry>.d.ts`, `<entry>.js` 및 `<entry>.map`을 선택한 출력 디렉터리에 복사합니다.
CLI는 진단이 완료된 후에만 전체 세트를 준비하고 이름을 바꿉니다.
잘못된 소스, 해결되지 않은 그래프 가장자리, 거부된 기능 및 ABI 오류
실행 가능한 아티팩트를 남기지 않고 0이 아닌 상태를 반환합니다. 출력 순서,
매니페스트 JSON, WAT, 선언, 로더 데이터, 소스 맵 및 콘텐츠 해시
동일한 입력에 대해 결정적입니다.

## Vitest 및 Vite 테스트 통합

Vitest 제품군이 필요한 경우 `@mission-platform/forge-web-script-vitest`을 사용하세요.
컴파일러 아티팩트, 구조화된 진단, Wasm 동작, 그래프 링크 확인
또는 생성된 Vite 모듈 계약. 직접 하네스 방식(`compile`,
`compileSource`, `compileGraph`, `inspect`, `load`, `loadSync` 및
`checkVmParity`) 공개 컴파일러/런타임 계약을 위임합니다. 그
`defineForgeWebScriptVitestConfig` 도우미가 프로덕션을 설치합니다.
소비자 Vite 플러그인 및 설정을 유지하면서 `forgeWebScriptPlugin`.
자세한 내용은 [미션 플랫폼 테스트](../../../../../../docs/locales/ko/testing.md#forge-web-script-tests)를 참조하세요.
구성 및 고정 장치 예.

하네스는 키가 지정된 명시적 기능 맵을 통해서만 호스트 기능을 허용합니다.
매니페스트 기능 이름을 기준으로 합니다. 예를 들면 다음과 같습니다.

```ts
const exports = await harness.load<{ current: () => bigint }>('capabilities/clock-now.fws', {
  'clock.now': { now: () => 123n },
});
```

누락된 선언된 가져오기 및 선언되지 않은 공급된 가져오기는 실패입니다. 테스트
`.fws` 또는 해당 가상 아티팩트 쿼리를 가져오는 프로젝트는
유형 전용 선언 하위 경로
`@mission-platform/forge-web-script-vitest/forge-web-script`을 자신에게
TypeScript `types` 목록 또는 참조된 테스트 유형 진입점입니다.

아래의 공유 하네스 고정 장치
`packages/forge-web-script-vitest/fixtures/`은 다음을 위한 크로스 패키지 코퍼스입니다.
유효한 모듈, 진단, 기능, 그래프 및 자체 호스팅 패리티.
패키지 로컬 픽스처는 컴파일러, 런타임 및 플러그인에 적합하게 유지됩니다.
개인 정보를 테스트하는 테스트입니다.

`checkVmParity`는 제한된 자체 호스팅 lex-stage 패리티 계약을 보고합니다.
`interpret`, `jit` 또는 `aot` 모드. 패리티, 지문, 걸음 수 확인
및 AOT 재현성 메타데이터를 포함하지만 이 보고서를 임의적인 것으로 취급하지 마십시오.
컴파일된 FWS VM 실행; Wasm 로딩은 런타임 동작 확인으로 유지됩니다.

## 진단

진단은 `code`, `severity`, `phase`, `message`,
`fileName` 및 소스 `span`; 실행 가능한 기록에는 `hint`도 포함될 수 있습니다.
단계는 `lex`, `parse`, `type-check` 또는 `abi` 중 하나입니다. 안정적인 v1 코드
가족에는 다음이 포함됩니다:

| 코드 계열     | 의미                                                                         |
| ------------- | ---------------------------------------------------------------------------- |
| `FWS-LEX-*`   | 잘못된 문자/이스케이프, 원시 문자열 줄 종결자 또는 종료되지 않은 문자열/주석 |
| `FWS-PARSE-*` | 잘못된 모듈, 선언, 명령문 또는 표현식 구문                                   |
| `FWS-TYPE-*`  | 잘못된 기본 유형, 이름, 연산자, 인수 또는 반환                               |
| `FWS-ABI-*`   | 중복된 이름, 거부된 기능, 내보내기 또는 가져오기                             |
| `FWS-REGEX-*` | 지원되지 않거나 잘못된 형식의 컴파일러 소유 정규식 패턴                      |

오류로 인해 아티팩트 생성이 방지됩니다. 경고 및 정보 진단은 다음과 같습니다.
의미론을 변경하지 마십시오. 진단 순서는 소스 순서이고 그 뒤에 단계가 따릅니다.
동일한 스팬에 진단을 연결하려면 주문하세요. Vite 어댑터는 보존해야 합니다.
Vite에 오류를 전달할 때 안정적인 코드와 범위.

## 부트스트랩 적합성 계약

v1 컴파일러 대상은 의도적으로 언어 및 ABI 표면으로 제한됩니다.
여기에 문서화되어 있습니다. 프로그램이 부트스트랩 하위 집합에 있는 경우
모듈, 위의 어휘 규칙, 기본 유형, `string`/`bytes` 값,
명시적으로 내보낸 함수, 기능 가져오기, 로컬 선언, 호출,
표현식, `if`/`else`, `while`, C 스타일 `for`, `do while` 및 `return`.
확장된 집합 계약은 별도로 적합성 테스트를 거쳐 추가됩니다.
구조체, 열거형, 일반 유형, 컬렉션 값, 함수 값 및
`match`; 암시적 브라우저나 Node 전역에 의존해서는 안 됩니다.

`packages/forge-web-script/src/fixtures/bootstrap.ts`는 실행 파일입니다.
적합성 말뭉치. 승인된 고정 장치는 오류 진단 없이 검증되어야 합니다.
거부된 고정 장치는 나열된 안정적인 진단 코드와 유효한 코드를 보고해야 합니다.
소스 범위. 다른 언어로 구현하면 동일한 설비를 사용할 수 있습니다.
정규화된 AST, 진단 및 매니페스트 JSON을 형성하고 비교합니다. 고정물
Suite는 구현별 스냅샷이 아닌 적합성 대상입니다.

공유 소스 코퍼스
`packages/forge-web-script-vitest/fixtures`은 동일한 경계를 포함합니다.
`valid/collections.fws`은 컬렉션 리터럴, 인덱싱, 상황별 연습을 수행합니다.
빈 벡터, `length()` 및 유효한 이스케이프 문자열;
`valid/aggregates.fws`은 함수 값, 정규화된 `Result::Ok` 및
`Result::Error` 생성자 및 arm-local 일치 바인딩. 그리고
`diagnostics/collections.fws`은 잘못된 수집 호출 및 집계를 실행합니다.
생성자/바인딩 진단. 컬렉션 픽스쳐도 컴파일됩니다.
공유된 Wasm 하네스를 통해; 집계 구문은 프런트엔드로 유지됩니다.
해당 하니스에 대해 전체 Wasm 낮추기가 활성화될 때까지 적합성 소스입니다.

## 호환성 정책

언어 및 ABI 주요 버전은 기본적으로 호환되지 않습니다. 로더가 수락할 수 있음
생산자가 표시한 경우에만 더 높은 마이너 버전의 동일한 메이저 ABI
새로운 필드는 선택 사항이며 소비자는 알 수 없는 필드를 안전하게 무시합니다. 제거
내보내기, 유형 변경, 소유권 변경 또는 기능 변경
서명에는 ABI 개정이 필요하며 이를 거부하는 로더에 의해 거부되어야 합니다.
그것을 구현하지 마십시오. ABI `1.2`은 유지에도 불구하고 획기적인 개정입니다.
`1.x` 번호 매기기: 필수 `fws_realloc` 메모리 내보내기는 선택 사항이 아닙니다.
ABI `1.1` 매니페스트는 자동으로 업그레이드되지 않습니다. 기능 추가 절대
기존 모듈을 자동으로 변경합니다. 새 매니페스트 선언이 필요하고
호스트 승인.

컴파일러 버전은 ABI 버전이 아닙니다. 컴파일러는 해당 버전을 다음 위치에 포함해야 합니다.
컴파일 입력 및 아티팩트 해시이지만 로더는 언어와 ABI를 비교합니다.
버전과 매니페스트 서명. 실패한 호환성 검사는 다음과 같습니다.
런타임 대체가 아닌 로드 시간 진단입니다. Rust 및 AssemblyScript 모듈
공존하는 동안 기존 래퍼와 ABI 계약을 계속 사용합니다.
기간; Forge Web Script는 이를 재해석하거나 대체하지 않습니다.

정규식 표준 라이브러리 호환성은 의도적으로 호스트 정규식과 분리되어 있습니다.
호환성. Forge 바이트코드 계약 및 컴파일러는 허용되는
구문 및 안정적인 진단; 참조 VM은 검증에만 사용됩니다.
가장 왼쪽/역추적 동작, UTF-16 캡처 오프셋 및 `-1` 설정되지 않은 센티널
백엔드 VM을 사용할 수 있을 때까지. 브라우저 또는 Node 정규식 동작
차등 Oracle일 뿐이며 TypeScript 참조 VM이나
호스트 정규 표현식 API는 프로덕션 표준 라이브러리 호출을 실행할 수 있습니다.
Opcode 번호 지정, 캡처 슬롯 레이아웃, 지원되는 구문, 진단 변경
코드 또는 일치하는 의미론에는 새로운 정규식 바이트코드 버전과 새로운
유물 신원. 백엔드/런타임 적합성 및 전화번호 마이그레이션까지
증거가 완전하더라도 AssemblyScript 전화 구현은 여전히
명시적인 레거시 회귀 오라클이며 Forge 아티팩트와 절대 혼합되지 않습니다.

## 공존과 이주

Forge Web Script는 중립용 생산 대상입니다.
`@mission-platform/code-scanner` 아티팩트. 스캐너 그래프는 정적으로 링크됩니다.
QR, 매트릭스 및 바코드 디코더 소스가 하나의 독립형 WebAssembly에 포함됩니다.
인공물; 동적 프로필은 소스 모듈 경계를 명시적으로 유지하고
해결된 내보내기를 캐시합니다. Rust `code-scan` 상자는 여전히 사용 가능합니다.
네이티브/참조 구현이며 패키지의 런타임 종속성이 아닙니다.
공개 QR, 매트릭스 및 바코드 패키지는 자체적으로 입력된 래퍼를 유지합니다.
해당 API는 스캐너 그래프를 통해 자동으로 리디렉션되지 않습니다.

`codecMigrationFixture`
`packages/forge-web-script/src/fixtures/codec-migration.ts`이 첫 번째입니다.
코덱 어댑터 모양의 적합성 고정 장치입니다. 선언한다
`codec.barcode.encode(payload: string) -> bytes`는 `encode_payload`를 내보내고
포인터 길이 ABI이며 주입 가능한 호스트를 사용하여 호출자 소유 출력을 작성합니다.
의도적으로 좁은 ABI 고정 장치로 유지됩니다. 호스트는 결정론적 방법을 사용할 수 있습니다.
설비가 Forge 웹 스크립트를 증명하는 동안 적합성 테스트를 위한 가짜
경계. 프로덕션 코덱 패리티에는 여전히 일치하는 벡터가 필요하며
단순히 일치하는 함수 이름이 아닌 성능 측정입니다.

해당 레거시 래퍼는 `encode(symbology, data)`을 내보내고 반환합니다.
`Uint8Array | undefined`; 고정 장치는 `encode_payload(payload)`을 내보내고
ABI 소유 `bytes` 쌍을 반환합니다. 그 의도적인 차이는
명시적인 기능 경계: 마이그레이션 어댑터는 레거시를 매핑할 수 있습니다.
선언된 기능에 대한 기호/데이터 호출이 있지만 고정 장치는 그렇지 않습니다.
두 개의 내보내기가 아직 동작적으로 상호 교환 가능하다고 가정합니다.

### 구현 선택

| 워크로드 또는 요구사항                                         | 선택                                                                      | 이유                                                                                                                   |
| -------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| 기존 QR 또는 매트릭스 패키지 동작                              | `@mission-platform/qr-code` / `@mission-platform/matrix-code`             | 패키지별 유형의 ESM 래퍼는 해당 공용 API에 계속 사용할 수 있습니다.                                                    |
| 중립 이미지 및 카메라 스캐너 동작                              | `@mission-platform/code-scanner`                                          | 기본적으로 정적으로 연결된 FWS 그래프를 사용하거나 캐시된 디스패치와 함께 명시적인 동적 소스 모듈 프로필을 사용합니다. |
| 기존 바코드 동작                                               | `@mission-platform/barcode`                                               | 패키지 로컬 Forge 웹 스크립트 그래프는 입력된 바코드 외관을 제공합니다.                                                |
| 명시적인 호스트 효과를 갖춘 새로운 범용 브라우저 안전 컴퓨팅   | Forge 웹 스크립트 플러스 `@mission-platform/vite-plugin-forge-web-script` | 버전이 지정된 `.fws` 소스, 매니페스트, 형식화된 로더 및 기본 거부 기능.                                                |
| 기존 AssemblyScript 소스 또는 AssemblyScript 관련 마이그레이션 | `@mission-platform/vite-plugin-assemblyscript`                            | `.ts` AssemblyScript 항목을 컴파일하고 생성된 원시 내보내기 계약을 유지합니다.                                         |
| 프레임워크 중립적인 UI/구성 요소 컴파일                        | Forge 구성 요소 컴파일러                                                  | Forge Web Script는 `FrameworkOutputPlugin` 또는 구성 요소 대상을 대체하지 않습니다.                                    |

`.fws` 항목에만 Forge Web Script Vite 플러그인을 사용하세요. 사용
기존 AssemblyScript 항목을 위한 AssemblyScript 플러그인입니다. 마이그레이션하는 동안
애플리케이션은 두 종류의 모듈을 모두 번들로 묶을 수 있습니다. 각 로더는 자체 모듈을 소유합니다.
초기화, 메모리, ABI 검증, 기능 가져오기가 모두 이루어져야 합니다.
Forge 웹 스크립트 모듈에 명시적으로 제공됩니다.

### 증거 및 지원 중단 게이트

마이그레이션 작업에서는 각 후보에 대해 4가지 독립적인 비교를 기록해야 합니다.

1. 잘못된 입력을 포함하여 공유 골든 벡터에 대해 내보낸 동작
   경계 케이스;
2. 매니페스트/버전 확인, 가져오기 거부, 경계 확인을 포함한 ABI 안전
   트랩 변환 및 버퍼 소유권;
3. 재현 가능한 해시, 선언을 포함하여 생성된 아티팩트 안정성
   소스 맵 및 브라우저/Node 로딩; 그리고
4. 컴파일을 다루는 대표적인 릴리스-빌드 성능 측정
   시간, 아티팩트 크기, 초기화 및 정상 상태 호출.

마이그레이션 픽스처는 현재 이 ABI 및 아티팩트 부분을 제공합니다.
증거. 기존 바코드 래퍼 및 디코더 패키지 테스트는 그대로 유지됩니다.
행동 및 레거시 회귀 오라클; 오히려 조명기와 함께 실행하십시오.
고정 장치를 대체 벤치마크로 취급하는 것보다. 포지 웹
워크로드가 통과될 때까지 스크립트는 Rust 또는 AssemblyScript 경로를 더 이상 사용하지 않아야 합니다.
지원되는 두 호스트 환경에서의 네 가지 비교는 모두 문서화되어 있습니다.
롤백 경로가 있으며 해결되지 않은 ABI 또는 보안 발견 항목이 없습니다. 이후 지원 중단
발표된 호환성 창과 어댑터 또는 마이그레이션 가이드가 필요합니다.
제거하려면 후속 주요 릴리스가 필요합니다.

## 클래스 없는 집계 및 실행 계약

확장된 클래스 없는 계약은 `enum` 태그가 지정된 불변 `struct` 값을 추가합니다.
값, 구조적 컴파일 타임 `interface` 선언, 일반 매개변수
인터페이스 경계, 함수 값, 컬렉션 리터럴/메서드 및
`match` 표현식/문장. 자격을 갖춘 열거형 생성자는 `Type::Variant`를 사용합니다.
일치 바인딩은 arm-local입니다. 예를 들어,
`Result::Ok(item) => item`는 해당 팔에서만 `item`을 바인딩합니다. 표준
`Result<T, E>` 계약은 `Err(E)`이 아닌 `Ok(T)` 및 `Error(E)`를 사용합니다.
구조체 업데이트는 순수한 값 변환입니다. 구조체도 인터페이스도 아닙니다
생성자, ID, 상속, 수신자 또는 런타임 디스패치가 있습니다. 모두
클래스/객체 지향 구성(`class` 포함)을 선언하려고 시도했습니다.
`constructor`, `extends`, `impl`, `new` 및 `trait`)은 안정적으로 거부됩니다.
진단 `FWS-PARSE-052`.

집계 레이아웃은 표준 이름 순서로 매니페스트에 기록됩니다. 구조체
필드는 순서가 지정되고 4바이트로 정렬된 값입니다. 열거형 레이아웃은 4바이트로 시작합니다.
판별. 필드 소유권이 명시적이며(`owned`, `borrowed` 또는 `shared`)
기본값은 소유된 불변 스토리지입니다. 일반 값은 콘크리트별로 특화되어 있습니다.
유형; 설명자 기반 표현은 명시적 반복자용으로 예약되어 있습니다.
인터페이스 경계는 특수화 레코드로 표시됩니다.

VM 바이트코드 계약은 백엔드 독립적입니다. `ForgeWebScriptVmModule`
유형이 지정된 함수, 상수, 집계 레이아웃, 특수화,
기능 가져오기, 소스 범위 및 64KiB 선형 메모리
`fws_alloc`/`fws_dealloc`/`fws_realloc` 경계. `interpret`, `jit` 및 `aot`이 실행됩니다.
동일한 명령어/값/트랩 의미론에 대한 모드; JIT 캐시 키 및 AOT
아티팩트에는 컴파일러 및 소스 해시가 포함됩니다. 기능은 호출만 가능합니다.
모듈 매니페스트에 있는 경우.

반응형 런타임 상태는 데이터입니다. 엔터티 인덱스는 생성 카운터를 사용합니다.
구성 요소 저장소와 세계는 변경할 수 없는 스냅샷이며 시스템은 세계를 반환합니다.
전환. 신호, 구독, 쿼리 요구 사항, 결정적 순서,
제한된 스케줄러 단계는 명시적인 값입니다. ECS 호스트 통합에는 다음이 필요합니다.
다른 FWS 가져오기와 마찬가지로 선언된 기능 경계가 동일합니다.

## 범위 경계

v1 구현은 TypeScript 프런트엔드와 결정적 WebAssembly입니다.
백엔드는 호환성 외관과 독립형 Node CLI를 통해 노출됩니다.
적합성 고정 장치와 생성된 아티팩트가 호환성 대상입니다.

자체 호스팅 컴파일(컴파일러를 FWS 프로그램으로 실행)은 명시적으로
이 v1 계약의 클래스 없는 표면 및 VM 바이트코드 실행으로 지원됩니다.
모델이지만 v1 ABI 및 언어의 정확성을 위해 필요하지는 않습니다.
경계. 더욱 풍부한 언어 기능, 기존 Rust 대체 또는
AssemblyScript 워크로드 및 기타 v1이 아닌 컴파일러 발전은 이 범위를 벗어납니다.
계약.

## 툴링 컷오버 및 부트스트랩 경계

CLI, Vite 플러그인, 언어 서비스 및 LSP는 모두 공용 컴파일러를 사용합니다.
서비스 계약. 어휘분석기 마이그레이션은 의도적으로 LSP 우선입니다.
EBNF 문법은 TypeScript 토큰 계약, 언어 서비스 및
편집기 어댑터는 첫 번째 허용 경계이며 컴파일러/프론트엔드 또는
자체 호스팅 소유권은 토큰 종류, 진단, 기호,
완료, 마우스 오버 및 UTF-16 범위가 준수됩니다. 현재 제한된 FWS 작성
lex/token 단계는 호환성 패리티 경로로 유지되는 반면 TypeScript 어휘 분석기는
언어 서비스 게이트가 마이그레이션되고 있습니다. 그것은 문법 권위가 아닙니다.

LSP 게이트가 녹색이 된 후에는 동일한 문법이 FWS/VM 어휘 분석기로 이식됩니다.
그런 다음 제한된 파서 모듈 단계로 이동합니다. 나머지 프런트엔드, 링커,
옵티마이저, 매니페스트 및 Wasm-emission 단계는 여전히 시드 지원됩니다.
석방; 이 경계는 의도적이며 다음과 같이 노출됩니다.
`ForgeWebScriptSelfHostedStageReport`이 완전한 것으로 표시되지 않고
자체 호스팅.

CLI는 `--vm-mode interpret|jit|aot`을 사용하여 VM 모드를 선택합니다. Vite 플러그인
언어 서비스 작업 공간 옵션은 해당 `selfHostedVmMode`를 사용합니다.
가치. 세 가지 모드 모두 동일한 바이트코드를 실행하고 lex 지문을 비교합니다.
독립적인 시드 참조를 사용합니다. 불일치 또는 VM 트랩이 안정됨
`FWS-BOOTSTRAP-001` 진단을 통해 잘못된 Wasm 아티팩트가 생성되는 것을 방지합니다.
방출됩니다. `interpret`는 빠른 확인을 위한 것이고 `jit` 및 `aot`은 빠른 확인을 위한 것입니다.
적합성/개발 모드; 컴파일된 Wasm은 여전히 일반적인 프로덕션으로 남아 있습니다.
아티팩트 및 런타임 경로.

그래프 연결, 선언, 소스 맵, ABI 매니페스트, 결정적 해시,
선형 메모리 소유권, 기능 거부, 컬렉션/ECS 값 및 명시적
비동기 스케줄러 기능은 기존 공개 계약의 적용을 받습니다.
도구 어댑터는 주변 호스트 API 또는 암시적 개체 디스패치를 ​​추가하지 않습니다.
마이크로태스크 및 웹 작업자는 선언된 스케줄러를 통해서만 사용할 수 있습니다.
능력과 그 순서는 명시적이고 결정적입니다. 소비자
이후 릴리스까지 VM 보고서를 패리티/적합성 신호로 처리해야 합니다.
추가 컴파일러 단계를 동일한 FWS 경계 뒤로 이동합니다.
