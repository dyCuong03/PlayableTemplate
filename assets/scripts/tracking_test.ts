/**
 * TrackingTest — kịch bản test thủ công cho 4 event mới.
 *
 * CÁCH DÙNG:
 *   1. Kéo script này vào bất kỳ node nào trong scene (ví dụ: Canvas).
 *   2. Chạy Preview (Ctrl+P) hoặc build HTML5.
 *   3. Mở DevTools Console → xem log "[TrackingTest]".
 *   4. Dùng phím số 1–5 để trigger từng kịch bản, hoặc để
 *      autoRun = true để chạy tuần tự tự động khi start.
 *
 * PHÍM TẮT (browser focus):
 *   1  →  Kịch bản 1: Happy path đầy đủ
 *   2  →  Kịch bản 2: Double-fire guard (start/end chỉ gửi 1 lần)
 *   3  →  Kịch bản 3: interact_count chính xác
 *   4  →  Kịch bản 4: Reset session rồi bắt đầu session mới
 *   5  →  Kịch bản 5: Raw touch giả lập (recordRawInteract thủ công)
 *   R  →  Reset session (có thể dùng trước khi chạy kịch bản khác)
 */

import { _decorator, Component, input, Input, KeyCode, EventKeyboard } from "cc";
import { tracking_service } from "db://assets/plugins/playable-foundation/tracking/tracking_service";

const { ccclass, property } = _decorator;

@ccclass("tracking_test")
export class tracking_test extends Component {

    @property({ tooltip: "Tự động chạy tất cả kịch bản theo thứ tự khi onLoad" })
    autoRun: boolean = false;

    @property({ tooltip: "Khoảng cách (ms) giữa các bước trong auto-run" })
    autoRunStepMs: number = 800;

    /* ─── Lifecycle ─────────────────────────────────────── */

    onLoad() {
        this.log("Component loaded. Phím 1-5 để chạy kịch bản, R để reset session.");
        this.bindKeyboard();

        if (this.autoRun) {
            this.scheduleOnce(() => this.runAllScenarios(), 0.5);
        }
    }

