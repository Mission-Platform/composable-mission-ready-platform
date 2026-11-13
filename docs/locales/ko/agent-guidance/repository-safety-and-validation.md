# 저장소 안전 및 검증

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/agent-guidance/repository-safety-and-validation.md: [docs/agent-guidance/repository-safety-and-validation.md](../../../agent-guidance/repository-safety-and-validation.md)
> 언어: 한국어 (ko)

이 항목은 구현, 리팩터링, 테스트, 생성, 저장소 검사, 작업 트리, LSP, 보안 및 파일 관리 작업에 필수입니다. 이는 루트 `AGENTS.md`에 요약된 자세한 운영 제약 조건을 유지합니다.

## 종속성 방향 및 자산 검색

- `packages/`의 코드는 `apps/`에서 가져오면 안 됩니다. 애플리케이션은 재사용 가능한 패키지 멤버를 사용합니다. 도메인 패키지는 애플리케이션을 가져오지 않고도 하위 수준 `core`, `tooling` 및 컴파일러 계약에 따라 달라질 수 있습니다.
- 코드를 작성하기 전에 리포지토리 MCP 도구(`list_components`, `get_component_usage`, `lsp_find_symbol` 및 `lsp_list_symbols`)와 파일 시스템 검사를 사용하여 기존 자산을 검사합니다.
- 중복 UI 기본 요소를 생성하는 대신 `@mission-platform/components`을 재사용하고, 하드코딩된 시각적 값 대신 `--mp-*` 토큰을 참조하고, 공유 유틸리티에 대해 `packages/`을 검색하고, 사용자 대상 문자열에 대해 `@mission-platform/i18n`과 함께 YAML 카탈로그를 사용합니다.
- 새로운 공유 UI 구성요소, 컴포저블, 유틸리티 및 디자인 토큰은 `packages/`에 속합니다. 공유 린트, 형식 및 빌드 도구는 `packages/tooling/configs/`에 속합니다.
- 패키지 구성 요소를 수정할 때 함께 배치된 `.stories.tsx` 스토리를 추가하거나 업데이트합니다. `apps/storybook` 워크벤치는 Vue, React, Solid, Svelte 및 웹 구성 요소 전체에서 패키지 스토리를 검색합니다.

## 보안 코딩 및 규정 준수

모든 코드와 구성은 ISO/IEC 27001:2022 Control A.8.28을 따르고 OWASP Top 10(2025) 및 CWE Top 25로부터 보호해야 합니다.

- 자격 증명, 개인 키, 클라우드 토큰 또는 기타 비밀을 커밋하지 마세요.
- `DOMPurify.sanitize`으로 HTML을 삭제하고, 쿼리를 매개변수화하고, 보간된 쉘 문자열 대신 `execFile`과 같은 벡터 인수를 사용합니다.
- SHA-256 및 `crypto.getRandomValues`와 같은 최신 암호화를 사용합니다. 보안에 민감한 값에는 `Math.random()`을 사용하지 마십시오.
- 카탈로그 참조를 통해 검증되지 않은 `postinstall` 수명 주기 스크립트 및 핀 종속성을 방지합니다.
- 최소 권한, 저장소 루트 및 경로 경계, 셸 없는 실행, 명시적 쓰기 승인 및 보안 도구 경계를 유지합니다.
- PR을 제안하기 전에 해당하는 경우 `security_scan_secrets`, `security_analyze_code`, `security_audit_dependencies`, `security_audit_supply_chain`, `security_collect_compliance_evidence` 및 `security_audit_compliance`과 같은 관련 개발자-MCP 보안 검사를 실행합니다.

## 작업 트리 및 빌드 종속성

- 병렬 작업 스트림은 `node --experimental-strip-types scripts/worktree-manager.ts create <branch>`으로 프로비저닝된 격리된 Git 작업 트리를 사용해야 합니다.
- 내부 `dist/` 아티팩트가 누락될 수 있으므로 새로운 작업 트리에서 패키지 테스트 또는 유형 확인 전에 업스트림 작업공간 종속성을 빌드하십시오.

  ```bash
  pnpm exec turbo run build --filter <package-name>^...
  ```

