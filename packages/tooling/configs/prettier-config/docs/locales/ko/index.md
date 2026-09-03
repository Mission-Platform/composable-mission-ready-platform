# @mission-platform/prettier-config

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/tooling/configs/prettier-config/docs/index.md: [packages/tooling/configs/prettier-config/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

패키지와 애플리케이션이 공유하는 저장소 형식 기본값입니다.

## 설치 및 사용

```bash
pnpm add --save-dev @mission-platform/prettier-config
```

작업공간에서 공유 구성을 내보냅니다. `prettier.config.js`.
Markdown이 가능하도록 로컬 재정의를 자제해서 사용하세요. TypeScript, Vue및 구성
파일은 모노레포 전체에서 일관성을 유지합니다.

## 기여하다

달리다 `pnpm --filter @mission-platform/prettier-config format` 변경한 후
구성. 변경 사항은 다음을 사용하는 모든 작업 공간에 일관되게 적용되어야 합니다.
패키지.
