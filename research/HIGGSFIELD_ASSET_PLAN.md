# Higgsfield × SAIL — 비주얼 개발 전략 (테마·컨셉 정합)

**작성 2026-06-04.** Higgsfield(AI 이미지·영상 MCP)를 SAIL에 어떻게 쓸지의 고민. 도구는 새 세션에서 로드되므로 여기서 *무엇을·왜·어떻게*를 확정하고, 다음 세션에서 생성·배선.

## 0. 제1원칙 — 절제가 컨셉이다
SAIL은 방금 **Calm & cozy**로 재단장했고(크림 #f6f4ee + teal #3f9d8e + Nunito + 둥근), 대상은 대학원·대학생, 정체성은 *연구급이지만 따뜻한 SRL 멘토*. 그러므로:
- **팬시 ≠ 화려/네온/시네마틱.** Higgsfield는 영화급도 뽑지만, SAIL엔 *부드럽고 음소거된 일러스트레이션*이 맞다. 과하면 cozy를 깨고 다시 "장난감 앱"처럼 보인다(사용자가 이전에 거부한 방향).
- **일관성이 진짜 난제.** AI 생성은 스타일이 표류한다. 한 스타일 스펙 + 레퍼런스 이미지로 *한 가족*처럼 묶는 게 핵심.
- **에셋은 런타임 기능이 아니라 정적 파이프라인.** 한 번 생성→큐레이션→최적화(webp)→번들. 런타임 비용 0, 오프라인/PWA·온디바이스 철학과 충돌 없음. Higgsfield 크레딧은 *유한한 에셋 세트*에만 소비.

## 1. 스타일 스펙 (모든 생성에 고정 주입)
- **팔레트:** warm cream #f6f4ee 배경, sage-teal #3f9d8e 주색, 따뜻한 ink #2f2b27, 보조 warm clay #e08a5e(아주 가끔).
- **트리트먼트:** 플랫~소프트 셰이딩 일러스트, 부드러운 라인, 종이 질감 약간, 그레인 약간; 사진·3D·네온 금지; 텍스트 없는 이미지.
- **모티프 어휘(항해 메타포):** 나침반·해도(map)·잔잔한 파도·등대·작은 돛단배·항해일지(logbook)·별. SRL 3단계 = chart(해도 그리기)→sail(돛 올리고 나아가기)→log(일지 적기).
- **톤:** 고요함, 안온함, "혼자가 아니라 안내받는" 느낌. 인물은 표정 부드럽게, 위협·경쟁·성적 암시 금지(수행목표화 회피).

## 2. 우선순위 에셋 (P0→P2)

### P0 — 컨셉 정체성 (가장 큰 효과)
1. **Marin 비주얼 정체성** — 대화형 Marin이 이제 앱의 중심(5모드). 얼굴/마크가 따뜻함을 만든다. *결정 필요(아래 §5):*
   - (A) **추상 마크** = 나침반-로즈 + 미소 곡선의 미니멀 심볼(teal). 안전·확장 쉬움·나이 안 듦·언캐니 없음. **추천.**
   - (B) **캐릭터** = 부드러운 등대지기/항해사 동반자 일러스트. 더 친근하나 일관성·언캐니 리스크.
   - 배선: MarinChat 헤더, ✦ FAB, 온보딩. 포맷 svg/webp, 작게.
   - 예시 프롬프트(A): *"minimal flat logo mark, a compass rose whose lower curve forms a gentle smile, single sage-teal color #3f9d8e on cream, soft rounded geometry, calm, no text, vector-like, generous negative space"*
2. **Landing 히어로 비주얼** — cozy 항해 분위기로 첫인상 프리미엄화.
   - 예시: *"serene minimalist illustration, a small sailboat on calm pastel waves at dawn, soft cream and sage-teal palette, subtle paper grain, lots of empty sky for headline, flat soft-shaded, tranquil, no text"*
   - 배선: Landing 상단 배경(헤드라인 가독 위해 상단 여백 큰 구도) + 가벼운 커서 패럴랙스(손코딩).

### P1 — 따뜻함·온보딩
3. **빈 화면 일러스트 3종** — empty Home / no-courses / no-sessions. 임상적 공백 제거.
   - 예: *"cozy spot illustration, an open blank sea-chart with a compass and a steaming mug, sage-teal & cream, soft, inviting, no text"* (no-courses) 등.
4. **SRL 루프 일러스트 3종** — chart/sail/log(현재 숫자 원 대체). 메타포를 그림으로.
   - chart: 해도에 항로 긋기 / sail: 돛 올린 작은 배 / log: 깃펜과 항해일지.
5. **온보딩 인사(선택, 영상)** — Veo/Soul로 5–8초 Marin 인사 루프. **단 모바일 부담** → 온보딩 1곳만, poster 이미지 폴백 + `prefers-reduced-motion` 존중. 과하면 생략.

### P2 — 게이미피케이션·디테일
6. **배지 아트 5종** — 로깅 배지를 항해 유물로 통일(컨셉 강화 + mastery 프레임):
   - Self-monitor=나침반, Course charted=펼친 해도, Adapter=방향키(helm), Reflector=항해일지, Consistent=등대.
   - 예: *"set of soft flat badge icons, nautical: compass / sea-chart / ship's helm / logbook / lighthouse, unified sage-teal on cream, rounded, gentle, cohesive icon family, no text"* (한 번에 세트로 = 일관성↑).
7. **미세 텍스처/축하** — 종이·바다 질감 배경, 서브골 완료 시 잔잔한 스티커(과한 confetti 대신 cozy).

## 3. 일관성 전략 (핵심)
- **레퍼런스 락:** 첫 1장을 "스타일 보드"로 확정 후, Higgsfield의 reference-image/character-consistency 기능으로 나머지를 그 레퍼런스에 묶어 생성. 배지·빈화면·루프는 *세트로 한 번에* 요청(개별 생성은 표류).
- **시드·프롬프트 기록:** 각 에셋의 모델·프롬프트·시드를 이 문서에 적어 재현/리제너 가능하게.
- **하드 큐레이션:** 팔레트 안 맞으면 채택 금지·재생성. teal/cream 이탈, 텍스트 삽입, 사진풍은 폐기.

## 4. 파이프라인·제약
- **흐름:** Higgsfield 생성 → 큐레이션 → 다운스케일·webp(투명 PNG는 배지/마크) → `app/public/art/` 또는 `app/src/assets/` → 컴포넌트 배선 → build → Pages 배포 → 라이브 스크린샷.
- **성능:** 이미지 webp+lazy; 영상은 온보딩 한정 + poster + 자동재생 muted + reduced-motion off. 번들 비대화 주의(히어로 1–200KB 목표).
- **접근성:** alt 텍스트, 충분한 대비(텍스트는 이미지 위 오버레이/여백), reduced-motion 시 정적.
- **연구 진지성:** 비주얼이 데이터·코칭을 압도하지 않게; instructor 모드는 깔끔 유지.
- **비용·권한:** 크레딧은 유한 에셋에만. **Higgsfield 출력물 상업/연구 사용 권한·라이선스 확인 필요**(배포 전).
- **로컬 대안:** 급하면 JACOB SDXL([[reference_blackwell_sdxl_slow]])도 가능하나 Higgsfield가 빠르고 모델 다양 → 1차는 Higgsfield.

## ★ 결정 잠금 (2026-06-04, 사용자)
1. **Marin = 추상 마크(A)** — 나침반-로즈 미니멀 심볼. (캐릭터 B 배제)
2. **영상 없음** — 이미지 에셋만 (온보딩 영상 보류).
3. **범위 = P0 + P1 한 번에** (Marin 마크 + 히어로 + 빈화면 3 + 루프 3).
→ 다음 세션(higgsfield 도구 로드)에서 §1 스타일 스펙으로 일괄 생성. **MCP 없이 선작업 완료(이번 세션):** 손코딩 인라인-SVG Marin 마크(FAB·채팅헤더 배선) + Landing 커서 스포트라이트·패럴랙스 + 에셋 슬롯. Higgsfield판은 이 슬롯에 스왑.

## 5. 지금 정할 결정 (다음 세션 생성 전)
1. **Marin 정체성: 추상 마크(A, 추천) vs 캐릭터(B)?** — 모든 캐릭터 작업의 앵커.
2. **온보딩 영상(P1-5) 포함? vs 이미지만** — 부담 대비 가치.
3. **범위: P0만 먼저(히어로+Marin 마크) vs P0+P1 한 번에?**

## 6. 다음 세션 실행 순서
새 세션(higgsfield 도구 로드 확인) → §5 결정 반영 → 스타일보드 1장 → 레퍼런스 락 → P0 생성·큐레이션·최적화·배선 → 빌드·배포·스크린샷 → 일관되면 P1/P2.