- 작업 트리는 `.turbo/cache`을 공유합니다. 해당 캐시를 지우거나 우회하지 마십시오.

## 휴대용 LSP 구성

- `agent-lsp.json`의 LSP 정의는 `["pnpm", "exec", "<server>", "--stdio"]` 또는 `["pnpm", "--dir", "relative/path", ...]`와 같은 이식 가능한 상대 호출을 사용해야 합니다.
- 절대 시스템 경로를 하드코딩하지 마세요. MCP LSP 서버는 감지된 저장소 또는 작업 트리 루트에서 언어 서버를 실행합니다.
- LSP 쿼리 및 실행 도구에는 활성 세션이 필요합니다. `lsp_status`을 확인하고 필요한 경우 `lsp_start`를 사용하세요.
- TypeScript 7 기본 서버는 `tsc --lsp --stdio`(`typescript-go` 7.0.2)를 사용합니다. 전체 작업 공간 기호 및 마우스 오버 쿼리는 인덱싱 중에 시간 초과될 수 있습니다. 15,000~30,000ms 프로토콜 시간 초과를 사용하고 패키지 범위 유형 확인 및 Vitest로 이를 보완합니다.
- 시작 또는 검색 시간이 초과되면 작업을 차단하는 대신 패키지 범위 유형 검사 및 Vitest를 진단 대체 수단으로 사용합니다.

## 플린트 및 스캐너 검증

- Flint LSP 진단은 소스 수준 피드백 전용입니다. 연결된 다중 모듈 그래프가 유효한 Wasm을 생성하는지 또는 해당 런타임 ABI가 올바르게 실행되는지 증명하지 않습니다.
- 스캐너 그래프 변경의 경우 포커스 그래프 제품군, 패키지 `type-check` 및 패키지 Vitest 제품군을 실행합니다. 소스 진단과 별도로 아티팩트 방출 실패를 기록합니다.
- 설비 또는 감소된 디코더 경로는 전체 ZXing 패리티를 설정하지 않습니다. 지원되지 않는 모드, 형식 하위 집합, 메타데이터, 재시도 및 공개 계약 마이그레이션을 계획 및 끌어오기 요청에 명시적으로 표시합니다.
- 정적 연결이 실패하는 경우 알고리즘 코드를 변경하거나 테스트를 약화시키기 전에 그래프 모듈 및 에지 카운트, 이미터 진단 및 가장 작은 격리된 재생기를 캡처합니다.

## 코드 스타일 및 검증

- 새 소스 파일은 `.ts` 또는 `.vue`과 `<script setup lang="ts">`를 사용합니다. 공개 API 및 내보낸 함수에는 명시적 유형이 필요합니다.
- 외부 프로토콜에서 `null`를 요구하지 않는 한 값이 없거나 지워진 경우 `undefined`을 사용합니다.
- Forge JSX 이벤트 소품은 `onKeyDown`, `onPointerDown` 및 `onMouseDown`과 같은 표준 camelCase 이름을 사용합니다.
- 그룹 내 빈 줄 없이 Node 내장, 외부 종속성, 내부 `@mission-platform/*` 패키지 및 관련 파일 순서로 그룹을 가져옵니다. 하나의 빈 줄로 그룹을 구분하세요.
- `pnpm --filter <pkg> run lint` 및 `pnpm --filter <pkg> run lint:style`을 실행합니다. 해당 스타일 오류에 대해서만 ESLint 수정 패키지를 사용하세요. 마크다운과 스토리는 저장소 형식 지정 워크플로를 사용합니다.
- 컴파일러, 트랜스파일러, AST 및 코드 생성 변경에는 엔드투엔드 통합 범위가 필요합니다. 동일한 기본 이름, 명확한 항목 다시 내보내기 및 보존된 방출 콘텐츠에 대해 충돌하지 않는 출력을 확인합니다.
- `TargetIntentions.lowered`은 `@mission-platform/forge-plugin-api`에서 필수입니다. 대상 플러그인에는 낮은 계획이 필요합니다. 설비, 모형 및 CMS 통합 플러그인은 `{ framework, appliedOptimizations: [] }`을 제공하거나 `lower -> optimize -> generate`를 실행해야 합니다.
- 병렬 로드 시 다중 프레임워크, 문서 추출 및 대규모 AST 테스트에서는 명시적인 `60_000`–`120_000`ms 시간 초과를 사용해야 합니다.
- 교차 계획 작업의 경우 엔드 투 엔드 동작, 부정적인 테스트 및 패키지 범위 린트 게이트에 초점을 맞춘 독립적인 검토를 사용합니다.

