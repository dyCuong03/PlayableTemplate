import {_decorator, Component, Prefab} from "cc";
import {object_pool_manager} from "db://assets/plugins/game-foundation/object_pool";

const {ccclass, property} = _decorator;

@ccclass("GameInit")
export class GameInit extends Component {

    @property(Prefab)
    enemyPrefab: Prefab = null!;

    start() {
        object_pool_manager.instance.Spawn(this.enemyPrefab);
    }
}
