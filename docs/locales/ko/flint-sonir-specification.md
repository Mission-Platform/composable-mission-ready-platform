# Sea-of-Nodes 중간 표현(SonIR 2.0) 사양

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> docs/flint-sonir-specification.md: [docs/flint-sonir-specification.md](../../flint-sonir-specification.md)
> 언어: 한국어 (ko)

**사양 버전:** 2.0.0 (타겟 아키텍처 제안)
**컴파일러 기준:** `@mission-platform/flint`의 SonIR 1.0(`FLINT_SON_SCHEMA_VERSION = '1.0'`)
**마일스톤 목표:** 2차 웨이브/문제 #45(공식 Sea-of-Nodes 스키마, 메모리 SSA, GVN 및 SCCP)
**상태:** 아키텍처 제안 및 대상 스키마 사양
**컴파일러:** `@mission-platform/flint`

---

## 1. 아키텍처 원리

SonIR 2.0은 Cliff Click의 Sea-of-Nodes 계산을 기반으로 데이터 흐름, 제어 흐름 및 메모리 효과 그래프를 단일 그래프 표현으로 통합하는 Sea-of-Nodes 중간 표현입니다.

### 1.1 불변성

- **명시적 삼중 포트 모델:** 모든 node은 해당 포트를 다음과 같이 명시적으로 분리합니다.
  1. **제어 포트:** 실행 순서, 지역 수렴, 루프 헤더 및 분기 결정.
  2. **메모리/효과 포트(Memory SSA):** 메모리 종속성, 로드, 저장, 할당 및 장벽을 나타내는 상태 토큰입니다.
  3. **값 포트:** 순수 값, 입력된 산술, 논리 연산 및 참조.
- **결정적 최적화:** 패스는 GVN(Global Value Numbering)을 통해 결정적이며 멱등적으로 해시 처리됩니다.
- **그래프 불변성:** 변환은 메모리 안전성, 아핀 소유권 의미 체계 및 명시적 기능 경계를 보존합니다.

### 1.2 기본 구현 및 SonIR 2.0 전환 계획

활성 컴파일러(`@mission-platform/flint`)는 현재 SonIR 1.0(`FLINT_SON_SCHEMA_VERSION = '1.0'`):

