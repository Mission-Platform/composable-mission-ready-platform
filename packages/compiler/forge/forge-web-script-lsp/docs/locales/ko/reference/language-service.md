# Forge 웹 스크립트 언어 도구

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/forge-web-script-lsp/docs/reference/language-service.md: [packages/forge-web-script-lsp/docs/reference/language-service.md](../../../reference/language-service.md)
> 언어: 한국어 (ko)

Forge 웹 스크립트(`.fws`)에는 편집자 중립 언어 서비스인 stdio가 있습니다.
LSP(Language Server Protocol) 서버 및 브라우저 연결 Monaco 어댑터.
세 가지 모두에서 실행 가능한 Forge Web Script v1 계약을 사용합니다.
`@mission-platform/forge-web-script`, 따라서 진단, 소스 범위, 기호,
완료 및 호버 정보는 동일한 파서에서 파생되며
검증인.

지원되는 언어 계약은 **버전 1.0**이고 ABI 계약은
**버전 1.2**. 툴링은
문법, 컴파일러 출력, ABI 또는 기존 Rust 및
AssemblyScript 통합. 보다 [포지 웹 스크립트 v1](../../../../../forge-web-script/docs/locales/ko/reference/language.md)
언어 및 ABI 참조용입니다.

## 특징과 경계

현재 언어 서비스는 다음을 제공합니다.

- 어휘 분석, 구문 분석, 유형 검사 및 ABI 검증을 통한 진단
- LSP 및 Monaco에 적합한 UTF-16 인식 범위
- 모듈, 기능, 매개변수, 로컬, 기능에 대한 문서 기호
  별칭, 집계 유형, 필드, 열거형 변형, 인터페이스 메서드, 일반
  매개변수, 반복자 바인딩, 일치 바인딩 및 기본 유형
- Forge 키워드, 기본 유형, 선언, 지역에 대한 완성
  집계 유형, 일반 유형, 함수, 컴파일러 소유 문자열 및 정규식
  기능, 기능 별칭 및 호스트 목록에 포함된 기능 이름
- 선언, 매개변수, 지역, 호출 등에 대한 호버 정보
  AST가 집계를 포함하여 기호를 식별할 때 기능 가져오기
  유형, 일반 유형, 컴파일러 소유 표준 라이브러리 호출 및 렌더링
  소스 정의 함수에 대한 문서화; 그리고
- 주석, 문자열, 숫자, 키워드, 유형에 대한 v1 어휘 토큰화
  연산자, 구두점, 선언 및 유효하지 않은 텍스트.

LSP 서버는 진단, 완료, 호버 및 전체 의미 체계를 노출합니다.
토큰. 정의로 이동, 참조, 이름 바꾸기, 서식 지정, 코드 작업,
소스 레벨 교차 파일 언어 가져오기 및 브라우저 호스팅 LSP 전송
구현되지 않습니다. 모나코는 대신 현지 언어 서비스 어댑터를 사용합니다.
Node 서버에 연결하는 중입니다.

의미 체계 토큰은 언어 서비스의 어휘 분류를 사용합니다. 는
초기화 응답은 `comment`, `declaration`,
`identifier`, `invalid`, `keyword`, `number`, `operator`, `punctuation`,
`string` 및 `type`; 클라이언트는 인코딩된 전체 문서 토큰을 요청합니다.
`textDocument/semanticTokens/full`.

## 편집기 결과의 함수 문서화

언어 서비스는 소스 정의 최상위 수준에 대한 문서를 공개합니다.
기능. 선언을 위해 동일한 정규화된 문서 문자열을 사용합니다.
호버, 참조 호버 및 기능 완성. 호스트 제공 기능
서명은 기존의 선택적 문자열 문서를 계속 사용하며
FWS Javadoc 주석으로 구문 분석되지 않습니다.

예를 들어 다음 소스는 다음과 같습니다.

```fws
/**
 * Adds one to a value.
 *
 * @param value Input value.
 * @return Incremented value.
 * @deprecated Prefer `increment` in new code.
 */
export fn add(value: i32) -> i32 {
  return value + 1;
}

export fn caller() -> i32 {
  return add(1);
}
```

