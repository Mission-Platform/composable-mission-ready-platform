# Forge 웹 스크립트 개발

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/compiler/forge/forge-web-script/docs/guides/development.md: [packages/compiler/forge/forge-web-script/docs/guides/development.md](../../../guides/development.md)
> 언어: 한국어 (ko)

이 가이드는 Forge 웹 스크립트 파서를 변경하는 기여자를 위한 것입니다.
계약 또는 적합성 정착물.

## 패키지 설치 및 확인

저장소 루트에서 종속성을 설치하고 패키지 검사를 실행합니다.

```bash
pnpm install
pnpm --filter @mission-platform/forge-web-script build:check
pnpm --filter @mission-platform/forge-web-script test
```

게시하기 전에 `pnpm --filter @mission-platform/forge-web-script build`을 실행하세요.
빌드는 `dist/` 아래에 브라우저 안전 번들 및 선언 파일을 내보냅니다.

## 언어 변경 추가

문법과 확인된 프런트엔드를 함께 업데이트합니다. 집중된 조명기를 추가하세요.
`src/fixtures/` 및 진단 또는 생성된 동작에 대한 회귀 테스트입니다.
변경 사항이 없으면 언어 버전 `1.0` 및 ABI 버전 `1.2`를 명시적으로 유지합니다.
의도적인 호환성 개정. ABI 변경사항은 매니페스트를 업데이트해야 합니다.
로더 및 호환성 문서.

패키지는 브라우저에서 안전합니다. Node 전용 API를 공용 Facade에 추가하지 마세요.
Node 관련 도구는 `@mission-platform/forge-web-script-cli`에 속합니다.

## 생성 및 소스 아티팩트

`src/self-hosted/fws/` 아래에 체크인된 `.fws` 소스는 소스 아티팩트입니다.
직접 복사한 JavaScript가 아닙니다. 생성된 출력을 `dist/`에 유지하고 커밋하지 않음
로컬 빌드 출력. 패키지 문서 참조는 옆에 유지됩니다.
패키지이며 문서 추출 워크플로에 의해 다시 생성됩니다.