- **SonIR 1.0 기준:** 제어 영역으로 분할된 통합 데이터 흐름/제어 노드를 구현합니다(`function`, `block`, `branch`, `loop`, `switch`), 와 함께 node-레벨 효과 태그(`pure`, `read`, `write`, `call`, `control`, `allocation`, `unknown`) 및 별칭 사실(`none`, `local`, `borrowed`, `mutable`, `unknown`). 메모리는 다음에서 관리됩니다. `region-arc-checked-linear` 모델.
- **SonIR 2.0 타겟 진화(문제 #45, 2차):**
  - 암시적 지역 멤버십을 대체하는 명시적 삼중 포트 에지 라우팅.
  - 직렬화, 검사 및 검증을 위한 공식 초안 2020-12 JSON 스키마.
  - 중복 로드 제거(RLE) 및 저장소 전달을 활성화하는 메모리 SSA 토큰입니다.
  - 공식 GVN 및 SCCP(Sparse Conditional Constant Propagation)가 통과되었습니다.
  - 다중 메모리 분리 지원(`multi-memory-segregated`) 웨이브 4의 경우.

---

## 2. 형식 스키마 및 Node 구조

### 2.1 Node 계층 구조 및 포트 분류

```
       ┌────────────────────────────────────────────────────────┐
       │                   SonIR 2.0 Node                       │
       ├────────────────────────────────────────────────────────┤
       │ Control Inputs  [ C_in_0, C_in_1, ... ]               │
       │ Memory Inputs   [ M_in_0, M_in_1, ... ] (Memory SSA)   │
       │ Value Inputs    [ V_in_0, V_in_1, ... ]                │
       ├────────────────────────────────────────────────────────┤
       │ Node ID: u32                                           │
       │ OpCode:  FlintSoNOpCode                                │
       │ Type:    FlintTypeDescriptor                           │
       │ Alias:   'none' | 'local' | 'borrowed' | 'mutable'     │
       │ Purity:  'pure' | 'read' | 'write' | 'barrier'         │
       ├────────────────────────────────────────────────────────┤
       │ Control Outputs [ C_out_0, ... ]                       │
       │ Memory Outputs  [ M_out_0, ... ]                       │
       │ Value Outputs   [ V_out_0, ... ]                       │
       └────────────────────────────────────────────────────────┘
```

### 2.2 형식적인 JSON 스키마 정의(Target v2.0)

컴파일러에 의해 직렬화된 SonIR 2.0 모듈 아티팩트에 대한 대상 JSON 스키마:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "FlintSonIrModuleV2",
  "type": "object",
  "required": [
    "schemaVersion",
    "abiVersion",
    "compilerVersion",
    "graphHash",
    "functions",
    "nodes"
  ],
  "properties": {
    "schemaVersion": { "type": "string", "const": "2.0.0" },
    "abiVersion": { "type": "string" },
    "compilerVersion": { "type": "string" },
    "sourceHash": { "type": "string" },
    "graphHash": { "type": "string" },
    "optimization": { "type": "string", "enum": ["debug", "release"] },
    "boundsChecks": {
      "type": "string",
      "enum": ["runtime", "proven-safe", "excluded-by-profile"]
    },
    "memoryModel": {
      "type": "string",
      "enum": ["region-arc-checked-linear", "multi-memory-segregated"]
    },
    "functions": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "entryNodeId", "exitNodeId", "exported"],
        "properties": {
          "id": { "type": "integer" },
          "name": { "type": "string" },
          "entryNodeId": { "type": "integer" },
          "exitNodeId": { "type": "integer" },
          "exported": { "type": "boolean" },
          "paramTypes": { "type": "array", "items": { "type": "string" } },
          "returnType": { "type": "string" }
        }
      }
    },
    "nodes": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "op", "functionId"],
        "properties": {
          "id": { "type": "integer" },
          "functionId": { "type": "integer" },
          "op": { "type": "string" },
          "type": { "type": "string" },
          "value": { "type": ["boolean", "number", "string", "null"] },
          "controlInputs": { "type": "array", "items": { "type": "integer" } },
          "memoryInputs": { "type": "array", "items": { "type": "integer" } },
          "valueInputs": { "type": "array", "items": { "type": "integer" } },
          "effects": { "type": "array", "items": { "type": "string" } },
          "alias": {
            "type": "string",
            "enum": ["none", "local", "borrowed", "mutable", "unknown"]
          },
          "span": {
            "type": "object",
            "required": ["start", "end", "line", "column"],
            "properties": {
              "start": { "type": "integer" },
              "end": { "type": "integer" },
              "line": { "type": "integer" },
              "column": { "type": "integer" }
            }
          }
        }
      }
    }
  }
}
```

---

## 3. Node 운영 및 카테고리

### 3.1 제어 노드

- **`Start`**: 초기 제어 및 메모리 토큰을 제공하는 함수 진입점입니다.
- **`Region`**: 여러 수신 제어 흐름을 병합합니다(예: `if/else`의 끝, 루프 헤드).
- **`If`**: 제어 입력과 부울 값 입력을 받습니다. `IfTrue` 및 `IfFalse` 제어 프로젝션을 내보냅니다.
- **`Loop`**: 들어오는 순방향 제어 및 백에지 제어가 포함된 루프 헤더 영역입니다.
- **`Return`**: 제어 토큰, 메모리 토큰 및 결과 값을 가져오는 함수 종료입니다.

### 3.2 메모리 SSA 노드

- **`MemoryPhi`**: `Region`에서 다양한 제어 흐름에 걸쳐 메모리 토큰을 병합합니다.
- **`Load`**: `(base, offset)`에서 메모리를 읽습니다. 제어, 메모리 토큰, 주소 값을 가져옵니다. 메모리 토큰과 로드된 값을 내보냅니다.
- **`Store`**: `(base, offset)`에 메모리를 씁니다. 제어권, 메모리 토큰, 주소 값, 저장된 값을 가져옵니다. 업데이트된 메모리 토큰을 내보냅니다.
- **`HeapAlloc`**: 선형 또는 지역 메모리에 소유된 구조를 할당합니다. 제어 및 메모리 토큰을 사용합니다. 메모리 토큰과 포인터 값을 내보냅니다.
- **`Fence` / `Barrier`**: 멀티 스레드 또는 호스트 공유 메모리에 대한 순서 제약 조건을 설정합니다.

### 3.3 순수 가치 노드

- **`Constant`**: 리터럴 숫자, 부울 및 문자열 참조.
- **`Add`, `Sub`, `Mul`, `Div`, `Mod`**: 고정 너비 및 부동 소수점 연산.
- **`Shl`, `Shr`, `And`, `Or`, `Xor`**: 비트 단위 조작.
- **`VectorLoad`, `VectorAdd`, `VectorFMA`**: SIMD 128비트 벡터 명령어(`v128`).

---

## 4. 최적화 파이프라인

```
  Lowered IR
      │
      ▼