선언 부분이나 `caller`의 호출 부분에 `add`을 가리키면
서명 뒤에 렌더링된 문서가 옵니다.

```text
export add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

`caller`의 호출 사이트에서 `add`을 가리키면 동일한 문서가 반환됩니다.
비선언 서명 포함:

```text
add(i32): i32

Adds one to a value.

@param value Input value.

@return Incremented value.

@deprecated Prefer `increment` in new code.
```

`add` 완성에는 동일한 문서 문자열이 함께 전달됩니다.
세부사항/서명. 설명 단락과 태그는 빈 줄로 구분됩니다.
태그 순서, 중복 태그, 알 수 없는 태그는 보존됩니다. 핵심 구문과
함수 연관 및 지원되는 주제를 포함한 정규화 규칙
양식은 다음에 지정되어 있습니다. [FWS 언어 참조](../../../../../forge-web-script/docs/locales/ko/reference/language.md).

문서는 정보용 메타데이터일 뿐입니다. 진단 내용은 변경되지 않습니다.
유형 검사, 함수 분석, 생성된 선언, ABI 서명,
매니페스트, Wasm/WAT, 런타임 동작 또는 실행 가능한 해시. 문서
따라서 편집은 변경하지 않고 호버 및 완료 내용을 변경합니다.
컴파일된 모듈 계약.

### LSP 렌더링

stdio 서버는 프레임워크 중립적인 언어 서비스 결과를 표준에 매핑합니다.
LSP 값:

- `textDocument/hover`은 값이 서명과 결합된 Markdown을 반환합니다.
  빈 줄이 있는 문서;
- `textDocument/completion`은 각 소스 기능 항목의 `documentation`를 설정합니다.
  필드를 동일한 렌더링된 문자열로 변환하고 기존 `detail` 서명을 그대로 둡니다.
  변함없이.

LSP 서버는 태그를 재해석하거나 편집기별 서식을 적용하지 않습니다.
클라이언트는 반환된 Markdown/일반 텍스트를 있는 그대로 표시할 수 있습니다.

### 모나코 렌더링

`@mission-platform/content`은 동일한 처리 중인 언어 서비스를 등록합니다.
`ForgeMonacoEditor`에서 사용하는 공급자:

- Monaco hover `contents`에는 다음과 같은 서명과 렌더링된 문서가 포함되어 있습니다.
  별도의 Markdown 호환 값;
- 소스 기능 제안의 `documentation` 필드에 동일한 내용이 포함되어 있습니다.
  문자열을 LSP 완성으로 렌더링합니다.
- 어휘 `comment` 토큰 분류는 두 가지 모두에 대해 변경되지 않습니다.
  일반 및 문서 블록 주석.

Monaco 어댑터가 Node LSP 서버에 연결되지 않거나
문서 파서. 언어 서비스 결과를 전달하므로 브라우저와
stdio 클라이언트는 일관성을 유지하며 둘 다 UTF-16 소스 범위를 사용합니다.

## stdio 서버 실행

서버는 `@mission-platform/forge-web-script-lsp`으로 게시되고
실행 파일 `forge-web-script-lsp`을 노출합니다. 표준 LSP를 통해 말합니다.
표준 입력/표준 출력; 프로토콜 메시지는 애플리케이션에 의해 stdout에 기록되지 않습니다.
로깅. 준비 상태 및 오류 메시지가 stderr에 기록됩니다.

이 저장소의 체크아웃에서 다음을 사용하여 빌드하고 실행합니다.

```sh
pnpm --filter @mission-platform/forge-web-script-lsp build
node packages/forge-web-script-lsp/dist/main.js
```

패키지가 외부 프로젝트에 설치되면 클라이언트를 구성합니다.
패키지 실행 파일을 직접 호출하려면 다음을 수행하십시오.

```sh
forge-web-script-lsp
```

서버에는 Node.js 24 이상이 필요합니다. `--stdio` 플래그를 사용하지 않습니다.
stdio는 항상 전송 수단입니다. 클라이언트는 `initialize`을 보내야 하며
기능을 반환한 다음 일반 `initialized` 알림을 보냅니다.
서버는 전체 텍스트 동기화, 작업 공간 폴더, 감시를 지원합니다.
파일 변경, 완료, 마우스 오버 및 종료/종료.

### Stdio 클라이언트 구성 예

명령과 인수를 별도로 허용하는 클라이언트는 다음을 사용해야 합니다.
설치된 패키지의 경우 `forge-web-script-lsp`입니다. 체크아웃에서는 `node`을 사용할 수 있으며
대신 빌드된 진입점:

```json
{
  "command": "node",
  "args": ["${workspaceFolder}/packages/forge-web-script-lsp/dist/main.js"],
  "filetypes": ["fws"],
  "rootPatterns": ["package.json", ".git"]
}
```

예를 들어 Neovim의 내장 LSP 클라이언트는 설치된 실행 파일을 사용할 수 있습니다.

```lua
vim.lsp.config('forge_web_script', {
  cmd = { 'forge-web-script-lsp' },
  filetypes = { 'fws' },
  root_markers = { 'package.json', '.git' },
})
vim.lsp.enable('forge_web_script')
```

Helix는 `languages.toml`에서 동일한 실행 파일을 사용할 수 있습니다.

```toml
[language-server.forge-web-script-lsp]
command = "forge-web-script-lsp"

