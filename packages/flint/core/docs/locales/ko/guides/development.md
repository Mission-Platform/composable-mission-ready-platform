# 플린트 개발

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/flint/core/docs/guides/development.md: [packages/flint/core/docs/guides/development.md](../../../guides/development.md)
> 언어: 한국어 (ko)

이 가이드는 Flint 파서를 변경하는 기여자를 위한 것입니다.
계약 또는 적합성 정착물.

## 패키지 설치 및 확인

저장소 루트에서 종속성을 설치하고 패키지 검사를 실행합니다.

```bash
pnpm install
pnpm --filter @mission-platform/flint build:check
pnpm --filter @mission-platform/flint test
```

게시하기 전에 `pnpm --filter @mission-platform/flint build`을 실행하세요.
빌드는 `dist/` 아래에 브라우저 안전 번들 및 선언 파일을 내보냅니다.

## 언어 변경 추가

문법과 확인된 프런트엔드를 함께 업데이트합니다. 집중된 조명기를 추가하세요.
`src/fixtures/` 및 진단 또는 생성된 동작에 대한 회귀 테스트입니다.
변경 사항이 없으면 언어 버전 `1.0` 및 ABI 버전 `1.2`를 명시적으로 유지합니다.
의도적인 호환성 개정. ABI 변경사항은 매니페스트를 업데이트해야 합니다.
로더 및 호환성 문서.

패키지는 브라우저에서 안전합니다. Node 전용 API를 공용 Facade에 추가하지 마세요.
Node 관련 도구는 `@mission-platform/flint-cli`에 속합니다.

## 생성 및 소스 아티팩트

`src/self-hosted/fws/` 아래에 체크인된 `.flint` 소스는 소스 아티팩트입니다.
직접 복사한 JavaScript가 아닙니다. 생성된 출력을 `dist/`에 유지하고 커밋하지 않음
로컬 빌드 출력. 패키지 문서 참조는 옆에 유지됩니다.
패키지이며 문서 추출 워크플로에 의해 다시 생성됩니다.

## 2단계 파이프라인 검사

정식 프런트엔드 경계는 결정적 Sea-of-Nodes 그래프입니다. 는
두 번째 최적화 프로그램이 적용되는 Wasm IR로 낮추기 전에 그래프가 최적화됩니다.
백엔드 안전 전파, 데드 코드 제거, 주소 단순화, 스위치
낮추고 결정적인 레이아웃을 사용합니다. 두 단계 모두 감사 가능하게 유지: 최적화 도구
보고서 및 선택한 경계 정책은 컴파일러 아티팩트에 유지되어야 합니다.

증명 생성 규칙이 모든 것을 설정하지 않는 한 런타임 경계 검사를 사용하십시오.
안전하게 접근하세요. `proven-safe` 및 `excluded-by-profile`은 명시적 정책입니다.
암시적 해제 동작이 아닌 값입니다. `.sonir.json` 캐시 아티팩트는 다음과 같습니다.
진단 데이터만; 독자는 스키마, 해시, 정책 및
표시하기 전에 제한이 있으며, 그래프 내용을 절대 실행해서는 안 됩니다.

CLI 연기 검사의 경우:

```bash
flint check src/example.flint --bounds-checks runtime --optimizer-report --format json
flint inspect-sonir .cache/example.sonir.json --format json
```

분석 변경 시 팩트 추가 및 안정적인 진단 테스트를 거쳐 변경
최적화 규칙. 개발 분석에서는 알 수 없는 범위가 노출되어야 합니다.
별칭/수명 상태, 스위치 적용 범위 및 메타데이터 전달 엄격한 분석이 필요하다
안전하지 않은 경계 정책 요청 및 지역/소유권 위반을 차단합니다.
