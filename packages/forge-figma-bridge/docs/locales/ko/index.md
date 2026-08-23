# Forge Figma 저장소 브리지

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/forge-figma-bridge/docs/index.md: [packages/forge-figma-bridge/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

브리지는 `POST /export`을 통해 검토된 `ForgeRepositoryExportRequest`을 수락하고 명시적으로 구성된 저장소 루트 중 하나에 번들을 씁니다. CLI의 `--root <id>=<absolute-path>` 옵션을 사용하여 루트를 구성합니다.