[[language]]
name = "fws"
scope = "source.fws"
file-types = ["fws"]
language-servers = ["forge-web-script-lsp"]
```

VS Code에는 LSP 클라이언트 확장이 필요합니다. 해당 확장을 다음과 같이 구성하십시오.
이러한 필드를 일반 필드에 추가하는 대신 동일한 명령 및 인수
`settings.json`.

## 편집기 통합

이 저장소는 VS Code 및 IntelliJ IDEA용 자사 클라이언트를 제공합니다.
두 클라이언트 모두 진단, 완료, 가리키기 및 작업을 위해 이 stdio 서버를 사용합니다.
완전한 의미 토큰; 두 클라이언트 모두 파서, PSI 모델 또는 의미 체계를 포함하지 않습니다.
분석 구현. 서버에는 Node.js **24 이상**이 필요합니다. 에이
플랫폼별 Node 런타임은 편집기 통합과 함께 번들로 제공되지 않습니다.

### VS 코드

다음에서 `fws-vscode-0.1.0.vsix` 파일을 설치합니다.
**확장: VSIX에서 설치**가 포함된 `extensions/fws-vscode` 릴리스 출력,
그런 다음 VS Code를 다시 로드하세요. `.fws` 파일을 열면 확장이 활성화됩니다. 는
기본 시작 경로는 VSIX에 번들로 제공되는 서버이며 확장은
stdio를 통해 구성된 Node 실행 파일로 시작합니다.

확장은 `fws` 언어 ID, `.fws` 파일 이름 연결,
기본 주석/괄호/어휘 강조 및 LSP 파일 감시자. 는
서버는 의미론적 토큰과 모든 언어 동작에 대한 책임을 집니다.
작업공간 폴더는 `initialize`에서 `file:` URI로 전송되어
서버의 작업공간 루트 및 경로 격리 계약.

VS Code 설정(또는 `settings.json`)에서 확장을 구성합니다.

```json
{
  "forgeWebScript.nodePath": "/path/to/node-24/bin/node",
  "forgeWebScript.serverPath": "",
  "forgeWebScript.serverArgs": [],
  "forgeWebScript.trace.server": "off"
}
```

`forgeWebScript.nodePath`의 기본값은 `node`이며 Node으로 확인되어야 합니다. 24 또는
최신. 패키지된 서버를 사용하려면 `forgeWebScript.serverPath`를 비워 두세요.
절대 경로 또는 첫 번째 작업 공간 폴더에 대한 상대 경로로 설정하십시오.
로컬로 구축되었거나 프로젝트에서 제공한 `dist/main.js`을 테스트합니다. 추가
인수는 서버 진입점 이후에 전달됩니다. `messages` 또는 `verbose` 사용
LSP 추적용; 시작 실패는 **Forge 웹 스크립트에 기록됩니다.
Language Server** 출력 채널이며 편집기 오류로 표시됩니다.

이 저장소의 로컬 개발의 경우:

```sh
pnpm install --frozen-lockfile
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
```

빌드는 먼저 공유 LSP 패키지를 빌드한 다음 해당 진입점을 준비합니다.
`extensions/fws-vscode/server` 아래의 런타임 종속성. `package`
`extensions/fws-vscode/fws-vscode-0.1.0.vsix`를 생성합니다. 개발 소스
테스트 파일은 `.vscodeignore`에 의해 제외됩니다. 포장된 연기 검사
준비된 서버를 초기화하고 광고된 완료, 마우스 오버,
의미 토큰 및 안정적인 진단 동작.

### IntelliJ IDEA / LSP4IJ

플러그인 ZIP을 빌드하고 **설정 | 플러그인 | 기어 |
디스크에서 플러그인 설치**:

```sh
cd extensions/fws-ij
JAVA_HOME=/path/to/jdk-23 ./gradlew test verifyPlugin buildPlugin --no-daemon --offline
```

결과 `build/distributions/fws-ij-0.1.0.zip`에는 씬이 포함됩니다.
LSP4IJ 통합. 플러그인은 IntelliJ IDEA 커뮤니티에 대해 컴파일됩니다.
2024.3.3(빌드 243), 빌드의 개방형 호환성 범위를 유지합니다.
243 이후 버전이며 WebStorm 2026.2.1(브랜치 262 포함)에 대해 검증되었습니다.
`WS-262.9437.145`). LSP4IJ 0.20.1을 고정하고 Node.js 또는
언어 서버. 즉시 실행되지 않으면 설치 후 IDE를 다시 시작하세요.
`.fws` 파일을 인식합니다.

플러그인은 `*.fws`을 언어 ID `fws`에 매핑하고 하나의 공유 stdio를 시작합니다.
프로젝트용 서버입니다. IntelliJ 구성은 다음에서 독점적으로 제공됩니다.
**설정 | 도구 | Forge 웹 스크립트**; 프로젝트 스크립트나 Flora가 없습니다.
구성 경로. 구성:

- **Node.js 실행 파일** — Node 24 이상; 기본값은 `node`입니다.
- **언어 서버 명령/경로** — 기본값은 `forge-web-script-lsp`이며
  프로젝트 `node_modules/.bin` 설치를 해결합니다(상위 항목 포함).
  작업공간 루트) 또는 `PATH`. 다음과 같은 명시적인 JavaScript 진입점
  `node_modules/@mission-platform/forge-web-script-lsp/dist/main.js`는 또한
  지원됩니다.
- **서버 인수** — 선택적으로 인용된 인수가 서버에 전달됩니다.
- **LSP 추적** — `off`, `messages` 또는 `verbose`.
- **FWS 파일이 열릴 때 언어 서버 시작** — 시작 토글.

프로젝트-로컬 CLI의 경우 IntelliJ에서 연 프로젝트에 서버를 설치합니다.

```sh
pnpm add -D @mission-platform/forge-web-script-lsp
```

플러그인은 IntelliJ 프로젝트 루트를 프로세스 작업 디렉터리로 사용합니다.
LSP4IJ는 문서 수명주기 및 작업공간 알림을 제공합니다. 는
서버의 루트 경계 호스트는 파일 열거, 감시 파일을 수행합니다.
무효화 및 모든 언어 분석. 동일한 패키지 설정 상태는 다음과 같습니다.
LSP 실행기와 일반 stdio DAP 어댑터 모두에서 사용됩니다.

### 교차 편집자 검증

공유 언어 서비스/LSP 검사와 두 클라이언트 파이프라인을 모두 실행하세요.
저장소 루트. IntelliJ 명령에는 고정된 JDK가 지원되는 JDK가 필요합니다.
Gradle/IntelliJ 툴체인; 다음은 macOS의 예입니다.

```sh
pnpm --filter @mission-platform/forge-web-script-language-service test
pnpm --filter @mission-platform/forge-web-script-language-service build:check
pnpm --filter @mission-platform/forge-web-script-language-service lint
pnpm --filter @mission-platform/forge-web-script-language-service format
pnpm --filter @mission-platform/forge-web-script-lsp test
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp lint
pnpm --filter @mission-platform/forge-web-script-lsp format
pnpm exec turbo run build --filter=fws-vscode
pnpm --filter fws-vscode test
pnpm --filter fws-vscode check:packaging
pnpm --filter fws-vscode package
JAVA_HOME=/Library/Java/JavaVirtualMachines/jdk-23.jdk/Contents/Home \
  ./extensions/fws-ij/gradlew -p extensions/fws-ij test verifyPlugin buildPlugin --no-daemon --offline