┌───────────────────────────────┐
│ Global Value Numbering (GVN)  │ ── Fold duplicate arithmetic and address calculations
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Sparse Conditional Constant   │ ── Constant folding across conditional branches
│ Propagation (SCCP)            │
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Memory SSA Redundant Load     │ ── Store forwarding & elimination of repeated reads
│ Elimination (RLE)             │
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Loop Invariant Code Motion    │ ── Hoist loop-invariant calculations to loop pre-headers
│ (LICM)                        │
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Bounds Proof Elimination      │ ── Prove array/vector indices statically safe; remove checks
└───────────────────────────────┘
      │
      ▼
┌───────────────────────────────┐
│ Dead Node & Region Pruning    │ ── Eliminate unreachable branches and unused pure nodes
└───────────────────────────────┘
      │
      ▼
  Optimized SonIR ──> Wasm Code Generator
```

### 4.1 최적화 통과 매트릭스

| 최적화 패스 | SonIR 1.0 기준 | SonIR 2.0 타겟(문제 #45) | 주요 혜택 |
| :------------------------------------ | :---------------------- | :---------------------------- | :-------------------------------- |
| **일정한 복사 전파** | 구현 | 격자 값으로 강화됨 | 데이터 흐름 표현식 단순화 |
| **GVN(글로벌 가치 번호 매기기)** | 구조적 합동 | 지배자-나무 합동 | 중복 계산 제거 |
| **CFG 및 지역 단순화** | 지역 병합 | 다중 지역 구조 조정 | 무조건적인 점프를 제거합니다 |
| **메모리 SSA RLE** | 구현되지 않음 | 전체 매장에서 로드까지 포워딩 | 선형 메모리 액세스 감소 |
| **LICM(루프 불변 코드 모션)** | 구현되지 않음 | 프리헤더 호이스팅 | 루프 반복 작업 감소 |
| **경계 증명 분석** | 간격 점검 | 다면체 값 범위 증명 | 런타임 경계 트랩 제거 |
| **죽은 Node 가지치기** | 도달 가능성 표시/스윕 | 역후주문 활성도 | 최종 바이너리 공간 축소 |

---

## 5. 웹어셈블리 감소 및 하드웨어 가속

1. **SIMD(`v128`) 벡터화(문제 #44, Wave 3):** 슬라이스 작업, 스캐너 비트 확인 및 병렬 비교를 위한 하드웨어 벡터 명령을 내보냅니다.
2. **대량 메모리 작업(문제 #44, Wave 3):** 복사 및 채우기 루프를 하드웨어에 최적화된 `memory.copy` 및 `memory.fill`로 낮춥니다.
3. **테일 호출(`tail-call`):** 재귀 함수, 파서 및 상태 기계 루프에 `return_call`를 사용하여 $O(1)$ 스택 공간을 보장합니다.
4. **다중 메모리 분할(문제 #49, 웨이브 4):** 호스트 상호 운용성 전송 버퍼에서 개인 게스트 힙 실행을 격리하여 내부 데이터 구조의 메모리 손상이 전혀 발생하지 않도록 보장합니다.

---

## 6. 관련 사양 및 아키텍처 문서

- [플린트 언어 사양](flint-language-specification.md)
- [아키텍처 개요](architecture.md)
- [모범 사례](best-practices.md)
