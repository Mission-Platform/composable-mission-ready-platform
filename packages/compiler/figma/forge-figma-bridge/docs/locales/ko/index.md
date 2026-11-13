# Forge Figma 저장소 브리지

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/compiler/figma/forge-figma-bridge/docs/index.md: [packages/compiler/figma/forge-figma-bridge/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

브릿지는 인증된 `POST /export`을 통해 검토된 `ForgeRepositoryExportRequest`을 수락하고 명시적으로 구성된 저장소 루트 중 하나에 번들을 씁니다. CLI의 `--root <id>=<absolute-path>` 옵션을 사용하여 루트를 구성합니다.

각 서버 프로세스는 새로운 인증 토큰을 생성합니다. CLI는 시작될 때 토큰을 인쇄합니다. 호출자는 이를 `Authorization: Bearer <token>`으로 보내고 기본 원본 `https://www.figma.com`를 보내야 합니다. `allowedOrigin` 서버 옵션을 사용하여 명시적으로 구성된 로컬 통합을 위해 원본을 변경할 수 있습니다. 다른 원본의 요청과 토큰이 없는 요청은 번들을 읽거나 쓰기 전에 거부됩니다.