```

단계적 서버와 IntelliJ 스모크 테스트는 동일한 초기화를 수행합니다.
진단, 완료, 호버, 의미 토큰, 종료 및 프로젝트 루트
계약을 시작합니다. 공유 LSP 테스트는 추가로 작업 공간 폴더를 포함합니다.
전달, `file:` URI 처리, 루트 포함 감시 파일 무효화,
안정적인 진단 코드/범위 및 폐기. 편집자 클라이언트는 노출해야 합니다.
서버가 광고하는 기능만; 정의로 이동, 참조,
이름 바꾸기, 서식 지정, 코드 작업 및 파일 간 언어 가져오기는 그대로 유지됩니다.
지원되지 않습니다.

### 문제 해결

- **Node 런타임 거부됨:** `<configured-node> --version`을 실행하고
  관련 VS Code 또는 IntelliJ 설정에서 Node 24+ 실행 가능. 클라이언트
  감지된 버전을 보고하고 자동으로 이전 버전으로 돌아가지 않습니다.
  런타임.
- **VS Code 패키지 서버 누락:** 다음으로 재구축
  `pnpm exec turbo run build --filter=fws-vscode`, 확인
  `extensions/fws-vscode/server/dist/main.js`가 존재하거나 설정되었습니다.
  `forgeWebScript.serverPath`을 유효한 빌드 진입점으로 설정합니다. 검사
  **Forge Web Script Language Server** 추적이 활성화된 출력 채널.
- **IntelliJ 서버 명령을 찾을 수 없습니다:** 설치
  열린 프로젝트에서 `@mission-platform/forge-web-script-lsp`가 있는지 확인하세요.
  `node_modules/.bin`가 있거나 명시적 명령/경로를 구성하십시오. 는
  플러그인은 검색된 프로젝트 루트와 제안된 설치 경로를 보고합니다.
- **진단 또는 완료 없음:** 파일 이름이 `.fws`인지 확인하세요.
  클라이언트가 활성화되어 있고 작업공간에 프로젝트 루트가 있습니다. 클라이언트를 확인하세요
  추적/출력 채널을 확인하고 서버가 `file:` 작업 공간을 수신했는지 확인하세요.
  폴더; 루트가 없으면 이미 열려 있는 문서만 제공될 수 있습니다.
- **예기치 않은 편집기 기능:** 이러한 통합은 의도적으로
  파서 또는 의미론적 논리를 추가합니다. 기능과 안정적인 `FWS-*` 비교
  이 문서와 공유 LSP 패키지가 있는 진단 코드가 아닌
  편집기별 동작을 추가합니다.

클라이언트는 지원되는 경우 작업공간 폴더를 `file:` URI로 보내야 합니다. 는
서버는 먼저 작업공간 폴더를 사용하고 `rootUri`로 대체됩니다. 둘 다 아니라면
제공된 파일 시스템 호스트에는 루트가 없으며 이미 열려 있는 서비스만 제공할 수 있습니다.
문서.

## 작업 공간 동작 및 보안

Node 서버는 루트에서 파일 시스템 지원 작업 공간 호스트를 생성합니다.
LSP 초기화 요청. 해당 파일 아래에 있는 파일을 재귀적으로 열거합니다.
루트, 작업 공간 분석에 필요한 파일 읽기, 루트 포함 감시
파일 변경. 읽기 전에 경로가 표준화되고 심볼릭 링크가 확인됩니다.
구성된 모든 루트 외부의 액세스는 거부됩니다. 지원되지 않는 URI 체계
파일 시스템 경로로 처리되지 않습니다.

작업공간 ID는 URI 기반입니다. 기본 이름은 동일하지만 두 개의 문서
다른 URI는 별도의 문서와 캐시 항목으로 유지됩니다. 닫기
문서는 클라이언트에서 해당 진단을 제거합니다. 생성, 변경 또는
감시된 파일을 삭제하면 작업 공간에 따른 분석이 무효화되고 다시 게시됩니다.
열린 문서에 대한 진단.

서버는 프로젝트 구성 파일을 도입하지 않습니다. 표준 CLI
현재 호스트가 코드로 삽입되지 않는 한 빈 작업 공간 옵션을 제공합니다.
언어 서비스 작업 공간 계약은 다음과 같습니다.

```ts
interface ForgeWebScriptWorkspaceHost {
  readFile(uri: string): Promise<string | undefined>;
  listFiles(): Promise<readonly string[]>;
  getOptions(uri: string): Promise<ForgeWebScriptWorkspaceOptions>;
  watch?(listener: (change: ForgeWebScriptWorkspaceChange) => void): {
    dispose(): void;
  };
}

