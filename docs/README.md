# PTT Commerce Intelligence OS — Bộ tài liệu Master v5

Tài liệu được viết lại từ SRS Master v4.0 và Kiến trúc hệ thống v2.0, bổ sung phân tích nghiệp vụ chi tiết.

| # | File | Phiên bản | Nội dung |
|---|---|---|---|
| 1 | [01_Phan_tich_Nghiep_vu_PTT_Commerce_Intelligence_OS_v5.md](./01_Phan_tich_Nghiep_vu_PTT_Commerce_Intelligence_OS_v5.md) | BA 5.0 | Value chain, persona, journey, quy trình BP, use case, domain model, epic, KPI, rủi ro |
| 2 | [02_SRS_Master_PTT_Commerce_Intelligence_OS_v5.md](./02_SRS_Master_PTT_Commerce_Intelligence_OS_v5.md) | SRS 5.1 Deep | Bám khung SRS v4 + chuyên sâu FR/AC + chiến lược thắng Haravan |
| 3 | [03_Kien_truc_He_thong_va_Cong_nghe_PTT_Commerce_Intelligence_OS_v3.md](./03_Kien_truc_He_thong_va_Cong_nghe_PTT_Commerce_Intelligence_OS_v3.md) | Arch 3.0 | Target architecture, stack, data, event/Temporal, Website/AI, DevSecOps, ADR |
| 4 | [04_Ke_hoach_Trien_khai_WebCom_v1.md](./04_Ke_hoach_Trien_khai_WebCom_v1.md) | Plan 1.0 | Kế hoạch triển khai WebCom: phase W0–W5, mockup→FR, test, rủi ro, milestone · nhánh B (§9h–9n) · nhánh C (§9o) |
| 5 | [05_Huong_dan_Su_dung_WebCom_v1.md](./05_Huong_dan_Su_dung_WebCom_v1.md) | User Guide 1.0 | **Hướng dẫn sử dụng toàn hệ thống**: sơ đồ link, mô tả từng URL, setup môi trường, tính năng từng màn |

OpenAPI / Bruno theo phase: `openapi-w1.yaml` … `openapi-w5.yaml` · `openapi-a1.yaml` … `openapi-a6.yaml` · `openapi-b1.yaml` … `openapi-b6.yaml` · `openapi-c1.yaml` … `openapi-c6.yaml` · Bruno `WebCom-B1` … `WebCom-B6` · `WebCom-C1` … `WebCom-C6`.
Runbooks: `docs/runbooks/` (gồm `nba-service-recovery.md`, `platform-apex-demo.md`, `self-serve-trial.md`, `theme-license-billing.md`).
Platform apex (Haravan-like): kế hoạch §9p · P2/P3 · **CMS engine** (§9q · [spec](specs/shared-cms-themepackage.md) · [plan](specs/shared-cms-implementation-plan.md) · [runbook](runbooks/shared-cms.md) · OpenAPI `openapi-cms-0.yaml`). **Merchant CMS Pro v2.1** (đa ngành/đa thể loại + **website bán hàng chuyên sâu**): [SRS](specs/merchant-cms-pro-srs.md) · [kế hoạch sản phẩm](specs/merchant-cms-pro-implementation-plan.md) · [**kế hoạch DEV**](specs/merchant-cms-pro-dev-plan.md) · [runbook](runbooks/merchant-cms-pro.md). **Corporate Platform CMS** (§9r · [spec](specs/webcom-corporate-cms.md) · [plan](specs/webcom-corporate-cms-implementation-plan.md) · ADR-008 · OpenAPI `openapi-platform-cms-0.yaml` · Bruno `bruno/WebCom-Platform-CMS-0.bru`).

## Thứ tự đọc khuyến nghị

```text
BA v5 → SRS v5 → Architecture v3 → Kế hoạch triển khai WebCom
         ↘ Hướng dẫn sử dụng WebCom (ops / sales / PO)
```

## Nguồn kế thừa

- `SRS_Master_PTT_Commerce_Intelligence_OS_Website_Commerce_v4.md`
- `Kien_truc_He_thong_va_Cong_nghe_PTT_Commerce_Intelligence_OS_v4.md` (nội dung Architecture v2.0)
