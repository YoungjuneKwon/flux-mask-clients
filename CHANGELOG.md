# 변경 이력

## 1.0.2 — 2026-10-13

게시 경로만 바뀌었다. 패키지 코드는 1.0.1 과 같다.

- 긴 수명 npm 토큰 대신 **trusted publishing(OIDC)** 으로 게시한다.
  npmjs.com 의 패키지 설정에 `YoungjuneKwon/flux-mask-clients` 의 `publish.yml`
  을 신뢰 발행자로 등록했고, 워크플로에서 `NPM_TOKEN` 을 걷어냈다.
  CI 러너 Node 를 22 로 올렸다 — OIDC 는 npm 11.5.1+ 를 요구한다.

## 1.0.1 — 2026-10-13

1.0.0 은 현재 서버와 **초기화 단계에서 깨진다.** 쓰고 있다면 올려야 한다.

- `core`: 공개키 응답을 raw text 로 읽는다. 1.0.0 은 `{"publicKey":"…"}` JSON 을
  기대해 `key.key must be of type string … Received undefined` 로 죽었다.
- `axios-interceptor`: 본문이 없는 요청(GET·DELETE)에도 암호화 헤더를 붙인다.
  서버는 이 헤더로 응답 암호화 여부를 정하므로, 예전에는 **조회 응답이 평문으로
  나갔다.** 개발자도구로 가장 많이 들여다보는 것이 조회 응답이다.
- `fetch-wrapper`: 암호문을 `{"encrypted":"…"}` 봉투에 담던 것을 날것 +
  `text/plain` 으로 바꿔 서버·axios 인터셉터와 규격을 맞췄다. 봉투를 쓰면
  서버가 그 JSON 전체를 복호화하려다 실패한다.

서버는 `winm2m/fluxmask-nginx` 1.1.0 이상과 함께 쓴다.