interface ForgeWebScriptWorkspaceOptions {
  requestedCapabilities?: readonly string[];
  requireExports?: boolean;
  capabilityNames?: readonly string[];
  capabilitySignatures?: ReadonlyMap<string, ForgeWebScriptCallable>;
}
```

`requestedCapabilities` 및 `requireExports`이 전달됩니다.
`validateForgeWebScript`. 에서 허용되지 않는 기능 가져오기
작업 공간은 안정적인 ABI 진단 `FWS-ABI-002`을 생성합니다. 수출관련
요구 사항은 해당 `FWS-ABI-003` 계약을 사용합니다. 기능 이름
서명도 완료 및 마우스 오버를 제공하지만 결코 추론되지 않습니다.
주변 Node 또는 브라우저 API.

### 에디터 수출 정책

편집기 분석은 기본적으로 모듈 전용 기능에 대해 허용됩니다. 언제
삽입된 작업공간인 표준 LSP 호스트에서는 `requireExports`이 생략되었습니다.
호스트 또는 Monaco 작업공간 호스트인 경우 `false`로 처리되므로 개인 도우미
생성하지 않고 동일한 모듈의 다른 함수에 의해 호출될 수 있습니다.
`FWS-ABI-003`. 동일한 모듈 기호에는 전용 기능을 계속 사용할 수 있습니다.
완료, 호버 및 호출/유형 해결은 Wasm ABI 내보내기가 아닙니다.

ABI 전용 진단을 원하는 호스트는 전역적으로 `requireExports: true`을 설정할 수 있습니다.
`optionsForUri`을 통한 문서의 경우; 해당 정책을 변경하고 새로 고침
작업 공간이 캐시된 분석을 무효화합니다. `requireExports: false` 설정은
명시적인 허용 정책. 이 편집기 기본값은 컴파일을 변경하지 않습니다.
`@mission-platform/forge-web-script`에는 계속해서 `export fn`가 필요합니다.
`requireExports` 옵션이 생략된 경우 컴파일러 ABI 함수입니다.

코어 또는 프로그래밍 방식으로 생성된 LSP 서버를 사용하는 경우 다음을 호출하세요.
`refreshWorkspace(uri)` 문서를 연 후 및 의존하기 전
작업 영역에서 파생된 진단, 완료 또는 마우스 오버. LSP 어댑터는 다음을 수행합니다.
진단을 게시하기 전과 완료를 제공하기 전에 이 새로 고침 또는
호버 요청.

## 진단 및 범위

진단은 유효성 검사기의 안정적인 `code`, 심각도, 단계, 메시지를 유지합니다.
파일 이름, 소스 범위 및 선택적 힌트입니다. LSP 표현은 다음을 사용합니다.
표준 0 기반 `Position` 및 반 개방형 `Range`; 문자 오프셋 수
진단 전에 유니코드가 나타나는 경우를 포함한 UTF-16 코드 단위.

LSP 서버는 `source: "forge-web-script"`을 게시합니다. 단계와 힌트는 다음과 같습니다.
진단 `data` 개체에도 포함됩니다. 일반적인 안정 코드 계열
다음과 같습니다:

| 코드 계열     | 단계         | 의미                                                                              |
| ------------- | ------------ | --------------------------------------------------------------------------------- |
| `FWS-LEX-*`   | `lex`        | 잘못된 문자/이스케이프, 원시 문자열 줄 종결자 또는 종료되지 않은 문자열/블록 주석 |
| `FWS-PARSE-*` | `parse`      | 잘못된 모듈, 선언, 문 또는 식 구문                                                |
| `FWS-TYPE-*`  | `type-check` | 잘못된 유형, 이름, 연산자, 인수 또는 반환                                         |
| `FWS-ABI-*`   | `abi`        | 중복된 이름, 거부된 기능, 내보내기 또는 가져오기                                  |

파서 복구가 허용되는 경우 잘못된 입력은 여전히 토큰화 및 분석됩니다.
그것. 예를 들어 잘못된 소스는 `FWS-PARSE-017`을 생성할 수 있지만
사용 가능한 어휘 토큰 및 부분 기호 정보. 클라이언트는 표시되어야 합니다
진단 텍스트와 일치하는 것이 아니라 제공된 범위와 코드입니다.

문자열 렉싱은 JSON 호환 이스케이프(`\\`, `\"`, `\/`, `\b`,
`\f`, `\n`, `\r`, `\t` 및 `\uXXXX`). 원시 줄 종결자, 유효하지 않은 이스케이프,
후행 백슬래시는 어휘 진단(`FWS-LEX-004` 또는
`FWS-LEX-005`). 렉서 및 진단 범위는 소스 길이로 제한됩니다.
클라이언트는 이를 UTF-16 LSP 범위로 직접 안전하게 변환할 수 있습니다.

