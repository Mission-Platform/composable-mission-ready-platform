# @mission-platform/api-proxy

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> workers/api-proxy/docs/index.md: [workers/api-proxy/docs/index.md](../../index.md)
> 언어: 한국어 (ko)

승인된 읽기 전용 API 경로를 프록시로 프록시하는 Cloudflare 작업자의 예
고정된 업스트림 서비스. 이 작업공간은 요청 정책, 헤더를 소유합니다.
프록시 핸들러에 대한 삭제 및 오류 경계.

## 작업자를 사용하세요

패키지는 `@mission-platform/api-proxy`에서 번들 처리기를 내보냅니다.
Wrangler 구성에서 `dist/index.js`을 참조하기 전에 빌드하십시오.

```bash
pnpm --filter @mission-platform/api-proxy build
```

`/users` 및 `/v1`에 대한 `GET` 및 `HEAD` 요청만 허용됩니다. 쿼리
문자열이 전달됩니다. 자격 증명, 원본 `Host` 및 홉별
헤더가 제거됩니다. 업스트림 또는 요청 구성 실패는 `502`를 반환합니다.

## 제한 사항

패키지에 체크인된 Wrangler 배포 구성이 없으며 패키지가 아닙니다.
범용 역방향 프록시. 명시적 배포 구성을 추가하고
공개하기 전에 인증, 업스트림 및 캐싱 변경 사항을 검토하세요.

- [개발 가이드](guides/development.md)
- [`README.md`](../../../README.md)