    onDestroy() {
        input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    /* ─── Keyboard ──────────────────────────────────────── */

    private bindKeyboard() {
        input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    }

    private onKeyDown(e: EventKeyboard) {
        switch (e.keyCode) {
            case KeyCode.DIGIT_1: this.scenario1_happyPath();        break;
            case KeyCode.DIGIT_2: this.scenario2_doubleFireGuard();  break;
            case KeyCode.DIGIT_3: this.scenario3_interactCount();    break;
            case KeyCode.DIGIT_4: this.scenario4_sessionReset();     break;
            case KeyCode.DIGIT_5: this.scenario5_rawTouch();         break;
            case KeyCode.KEY_R:   this.resetSession();               break;
        }
    }

    /* ─── Kịch bản ──────────────────────────────────────── */

    /**
     * Kịch bản 1 — Happy path
     * Luồng bình thường: start → interaction × 3 → store_trigger → end
     * Kỳ vọng: 5 GET request, interact_count = 4
     */
    scenario1_happyPath() {
        this.header("Kịch bản 1: Happy path");
        this.resetSession();

        this.step("start()", () => tracking_service.start());
        this.step("trackInteraction('tap_card')", () => tracking_service.trackInteraction("tap_card"));
        this.step("trackInteraction('swipe_left')", () => tracking_service.trackInteraction("swipe_left"));
        this.step("trackInteraction('tap_hint')", () => tracking_service.trackInteraction("tap_hint"));
        this.step("trackStoreTrigger('cta_store')", () => tracking_service.trackStoreTrigger("cta_store"));
        this.step("end()  →  interact_count kỳ vọng = 4", () => tracking_service.end());
    }

    /**
     * Kịch bản 2 — Double-fire guard
     * Gọi start() và end() nhiều lần → server CHỈ nhận được 1 start và 1 end.
     * Kỳ vọng: 2 GET request (1 start, 1 end), các lần sau bị chặn.
     */
    scenario2_doubleFireGuard() {
        this.header("Kịch bản 2: Double-fire guard");
        this.resetSession();

        this.step("start() lần 1  →  gửi", () => tracking_service.start());
        this.step("start() lần 2  →  bị chặn (_startFired=true)", () => tracking_service.start());
        this.step("start() lần 3  →  bị chặn", () => tracking_service.start());
        this.step("end()   lần 1  →  gửi", () => tracking_service.end());
        this.step("end()   lần 2  →  bị chặn (_endFired=true)", () => tracking_service.end());
    }

    /**
     * Kịch bản 3 — interact_count chính xác
     * 2 trackInteraction + 1 trackStoreTrigger + 3 recordRawInteract thủ công
     * Kỳ vọng interact_count trong end = 6
     */
    scenario3_interactCount() {
        this.header("Kịch bản 3: interact_count chính xác");
        this.resetSession();

        this.step("start()", () => tracking_service.start());
        this.step("trackInteraction('a')  → count=1", () => tracking_service.trackInteraction("a"));
        this.step("trackInteraction('b')  → count=2", () => tracking_service.trackInteraction("b"));
        this.step("trackStoreTrigger('cta') → count=3", () => tracking_service.trackStoreTrigger("cta"));
        this.step("recordRawInteract()    → count=4", () => tracking_service.recordRawInteract());
        this.step("recordRawInteract()    → count=5", () => tracking_service.recordRawInteract());
        this.step("recordRawInteract()    → count=6", () => tracking_service.recordRawInteract());
        this.step("end()  →  interact_count kỳ vọng = 6", () => tracking_service.end());
    }

    /**
     * Kịch bản 4 — Session reset
     * Chạy session 1 → reset → chạy session 2.
     * Kỳ vọng: 2 session_id khác nhau, mỗi session gửi start + end riêng.
     */
    scenario4_sessionReset() {
        this.header("Kịch bản 4: Session reset");

        this.step("=== SESSION 1 ===", () => {});
        this.step("resetSession()", () => this.resetSession());
        this.step("start()  [session A]", () => tracking_service.start());
        this.step("trackInteraction('s1_action')", () => tracking_service.trackInteraction("s1_action"));
        this.step("end()    [session A]", () => tracking_service.end());

        this.step("=== SESSION 2 (sau reset) ===", () => {});
        this.step("resetSession()  →  _startFired/_endFired/_rawInteractCount về 0, UUID mới",
            () => this.resetSession());
        this.step("start()  [session B — uuid khác]", () => tracking_service.start());
        this.step("trackInteraction('s2_action')", () => tracking_service.trackInteraction("s2_action"));
        this.step("end()    [session B]", () => tracking_service.end());
    }

    /**
     * Kịch bản 5 — Raw touch giả lập
     * Giả lập nhiều touch event bằng recordRawInteract() rồi kiểm tra end.
     * Kỳ vọng: interact_count = số lần recordRawInteract() được gọi (kể cả từ interaction/store_trigger).
     */
    scenario5_rawTouch() {
        this.header("Kịch bản 5: Raw touch giả lập");
        this.resetSession();

        this.step("start()", () => tracking_service.start());

        // Giả lập 10 raw tap (như tracking_component.recordHit() gọi)
        for (let i = 1; i <= 10; i++) {
            const idx = i;
            this.step(`recordRawInteract()  tap #${idx}  → count=${idx}`,
                () => tracking_service.recordRawInteract());
        }

        this.step("end()  →  interact_count kỳ vọng = 10", () => tracking_service.end());
    }

    /* ─── Auto-run ──────────────────────────────────────── */

    private async runAllScenarios() {
        const delay = (ms: number) => new Promise<void>(r => this.scheduleOnce(r, ms / 1000));

        this.log("=== AUTO-RUN TẤT CẢ KỊCH BẢN ===");

        this.scenario1_happyPath();
        await delay(this.autoRunStepMs * 8);

        this.scenario2_doubleFireGuard();
        await delay(this.autoRunStepMs * 7);

        this.scenario3_interactCount();
        await delay(this.autoRunStepMs * 10);

        this.scenario4_sessionReset();
        await delay(this.autoRunStepMs * 12);

        this.scenario5_rawTouch();

        this.log("=== AUTO-RUN XONG ===");
    }

    /* ─── Helpers ───────────────────────────────────────── */

    private _stepQueue: Array<{ label: string; fn: () => void }> = [];
    private _stepRunning = false;

    /** Thêm bước vào queue, chạy tuần tự cách nhau 300ms để log rõ ràng */
    private step(label: string, fn: () => void) {
        this._stepQueue.push({ label, fn });
        if (!this._stepRunning) {
            this._drainSteps();
        }
    }

    private _drainSteps() {
        if (this._stepQueue.length === 0) {
            this._stepRunning = false;
            return;
        }
        this._stepRunning = true;
        const { label, fn } = this._stepQueue.shift()!;
        this.log(`  ▶ ${label}`);
        try { fn(); } catch (e) { this.log(`  ✗ LỖI: ${e}`); }
        this.scheduleOnce(() => this._drainSteps(), 0.3);
    }

    private resetSession() {
        tracking_service.startSession();
        this.log("  ↺ Session reset (UUID mới, counters về 0)");
    }

    private header(title: string) {
        this.log("");
        this.log(`┌─ ${title} ${"─".repeat(Math.max(0, 50 - title.length))}┐`);
    }

    private log(msg: string) {
        console.log(`[TrackingTest] ${msg}`);
    }
}