## 모나코 어댑터 내장

브라우저 어댑터는 `@mission-platform/content`에 의해 내보내지고 다음 위치에 있습니다.
`packages/content/content/content/src/monaco/forge-web-script.ts`. `ForgeMonacoEditor` 로드
`language="fws"`일 때 어댑터가 게으르게; 모나코는 여전히 유형만 수입하고 있습니다.
동기 구성 요소 그래프이므로 서버 측 렌더링은 평가하지 않습니다.
모나코.

가장 간단한 구성 요소 사용법은 다음과 같습니다.

```tsx
<ForgeMonacoEditor
  language="fws"
  modelValue={'export fn add(value: i32) -> i32 {\n  return value + 1;\n}'}
/>
```

자동 통합을 비활성화하려면 `forgeWebScript={false}`을 설정하십시오. 그렇지 않으면,
구성 요소는 `fws` 언어 및 `.fws` 확장을 등록하고 Monaco의
테마에 대한 내장 토큰 범주(`keyword`, `type`, `string`, `comment`,
`number`, `operator`, `delimiter` 및 `invalid`)은 활성
모델을 만들고, 마커를 게시하고, 완성 및 호버 제공자를 등록합니다.

기능 인식 브라우저 도구의 경우 호스트 소유 작업 공간 개체를 제공합니다.

