import { _decorator, Component, log, Prefab } from "cc";
import {assets_manager} from "db://assets/plugins/game-foundation/assets_manager";
const { ccclass } = _decorator;

@ccclass("AssetsTest")
export class AssetsTest extends Component {
    async start() {
        log("🔹 Bắt đầu load prefab...");
        const prefab = await assets_manager.instance.loadPrefab("prefabs/Bullet");
        log("✅ Prefab loaded:", prefab.name);

        // Test cache
        const cached = assets_manager.instance.getCachedAsset("prefabs/Bullet", Prefab);
        log("Cache tồn tại:", !!cached);

        // Test release
        assets_manager.instance.releaseAsset("prefabs/Bullet", Prefab);
        log("📦 Đã release Bullet prefab");
    }
}
