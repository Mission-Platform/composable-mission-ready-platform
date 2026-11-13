# 세션 자체 검토

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/agent-guidance/session-self-review.md: [docs/agent-guidance/session-self-review.md](../../../agent-guidance/session-self-review.md)
> 언어: 한국어 (ko)

구현 전 작업의 성공, 실패 또는 중지 여부에 관계없이 모든 세션이 끝날 때마다 이 검토를 완료하세요. 검토는 종료 기록이며 현재 작업을 확장하는 권한이 아닙니다.

## 결과 검토

다음에 대한 간결한 증거를 기록하십시오.

- 어떤 시도를 했고, 어떤 결과를 요구했는지.
- 예상되는 행동과 관찰된 행동.
- 확인, 반증 또는 불확실한 가정.
- 실패, 차단된 작업, 회귀 및 해결되지 않은 위험.
- 명령, 테스트, 진단, 스캔, 검토 및 결과를 포함하여 수행된 검증입니다.
- 최종 차이점이 집중되어 있고 이식 가능하며 임시 아티팩트가 없고 저장소 규칙과 일치하는지 여부.
- 어떤 지침이 작업을 가능하게 했는지, 어떤 지침이 모호하고, 찾기 어렵거나, 중복되거나, 오래되었거나, 불필요하게 비용이 많이 드는지.

효과가 있었던 규칙을 유지하세요. 관찰된 문제를 가설이나 추측에 따른 개선 아이디어와 구별하고 제안된 각 변경 사항을 뒷받침하는 증거를 포함합니다.

## MCP 검토

MCP 도구 또는 프로필을 사용한 경우 다음 질문에 대답하십시오.

- 선택한 프로필이 작업을 완료할 수 있는 최소한의 프로필이었나?
- 명시적 쓰기가 필요할 때까지 제한된 읽기 전용 검사 도구가 선호되었습니까?
- `review_changes` 및 사용 가능한 보안 검사가 제안된 돌연변이와 그 위험을 검사하기에 충분했습니까?
- 스키마, 출력 경계, 페이지 매김 제한, 시간 초과 또는 도구 인체 공학이 마찰을 일으키거나 유용한 증거를 숨겼습니까?
- 더 명확한 확인, 더 좁은 범위, 더 강력한 격리 또는 더 안전한 대체가 필요한 쓰기 경로가 있었나요?
- 용어 및 동작이 `mcp/README.md`, `mcp/developer/README.md`, `.ai/mcp/mcp.json`, `scripts/launch-mcp.mjs`, `mcp/developer/src/tools/profiles.ts` 및 `mcp/developer/src/tools/index.ts`과 일치합니까?

단지 편리하다는 이유만으로 더 넓은 프로필이나 새로운 도구를 제안하지 마십시오. 관찰된 안전성, 신뢰성 또는 이해력 문제를 제거할 수 있는 가장 작은 변화를 설명하십시오.

## 개선 결정

각 개선 기회를 분류하십시오.

- **문서화 후속 조치:** 저장소 동작은 올바르지만 지침이 누락되었거나, 불명확하거나, 중복되었거나, 오래되었거나, 찾기 어려운 경우에 사용합니다. `AGENTS.md` 또는 소유 주제 문서에 대한 최소 업데이트를 제안합니다.
- **별도 승인된 구현:** 결과에 MCP 런타임 동작, 프로필, 스키마, 서버 등록, `.ai/mcp/mcp.json`, 도구 또는 다른 구현을 변경해야 하는 경우 사용합니다. 후속 조치로 기록하십시오. 명시적으로 승인되지 않는 한 문서 검토의 일부로 구현하지 마십시오.
- **변경 없음:** 관찰이 추측에 불과하거나 증거가 부족하거나 기존 규칙이 가장 안전하고 명확한 선택일 때 사용합니다.

모든 후속 조치에서는 종속성 방향, 명시적인 변형 경계, 이식성, 이전 버전과의 호환성, 최소 권한 및 제한된 작업을 보존해야 합니다. 증거를 연결하고 소유자, 영향을 받은 진실의 소스, 가장 작은 안전한 다음 조치를 식별합니다.

## 폐점 형식

서면 검토가 필요한 경우 최종 전달 시 다음과 같은 간단한 형식을 사용하십시오.

```markdown
### Session self-review
- Outcome: <expected and observed result>
- Evidence: <checks performed and results>
- Assumptions or uncertainty: <confirmed, disproved, or unresolved items>
- Guidance and MCP findings: <what helped or caused friction>
- Follow-up: <documentation, separately authorized implementation, or no change; include evidence>
```

관련 정책: [품질 기준표](quality-rubric.md), [리포지토리 안전성 및 유효성 검사](repository-safety-and-validation.md) 및 루트 [AGENTS.md](../../../../AGENTS.md).