```tsx
const workspaceHost: ForgeWebScriptWorkspaceHost = {
  readFile: async (uri) => files.get(uri),
  listFiles: async () => [...files.keys()],
  getOptions: async () => ({
    requestedCapabilities: ['clock.now'],
    capabilityNames: ['clock.now'],
    capabilitySignatures: new Map([
      [
        'clock.now',
        {
          parameters: [],
          result: 'i64',
          documentation: 'Read the current Unix timestamp.',
        },
      ],
    ]),
  }),
};

<ForgeMonacoEditor
  language="fws"
  forgeWebScript={{ workspaceHost }}
  modelValue={'import capability "clock.now" as now() -> i64;\nexport fn current() -> i64 {\n  return now();\n}'}
/>;
```

호스트는 의도적으로 삽입됩니다. 브라우저 소비자는 읽기를 제공해야 합니다.
파일 열거, 프로젝트 옵션 및 선택적 변경 알림
자체 스토리지 또는 애플리케이션 상태. 어댑터는 Node을 가정하지 않습니다.
파일 시스템 API를 사용하며 stdio 서버에 연결하지 않습니다. 반품된 것을 폐기하세요.
모델 수신기를 제거하려면 어댑터 핸들(또는 `ForgeMonacoEditor` 마운트 해제)을 사용하세요.
공급자, 마커 및 서비스 캐시.