## 상호작용 모드

첫 번째 적용 가능한 모드를 사용하고 지속성 규칙이 전환을 허용하지 않는 한 세션 동안 이를 유지합니다.

1. `[CHAT]`은 인사말, 잡담, 사실에 관한 질문 또는 간단한 수학을 위한 것입니다.
2. 읽기 전용 설명, 분석, 정보 검색 또는 제안을 위한 `[ADVANCED_CHAT]`.
3. 짧은 안전 명령, 앱 실행 또는 편집 없이 테스트를 위한 `[RUN_VERIFY]`.
4. 추가 컨텍스트 수집이 필요하지 않은 사소한 단일 파일 변경의 경우 `[FAST_CODE]`입니다.
5. 빌드, 설치, 인프라, 환경 수정 또는 시스템 검사를 위한 `[SETUP]`.
6. 조사 또는 여러 단계가 필요한 중요하지 않은 프로젝트 변경을 위한 `[CODE]`.
7. `[NICHE]`은 다른 모드에 맞지 않는 특수 포렌식, 리버스 엔지니어링, 데이터 복구 또는 보안 연구에만 사용됩니다.

`[CHAT]` 및 `[CODE]`은 모드를 전환하지 않습니다. `[ADVANCED_CHAT]`는 명시적인 구현 요청 후에만 `[CODE]`으로 전환됩니다. `[FAST_CODE]` 및 `[RUN_VERIFY]`는 3단계 내에 완료할 수 없는 경우 `[CODE]`으로 전환됩니다. `[SETUP]` 및 `[NICHE]`는 구현이 필요할 때 `[CODE]`으로 전환될 수 있습니다.

## 원자 생성 및 파일 관리

- 생성이 성공하기 전에 생성 대상을 지우거나 삭제하지 마십시오. `.forge-attempt/`과 같은 형제 시도 디렉터리에 아티팩트를 준비하고 커밋 전 진단을 실행하며 검사를 통과한 후에만 원자적으로 교체합니다.
- `.gitkeep` 및 `.gitignore`와 같은 리포지토리 도트 파일을 보존하고 빌드 대상을 동기화하거나 정리할 때 진행 중인 스테이징 디렉터리를 보존합니다.
- 돌연변이를 명시적이고 제한적으로 유지하세요. 광범위한 정리 명령을 사용하거나 현재 작업을 위해 생성되지 않은 파일을 삭제하지 마십시오.

## 개발자 MCP LSP 워크플로 계약

코드 작업에 대한 수동 텍스트 검색보다 개발자 MCP의 제한된 `lsp_*` 코드 인텔리전스 도구를 선호합니다. `lsp_capabilities`을 사용하여 현재 계약 및 가용성을 확인하세요. 편집하기 전에는 읽기 전용 `lsp_review_structure` 또는 `lsp_debug_context`을 사용하고, LSP 편집을 적용하기 전에는 `lsp_preview_edit`를 사용하고, 변경 후에는 `lsp_get_diagnostics`를 사용한 다음 적용 가능한 경우 `lsp_run_build` 및 `lsp_run_tests`을 사용합니다.

구조용 `lsp_list_symbols`, 기호용 `lsp_find_symbol`, 사용법용 `lsp_find_references`, 이해용 `lsp_inspect_symbol`, 호출 사이트용 `lsp_find_callers`, 함수 교체용 `lsp_replace_symbol_body`, 사용되지 않는 기호용 `lsp_safe_delete_symbol`와 같이 특별히 제작된 매핑을 사용합니다. 아키텍처, 영향, 리팩토링, 안전한 편집, 테스트 상관관계 및 전체 검증을 위해 문서화된 `/lsp-*` 워크플로를 사용하세요.

관련 정책: [품질 기준표](quality-rubric.md), [세션 자체 검토](session-self-review.md) 및 루트 [AGENTS.md](../../../../AGENTS.md).
