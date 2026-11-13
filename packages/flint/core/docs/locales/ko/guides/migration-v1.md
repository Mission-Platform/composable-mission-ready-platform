# Migrate to the safe-by-default FWS pipeline

정식 영어 원문을 기계 지원으로 번역한 문서입니다. 필요 시 사람이 검수하세요. 패키지 이름, 명령, 경로, 기술 식별자는 그대로 둡니다.

> packages/flint/core/docs/guides/migration-v1.md: [packages/flint/core/docs/guides/migration-v1.md](../../../guides/migration-v1.md)
> 언어: 한국어 (ko)

이 가이드는 불변 로컬, 명시적 차용,
확인된 경계 정책 메타데이터는 v1 계약의 일부가 되었습니다.

## 돌연변이를 명시적으로 설정

할당된 로컬 및 매개변수에 `mut`을 추가합니다. 불변성을 위해 `&`을 추가하세요.
변경 가능한 빌림을 위한 빌림 및 `&mut`; 가변 빌림은 겹칠 수 없습니다.

```flint
fn increment(mut value: i32) -> i32 {
  value = value + 1;
  value
}

fn inspect(values: &Vector<i32>) -> i32 { values[0] }
fn update(values: &mut Vector<i32>) -> unit { values[0] = 1; }
```

추론된 소유권에 의존하지 마십시오. POD 값은 기본적으로 값으로 전달됩니다.
POD가 아닌 값은 불변 참조를 사용합니다. `owned`, `borrowed` 및 `shared` 유지
특정 수명 또는 릴리스 책임이 있는 ABI 경계
필수. 임시 영역은 반환되거나 더 오래 지속되는 영역에 저장될 수 없습니다.
명시적인 소유권/승격 경계가 없는 가치.

## 경계 정책 선택 및 감사

런타임 범위 확인은 기본값으로 유지됩니다.

```bash
flint compile src/main.flint --bounds-checks runtime --format json
```

사용 `proven-safe` 분석을 통해 컬렉션 길이의 모든 액세스가 입증된 경우에만
및 지수 범위 사실. `excluded-by-profile` 명시적이고 감사 가능한 릴리스입니다.
알 수 없는 인덱스에 대한 지름길이 아닌 선택:

```bash
flint check src/main.flint --bounds-checks proven-safe --optimizer-report
```

배송하기 전에 분석 결과와 매니페스트 정책을 검토하세요. 알 수 없거나
신뢰할 수 없는 인덱스는 `runtime`을 사용해야 합니다. 엄격한 분석으로 안전하지 않은 정책 거부
요청.

## 생성된 캐시 메타데이터 검사

컴파일러 캐시에는 다음이 포함될 수 있습니다. `<key>.sonir.json`, 결정론적 요약
최적화된 Sea-of-Nodes 그래프. 게스트 코드를 실행하지 않고 검사하세요.

```bash
flint inspect-sonir .cache/main.sonir.json --format json
```

## 엄격한 정적 유형 지정 및 동적 유형 부재

Flint는 결정론적 메모리 레이아웃을 갖추고 런타임 반영 오버헤드가 없는 정적으로 유형이 지정된 언어입니다. 언어는 `any` 또는 `unknown`과 같은 동적 최상위 유형을 지원하지 않습니다.

`any` 또는 `unknown`을 사용하여 유형에 주석을 추가하려고 하면 컴파일 타임 진단 `FLINT-TYPE-020`가 생성됩니다. 동적 환경에서 코드를 마이그레이션하려면 다음 안내를 따르세요.

- 동적 값을 구체적인 기본 요소(`i32`, `u32`, `f64`, `bool`, `string`, `bytes`)로 바꿉니다.
- 재사용 가능한 컨테이너 알고리즘을 위해 매개변수 다형성/제네릭(`Vector<T>`, `Option<T>`, `Result<T, E>`)을 사용합니다.
- 다형성 도메인 표현을 위해 태그된 대수 데이터 유형(`enum`)을 사용합니다.
- C ABI 포인터 및 불투명 호스트 핸들의 경우 형식이 지정되지 않은 포인터 대신 `opaque foreign type Handle;`를 선언하세요.
- 웹 IDL 브릿지 및 바인딩에서 `FlintBindingOptions.customTypeMappings`을 통해 명시적인 유형 매핑을 제공합니다.

## 메모리 및 해제 동작

범위가 지정된 값은 확인된 영역을 사용합니다. 특정 지역보다 오래 지속되는 값은 명시적 사용
ARC/공유 핸들; 모든 보유 핸들에는 하나의 일치하는 릴리스가 있고 주기가 있습니다.
암묵적으로 받아들여지지는 않습니다. 원시 `fws_alloc`, `fws_realloc` 및 `fws_dealloc`
호출자가 소유한 확인된 ABI 경계를 유지합니다. 비동기 및 반복자 정지는
이스케이프 경계이므로 일시 중단 후 사용된 값은 명시적으로 유지되어야 합니다.