명령형 통합의 경우 Monaco가 가져온 직후에 동일한 어댑터를 사용하십시오.
로드되었습니다:

```ts
import { attachForgeWebScriptMonaco, registerForgeWebScriptLanguage } from '@mission-platform/content';

registerForgeWebScriptLanguage(monaco);
const handle = attachForgeWebScriptMonaco(editor, monaco, { workspaceHost });

await handle.refresh();
// On editor teardown:
handle.dispose();
```

`fws`이 이미 있을 때 `registerForgeWebScriptLanguage`을 호출해도 안전합니다.
등록되었습니다. 등록 핸들은 토큰 공급자를 삭제합니다. 어댑터
핸들은 완성/호버 제공자, 모델 리스너,
마커 및 자체 언어 서비스 인스턴스입니다.

## LSP와 브라우저 작업 공간

| 소비자              | 업무공간 구현                                   | 루트/보안 경계                                                    | 교통               |
| ------------------- | ----------------------------------------------- | ----------------------------------------------------------------- | ------------------ |
| Node LSP 클라이언트 | `RootBoundedForgeWebScriptWorkspaceHost`        | 정규화된 구성된 파일 시스템 루트 외부 읽기가 거부됩니다           | 스튜디오 LSP       |
| 모나코/브라우저     | 애플리케이션 제공 `ForgeWebScriptWorkspaceHost` | 호스트는 노출할 URI/파일/옵션을 결정합니다. 파일 시스템 가정 없음 | 프로세스 내 어댑터 |

Both adapters use the same language-service contracts and analysis semantics,
but they do not share a document store or transport. 브라우저 호스트는 다음을 수행해서는 안 됩니다.
pass Node filesystem functions into a browser bundle. 반대로 Node LSP는
server should be used for external clients rather than attempting to run its
모나코의 파일 시스템 호스트.

## 검증 및 적합성

언어 서비스 및 LSP 패키지에는 승인 및 거부에 대한 테스트가 포함되어 있습니다.
부트스트랩 고정 장치, 진단 코드 및 UTF-16 범위, 잘못된 입력,
워크스페이스 무효화, 루트 격리, LSP 동기화, 완료,
호버 및 폐기. 콘텐츠 패키지에는 어댑터, 강조 표시,
마커, 제공자, 폐기 및 SSR/비 Forge 편집자 범위.

저장소 루트에서 집중 검사를 실행합니다.

```sh
pnpm --filter @mission-platform/forge-web-script-language-service test
pnpm --filter @mission-platform/forge-web-script-language-service build:check
pnpm --filter @mission-platform/forge-web-script-language-service lint
pnpm --filter @mission-platform/forge-web-script-language-service format

pnpm --filter @mission-platform/forge-web-script-lsp test
pnpm --filter @mission-platform/forge-web-script-lsp build:check
pnpm --filter @mission-platform/forge-web-script-lsp lint
pnpm --filter @mission-platform/forge-web-script-lsp format

pnpm --filter @mission-platform/content exec vitest run \
  src/monaco/forge-web-script.spec.ts \
  src/components/organisms/forge-monaco-editor/forge-monaco-editor.spec.ts
pnpm --filter @mission-platform/content build:check
```

패키지 전체 콘텐츠 린트 및 형식 명령은 관련 없는 CSS/SCSS도 검사합니다.
파일; 기존 파일에 국한된 오류는 Forge 웹 스크립트가 아닙니다.
언어 도구 회귀. 권위 있는 언어 정착 기대
`../../../forge-web-script/src/fixtures/bootstrap.ts`에 남아 있고
[언어 참조](../../../../../forge-web-script/docs/locales/ko/reference/language.md).
