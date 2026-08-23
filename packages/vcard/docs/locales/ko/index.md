# `@mission-platform/vcard`

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/vcard/docs/index.md: [packages/vcard/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

Mission Platform용 공유 RFC 6350 vCard 및 RFC 5545 iCalendar 데이터 API입니다.

패키지는 다음을 통해 무손실 구성 요소/속성 구문 분석 및 쓰기를 제공합니다.
`readICalendar`/`writeICalendar` 및 `readVCard`/`writeVCard`, Forge
`ForgeVCard` 및 `ForgeICalendar`라는 렌더러. `ForgeICalendar`은 다음을 수락합니다.
`calendarEvents(readICalendar(source))`의 정규화된 결과가 생성되었습니다.
프레임워크 구성 요소는 파서 런타임 모듈과 독립적으로 유지됩니다.

공개 API 및 사용 예는 `llms.txt`을 참조하세요.
