# 문제 해결 가이드

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> 영어 원문: [docs/troubleshooting.md](../../troubleshooting.md)
> 언어: 한국어 (ko)

이 가이드는 미션 내에서 개발, 빌드 및 배포 중에 발생하는 일반적인 문제에 대한 솔루션을 제공합니다.
플랫폼 모노레포. 기술적인 문제를 진단하고 해결하기 위한 **How-to 가이드** 형식으로 구성되어 있습니다.

## 성능 문제

### 느린 LCP(콘텐츠가 포함된 최대 페인트)

**문제**: LCP가 "양호" 등급에 대한 임계값인 2.5초를 초과합니다.

**진단**:

1. Chrome DevTools에서 Lighthouse 감사를 실행하세요.
2. "성능" 패널에서 LCP 요소를 식별합니다.
3. "네트워크" 탭에서 리소스 로드 지연을 확인하세요.

**해결책**:

- **인라인 필수 CSS**: 스크롤 없이 볼 수 있는 콘텐츠에 필요한 스타일이 인라인되었는지 확인하세요.
- **이미지 최적화**: WebP/AVIF 형식을 사용하여 제공 `srcset` 반응형 이미지를 위한 것입니다.
- **리소스 사전 로딩**: 사용 `<link rel="preload">` LCP 이미지 또는 중요한 글꼴의 경우.
- **메인 스레드 작업 최소화**: 다음을 사용하여 필수적이지 않은 JavaScript를 연기합니다. `async` 또는 `defer`.

### 메모리 누수

**문제**: 애플리케이션은 시간이 지남에 따라 점점 더 많은 양의 메모리를 소비하며 결국 충돌이 발생합니다.

**진단**:

1. Chrome DevTools 메모리 탭에서 여러 개의 "힙 스냅샷"을 만듭니다.
2. 스냅샷을 비교하여 수나 크기가 증가하는 개체를 식별합니다.
3. "분리된 DOM 요소"를 찾으세요.

**해결책**:

- **컴포저블 정리**: 항상 타이머를 지우고 이벤트 리스너를 삭제합니다. `onUnmounted`.
- **스토어 관리**: 더 이상 필요하지 않을 때 Pinia 또는 다른 스토어의 반응 상태가 지워지는지 확인하세요.
- **Observable 삭제**: RxJS를 사용하는 경우 모든 구독이 구독 취소되었는지 확인하세요.

## 빌드 및 작업공간 문제

### Turborepo 캐싱 오류

**문제**: 변경 사항이 빌드에 반영되지 않거나 오래된 아티팩트로 인해 빌드가 실패합니다.

**해결책**: 캐시를 우회하거나 수동으로 삭제하여 새로운 빌드를 강제 실행합니다.

```bash
# Force a build without cache
pnpm build:force

# Manually clear the turbo cache
rm -rf .turbo
```

### 모듈을 찾을 수 없음/작업 공간 해결

**문제**: TypeScript 또는 Vite 작업공간에 정의된 패키지를 찾을 수 없습니다.

**해결책**:

1. 패키지가 소비 작업 영역에 나열되어 있는지 확인합니다. `package.json`.
2. 버전이 일치하는지 확인하십시오(`workspace:*` 권장됩니다).
3. 실행 `pnpm install` 심볼릭 링크를 새로 고칩니다.
4. 문제가 지속되면 철저하게 청소해 보십시오.
```bash
   pnpm -r exec rm -rf node_modules
   pnpm install
   ```

### CI에는 오류가 있지만 로컬에는 오류가 없습니다.

**문제**: CI에서 빌드가 실패합니다. TypeScript IDE에 표시되지 않는 오류.

**해결책**: 전체 작업공간에서 로컬로 유형 검사기를 실행하십시오.

```bash
pnpm exec turbo run build:check
```

이렇게 하면 모든 패키지 경계가 올바르게 존중되고 유형이 깔끔하게 검증됩니다.

## MCP 서버 문제 해결

### 연결 실패

**문제**: AI 클라이언트 또는 IDE가 Mission Platform MCP 서버에 연결할 수 없습니다.

**진단**:

1. MCP 서버가 구축되었는지 확인합니다. `pnpm exec turbo run build --filter @mission-platform/mcp-*`.
2. 서버가 수동으로 시작되는지 확인합니다. `node mcp/developer/dist/index.js`.

**해결책**:

- 절대 경로를 사용하고 있는지 확인하십시오. node 클라이언트 구성의 바이너리 및 스크립트.
- MCP 서버 로그에서 특정 오류 메시지(예: 환경 변수 누락)를 확인하세요.

## 일반적인 오류 패턴

### "정의되지 않은 속성을 읽을 수 없습니다."

**원인**: 종종 데이터 로드가 완료되기 전에 null 또는 정의되지 않은 개체의 속성에 액세스합니다. **수정**: 사용
선택적 체인(`?.`) 또는 기본값을 제공하십시오.

```typescript
// Instead of:
const name = user.profile.name;

// Use:
const name = user?.profile?.name ?? 'Guest';
```

### "처리되지 않은 약속 거부"

**원인**: 비동기 함수에서 포착되지 않은 오류가 발생했습니다. **수정**: 항상 비동기 호출을 래핑합니다. `try/catch` 블록.

```typescript
try {
  await fetchData();
} catch (error) {
  handleError(error);
}
```

## 관련 자료

- [모범 사례](best-practices.md)
- [개발 설정](development-setup.md)
- [테스트 가이드](testing.md)
